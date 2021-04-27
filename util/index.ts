import { DMMF } from "@prisma/generator-helper";
import { Node } from "react-flow-renderer";
import { EnumNodeProps } from "~/components/EnumNode";
import { ModelNodeProps } from "~/components/ModelNode";

type ModelNodeData = ModelNodeProps["data"];
type EnumNodeData = EnumNodeProps["data"];

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
      ({ name, type, isList, isRequired, hasDefaultValue, default: def }) => ({
        name: name,
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

export const mapDatamodelToNodes = (
  data: DMMF.Datamodel
): Node<ModelNodeData | EnumNodeData>[] => [
  ...data.models.map(mapModelToNode),
  ...data.enums.map(mapEnumToNode),
];
