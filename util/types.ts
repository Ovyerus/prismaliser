export interface EnumNodeData {
  name: string;
  dbName?: string | null;
  values: string[];
}

export interface ModelNodeData {
  name: string;
  dbName?: string | null;
  columns: Array<{
    name: string;
    type: string;
    kind: string;
    isList: boolean;
    isRequired: boolean;
    relationName?: string | null;
    defaultValue?: string | null;
  }>;
}
