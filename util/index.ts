import { DMMF } from "@prisma/generator-helper";
import { groupBy, map, pipe } from "rambda";
import { Edge, Elements, Node } from "react-flow-renderer";
import {
  EnumNodeData,
  ModelNodeData,
  RelationType,
  SchemaError,
} from "./types";

type FieldWithTable = DMMF.Field & { tableName: string };
type Relation = { type: RelationType; fields: readonly FieldWithTable[] };

const errRegex =
  /^(?:Error validating.*?:)?(.+?)\n  -->  schema\.prisma:(\d+)\n/;
const letters = ["A", "B"];

const generateEnumNode = ({
  name,
  dbName,
  values,
}: DMMF.DatamodelEnum): Node<EnumNodeData> => ({
  id: name,
  type: "enum",
  position: { x: 0, y: 0 },
  data: {
    name,
    dbName,
    values: values.map(({ name }) => name),
  },
});

// TODO: figure out a good way to random spread the nodes
const generateModelNode = (
  { name, dbName, fields }: DMMF.Model,
  relations: { readonly [key: string]: Relation }
): Node<ModelNodeData> => ({
  id: name,
  type: "model",
  position: { x: 250, y: 25 },
  data: {
    name,
    dbName,
    columns: fields.map(
      ({
        name,
        type,
        kind,
        isList,
        relationName,
        relationFromFields,
        relationToFields,
        isRequired,
        hasDefaultValue,
        default: def,
      }) => ({
        name,
        kind,
        isList,
        isRequired,
        relationName,
        relationFromFields,
        relationToFields,
        relationType: relations[relationName]?.type,
        // `isList` and `isRequired` are mutually exclusive as per the spec
        type: type + (isList ? "[]" : !isRequired ? "?" : ""),
        defaultValue: !hasDefaultValue
          ? null
          : typeof def === "object"
          ? // JSON.stringify gives us the quotes to show it's a string.
            // Not a perfect thing but it works ¯\_(ツ)_/¯
            `${def.name}(${def.args.map((x) => JSON.stringify(x)).join(", ")})`
          : def.toString(),
      })
    ),
  },
});

const generateEnumEdge = (col: FieldWithTable): Edge => ({
  id: `e${col.tableName}-${col.name}-${col.type}`,
  source: col.type,
  target: col.tableName,
  type: "smoothstep",
  sourceHandle: col.type,
  targetHandle: `${col.tableName}-${col.name}`,
});

const generateRelationEdge = ([relationName, { type, fields }]: [
  string,
  Relation
]): Edge[] => {
  const base = {
    id: `e${relationName}`,
    type: "relation",
    label: relationName,
    data: { relationType: type },
  };

  if (type === "m-n")
    return fields.map((col, i) => ({
      ...base,
      id: `e${relationName}-${col.tableName}-${col.type}`,
      source: col.tableName,
      target: `_${relationName}`,
      sourceHandle: `${col.tableName}-${col.relationName}-${col.name}`,
      targetHandle: `_${relationName}-${letters[i]}`,
    }));
  else if (type === "1-n") {
    const source = fields.find((x) => x.isList);

    return [
      {
        ...base,
        source: source.tableName,
        target: source.type,
        sourceHandle: `${source.tableName}-${relationName}-${source.name}`,
        targetHandle: `${source.type}-${relationName}`,
      },
    ];
  } else
    return [
      {
        ...base,
        source: fields[0].tableName,
        target: fields[0].type,
        sourceHandle: `${fields[0].tableName}-${relationName}-${fields[0].name}`,
        targetHandle: `${fields[0].type}-${relationName}`,
      },
    ];
};

// TODO: renaming relations sometimes makes the edge disappear. Might be a memo
// issue, need to look into it a bit better at some point.

export const mapDatamodelToNodes = (
  data: DMMF.Datamodel
): Elements<ModelNodeData | EnumNodeData> => {
  const filterFields = (kind: DMMF.FieldKind) =>
    data.models.flatMap(({ name: tableName, fields }) =>
      fields
        .filter((col) => col.kind === kind)
        .map((col) => ({ ...col, tableName }))
    );

  const relationFields = filterFields("object");
  const enumFields = filterFields("enum");

  const relations = pipe<
    FieldWithTable[],
    { readonly [key: string]: readonly FieldWithTable[] },
    Array<[string, readonly FieldWithTable[]]>,
    ReadonlyArray<[string, Relation]>,
    { readonly [key: string]: Relation }
  >(
    groupBy((col) => col.relationName),
    Object.entries,
    map(([key, [one, two]]) => {
      if (one.isList && two.isList)
        return [key, { type: "m-n", fields: [one, two] }];
      else if (one.isList || two.isList)
        return [key, { type: "1-n", fields: [one, two] }];
      else return [key, { type: "1-1", fields: [one, two] }];
    }),
    Object.fromEntries
  )(relationFields);

  const implicitManyToMany = Object.entries(relations)
    .filter(([_, { type }]) => type === "m-n")
    .map(
      ([relationName, { fields }]) =>
        ({
          name: `_${relationName}`,
          dbName: null,
          fields: fields.map((field, i) => ({
            name: letters[i],
            kind: "scalar",
            isList: false,
            isRequired: true,
            // CBA to fuck with some other shit in the ModelNode, so this is a
            // "hack" to get the corresponding letter on the handle ID. In the
            // future it'd probably be a better idea to make __ALL__ handles
            // take the shape of `table-columnName-relationName/foreignName`????
            relationName: letters[i],
            hasDefaultValue: false,
            // this is gonna break on composite ids i think lol
            type: data.models
              .find((m) => m.name === field.type)
              .fields.find((x) => x.isId).type,
          })),
        } as DMMF.Model)
    );

  return [
    ...data.enums.map(generateEnumNode),
    ...[...data.models, ...implicitManyToMany].map((model) =>
      generateModelNode(model, relations)
    ),
    ...enumFields.map(generateEnumEdge),
    ...Object.entries(relations).flatMap(generateRelationEdge),
  ];
};

export const parseDMMFError = (error: string): SchemaError[] =>
  error
    .split("error: ")
    .slice(1)
    .map((msg) => msg.match(errRegex).slice(1))
    .map(([reason, row]) => ({ reason, row }));
