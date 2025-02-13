import { ElkNode } from "elkjs";
import {
  concat,
  count,
  filter,
  groupBy,
  map,
  mergeWith,
  pick,
  reduce,
} from "rambda";
import { Edge, Node } from "reactflow";

import {
  DMMFToElementsResult,
  EnumNodeData,
  ModelNodeData,
  ModelRelationData,
  RelationEdgeData,
  RelationSide,
  RelationType,
} from "./types";

import type { DMMF } from "@prisma/generator-helper";

const letters = ["A", "B"];

/**
 * Entrypoint into creating a React Flow network from the Prisma datamodel.
 */
export const generateFlowFromDMMF = (
  datamodel: DMMF.Datamodel,
  previousNodes: Array<Node<EnumNodeData> | Node<ModelNodeData>>,
  layout: ElkNode | null,
): DMMFToElementsResult => {
  const modelRelations = getModelRelations(datamodel);
  const enumRelations = getEnumRelations(datamodel);
  const nodeData = generateNodes(datamodel, modelRelations);

  const nodes = positionNodes(nodeData, previousNodes, layout);
  const edges = relationsToEdges(modelRelations, enumRelations);

  return {
    nodes,
    edges,
  };
};

const relationType = (listCount: number): RelationType =>
  listCount > 1 ? "m-n" : listCount === 1 ? "1-n" : "1-1";

const relationSide = (field: DMMF.Field): RelationSide =>
  // `source` owns the relation in the schema
  field.relationFromFields?.length || field.relationToFields?.length
    ? "source"
    : "target";

// Functions for various IDs so that consistency is ensured across all parts of
// the app easily.
export const edgeId = (target: string, source: string, targetColumn: string) =>
  `edge-${target}-${targetColumn}-${source}`;

export const enumEdgeTargetHandleId = (table: string, column: string) =>
  `${table}-${column}`;

const implicitManyToManyModelNodeId = (relation: string) => `_${relation}`;

export const relationEdgeSourceHandleId = (
  table: string,
  relation: string,
  column: string,
) => `${table}-${relation}-${column}`;

export const relationEdgeTargetHandleId = (
  table: string,
  relation: string,
  column: string,
) => `${table}-${relation}-${column}`;

const virtualTableName = (relation: string, table: string) =>
  `${relation}-${table}`;

interface GotModelRelations {
  name: string;
  dbName?: string;
  type: RelationType;
  virtual?: {
    name: string;
    field: {
      name: string;
      type: string;
    };
  };
  fields: Array<{
    name: string;
    tableName: string;
    side: RelationSide;
    type: string;
  }>;
}

/**
 * Filter through a schema to find all the models that are part of a
 * relationship, as well as what side of the relationships they are on.
 */
const getModelRelations = ({
  models,
}: DMMF.Datamodel): Record<string, GotModelRelations> => {
  const groupedRelations: Record<
    string,
    Array<DMMF.Field & { tableName: string }>
  > = filter(
    (_: any, prop: string) => prop !== "undefined",
    // Match both ends of relation together, and collapse everything into the
    // same object. (relation names should be unique so this is safe).
    reduce(
      mergeWith(concat),
      {},
      models.map((m) =>
        // Create a object mapping `relationName: field[]`.
        groupBy(
          (f) => f.relationName!,
          m.fields
            // Don't bother processing any fields that aren't part of a relationship.
            .filter((f) => f.relationName)
            .map((f) => ({ ...f, tableName: m.name })),
        ),
      ),
    ),
  );

  const output = map((fields, key) => {
    const listCount = count((f) => f.isList, fields);
    const type = relationType(listCount);

    return {
      name: key,
      type,
      fields: fields.map((f) => ({
        name: f.name,
        tableName: f.tableName,
        side: relationSide(f),
        type: f.type,
      })),
    };
  }, groupedRelations);

  const withVirtuals = Object.values(output).reduce<
    Record<string, GotModelRelations>
  >((acc, curr) => {
    if (curr.type === "m-n")
      for (const [i, field] of curr.fields.entries()) {
        const newName = virtualTableName(curr.name, field.tableName);
        // There's probably a better way around this
        const virtualLetter = letters[i] || "";

        acc[newName] = {
          name: newName,
          dbName: curr.name,
          type: "1-n",
          virtual: {
            name: implicitManyToManyModelNodeId(curr.name),
            field: { name: virtualLetter, type: field.tableName },
          },
          // Reuse current field straight up because they're always `target`.
          fields: [
            field,
            {
              name: virtualLetter,
              tableName: implicitManyToManyModelNodeId(curr.name),
              side: "source",
              type: field.tableName,
            },
          ],
        };
      }
    else acc[curr.name] = curr;

    return acc;
  }, {});

  return withVirtuals;
};

/**
 * Filter through a schema to find all the models that refer to a defined Enum.
 */
const getEnumRelations = ({ models }: DMMF.Datamodel) =>
  models
    .map((m) => {
      const fields = m.fields.filter((f) => f.kind === "enum");
      const relations = fields.map((f) => ({
        enum: f.type,
        column: f.name,
      }));

      return {
        name: m.name,
        relations,
      };
    })
    .filter((m) => m.relations.length);

/**
 * Map found relationships into React Flow edges.
 */
