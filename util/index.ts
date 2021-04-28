import { DMMF } from "@prisma/generator-helper";
import { groupBy, pick } from "rambda";
import { Edge, Elements, Node } from "react-flow-renderer";
import { EnumNodeData, ModelNodeData } from "./types";

type FieldWithTable = DMMF.Field & { table: string };

const mapEnumToNode = ({
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
const mapModelToNode = ({
  name,
  dbName,
  fields,
}: DMMF.Model): Node<ModelNodeData> => ({
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
        // `isList` and `isRequired` are mutually exclusive as per the spec
        type: type + (isList ? "[]" : !isRequired ? "?" : ""),
        defaultValue: !hasDefaultValue
          ? null
          : typeof def === "object"
          ? // JSON.stringify gives us the quotes to show it's a string.
            `${def.name}(${def.args.map((x) => JSON.stringify(x)).join(", ")})`
          : def.toString(),
      })
    ),
  },
});

const generateEnumEdge = (col: FieldWithTable): Edge => ({
  id: `e${col.table}-${col.name}-${col.type}`,
  source: col.type,
  target: col.table,
  type: "smoothstep",
  sourceHandle: col.type,
  targetHandle: `${col.table}-${col.name}`,
});

const generateRelationEdge = (col: FieldWithTable): Edge => ({
  id: `e${col.table}-${col.name}-${col.type}`,
  source: col.type,
  target: col.table,
  type: "smoothstep",
  sourceHandle: `${col.type}-${col.relationName}`,
  targetHandle: `${col.table}-${col.relationName}`,
  label: col.relationName,
});

const gatherEdges = (models: DMMF.Model[]): Edge[] => {
  const columns = models
    .map(
      (model) =>
        (pick(["name", "fields"], model) as any) as Pick<
          DMMF.Model,
          "name" | "fields"
        >
    )
    // Add table name onto columns for future use.
    .map(({ name, fields }) => fields.map((col) => ({ ...col, table: name })))
    .flatMap((m) =>
      // Only enums and object relations can be connected.
      m.filter((col) => col.kind === "enum" || col.kind === "object")
    );

  // Split out enums & objects cause we handle them separately.
  const { enum: enums, object } = Object.assign(
    { object: [] as FieldWithTable[], enum: [] as FieldWithTable[] },
    groupBy((col) => col.kind, columns)
  );
  // Gather columns that are part of the same relation.
  const objects = groupBy((col) => col.relationName, object);

  return [
    ...enums.map(generateEnumEdge),
    ...Object.values(objects)
      .map((pairs) =>
        // Need only one side of each relation for an edge definition, pick the
        // one without the `@relation`.
        pairs.find((col) => (col.relationFromFields as string[]).length === 0)
      )
      .map(generateRelationEdge),
  ];
};

export const mapDatamodelToNodes = (
  data: DMMF.Datamodel
): Elements<ModelNodeData | EnumNodeData> => [
  ...data.models.map(mapModelToNode),
  ...data.enums.map(mapEnumToNode),
  ...gatherEdges(data.models),
];
