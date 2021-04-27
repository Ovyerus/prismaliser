import { DMMF } from "@prisma/generator-helper";
import { Edge, Elements, Node } from "react-flow-renderer";
import { EnumNodeData, ModelNodeData } from "./types";

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
        isRequired,
        hasDefaultValue,
        default: def,
      }) => ({
        name,
        kind,
        isList,
        isRequired,
        relationName,
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

const mapModeltoEdges = ({ name, fields }: DMMF.Model): Edge[] =>
  fields
    .filter(
      ({ kind, isList, isRequired }) =>
        kind === "enum" || (kind === "object" && !isList && !isRequired)
    )
    .map((col) => {
      const isEnum = col.kind === "enum";

      return {
        id: `e${name}-${col.name}-${col.type}`,
        source: col.type,
        target: name,
        type: "smoothstep",
        sourceHandle: isEnum ? col.type : `${col.type}-${col.relationName}`,
        targetHandle: `${name}-${col.relationName || col.name}`,
        label: isEnum ? undefined : col.relationName,
      };
    });

export const mapDatamodelToNodes = (
  data: DMMF.Datamodel
): Elements<ModelNodeData | EnumNodeData> => [
  ...data.models.map(mapModelToNode),
  ...data.enums.map(mapEnumToNode),
  ...data.models.flatMap(mapModeltoEdges),
];