const relationsToEdges = (
  modelRelations: ReturnType<typeof getModelRelations>,
  enumRelations: ReturnType<typeof getEnumRelations>,
): Array<Edge<RelationEdgeData | {}>> => {
  let result: Array<Edge<RelationEdgeData | {}>> = [];

  // Enum edges are dead shrimple
  for (const rel of enumRelations) {
    const edges = rel.relations.map(
      (r): Edge => ({
        id: edgeId(rel.name, r.enum, r.column),
        type: "smoothstep",
        source: r.enum,
        target: rel.name,
        sourceHandle: r.enum,
        targetHandle: enumEdgeTargetHandleId(rel.name, r.column),
      }),
    );

    result = result.concat(edges);
  }

  for (const rel of Object.values(modelRelations)) {
    const base = {
      id: `edge-${rel.name}`,
      type: "relation",
      label: rel.name,
      data: { relationType: rel.type },
    };

    const source = rel.fields.find((f) => f.side === "source")!;
    let target = rel.fields.find((f) => f.side === "target");

    if (!target && rel.virtual)
      target = rel.fields.find((f) => f.tableName === rel.virtual?.name);

    if (!target) throw new Error("Invalid target");

    result.push({
      ...base,
      source: source.tableName,
      target: target.tableName,
      sourceHandle: relationEdgeSourceHandleId(
        source.tableName,
        rel.name,
        source.name,
      ),
      targetHandle: relationEdgeTargetHandleId(
        target.tableName,
        rel.name,
        target.name,
      ),
    });
  }

  return result;
};

/**
 * Map a Prisma datamodel into React Flow node data.
 * Does not generate position data.
 */
const generateNodes = (
  { enums, models }: DMMF.Datamodel,
  relations: Record<string, GotModelRelations>,
) => {
  let nodes = [] as Array<EnumNodeData | ModelNodeData>;

  nodes = nodes.concat(generateModelNodes(models, relations));
  nodes = nodes.concat(generateImplicitModelNodes(relations));
  nodes = nodes.concat(generateEnumNodes(enums));

  return nodes;
};

const generateEnumNodes = (
  enums: readonly DMMF.DatamodelEnum[],
): EnumNodeData[] =>
  enums.map(({ name, dbName, documentation, values }) => ({
    type: "enum",
    name,
    dbName,
    documentation,
    values: values.map(({ name }) => name),
  }));

const generateModelNodes = (
  models: readonly DMMF.Model[],
  relations: Record<string, GotModelRelations>,
): ModelNodeData[] =>
  models.map(({ name, dbName, documentation, fields }) => {
    const columns: ModelNodeData["columns"] = fields.map((f) => {
      // `isList` and `isRequired` are mutually exclusive as per the spec
      const displayType = f.type + (f.isList ? "[]" : !f.isRequired ? "?" : "");
      let defaultValue: string | null = null;

      if (f.hasDefaultValue && f.default !== undefined)
        if (typeof f.default === "object" && "name" in f.default)
          // Column has a function style default
          defaultValue = `${f.default.name}(${f.default.args
            .map((arg) => JSON.stringify(arg))
            .join(",")})`;
        // Enums only have a scalar as default value
        else if (f.kind === "enum") defaultValue = f.default.toString();
        else defaultValue = JSON.stringify(f.default);

      const relData =
        relations[f.relationName!] ||
        relations[virtualTableName(f.relationName!, name)];
      const thisRel = relData?.fields.find(
        (g) => g.name === f.name && g.tableName === name,
      );

      const relationData: ModelRelationData | null = relData
        ? {
          name: relData.name,
          type: relData.type,
          // If we can't find the matching field, sucks to suck I guess.
          side: thisRel?.side || ("" as any),
        }
        : null;

      return {
        ...pick(
          ["name", "kind", "documentation", "isList", "isRequired", "type"],
          f,
        ),
        displayType,
        defaultValue,
        relationData,
      };
    });

    return {
      type: "model",
      name,
      dbName,
      documentation,
      columns,
    };
  });

/**
 * Generates intermediary tables to represent how implicit many-to-many
 * relationships work under the hood (mostly because I'm too lazy to distinguish
 * between implicit and explicit).
 */
const generateImplicitModelNodes = (
  relations: Record<string, GotModelRelations>,
): ModelNodeData[] => {
  const hasVirtuals = Object.values(relations).filter((rel) => rel.virtual);
  const grouped = Object.values(groupBy((rel) => rel.virtual!.name, hasVirtuals)).map((rel: GotModelRelations[] | undefined) => {
    const fields = rel!.map((r) => r.virtual!.field);
    return { relationName: rel![0]!.dbName!, fields };
  });

  return Object.entries(grouped).map(([name, { relationName, fields }]) => {
    const columns: ModelNodeData["columns"] = fields.map((col, i) => ({
      name: letters[i]!,
      kind: "scalar",
      isList: false,
      isRequired: true,
      defaultValue: null,
      type: col.type,
      displayType: col.type,
      relationData: {
        name: virtualTableName(relationName, col.type),
        side: "source",
        type: "1-n",
      },
    }));

    return {
      type: "model",
      name,
      dbName: null,
      columns,
    };
  });
};

/**
 * Takes in plain React Flow node data and positions them either based on an Elk
 * reflow, previous layout state, or with fresh positions.
 */
const positionNodes = (
  nodeData: Array<EnumNodeData | ModelNodeData>,
  previousNodes: Array<Node<EnumNodeData> | Node<ModelNodeData>>,
  layout: ElkNode | null,
): Array<Node<EnumNodeData> | Node<ModelNodeData>> =>
  nodeData.map((n) => {
    const positionedNode = layout?.children?.find(
      (layoutNode) => layoutNode.id === n.name,
    );
    const previousNode = previousNodes.find((prev) => prev.id === n.name);

    return {
      id: n.name,
      type: n.type,
      position: {
        x: positionedNode?.x ?? previousNode?.position.x ?? 0,
        y: positionedNode?.y ?? previousNode?.position.y ?? 0,
      },
      width: previousNode?.width ?? 0,
      height: previousNode?.height ?? 0,
      // Shhhhh
      // TODO: fix types to not need cast
      data: n as any,
    };
  });
