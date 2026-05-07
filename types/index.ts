export type ColumnType = "number" | "string" | "boolean" | "date" | "mixed";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  count: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: (string | number | boolean | null)[];
  // numeric-only stats
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  // string-only stats
  topValues?: { value: string; count: number }[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  fileName: string;
  fileSizeBytes: number;
}

export type DataRow = Record<string, string | number | boolean | null>;

export interface Dataset {
  name: string;
  rows: DataRow[];
  profile: DatasetProfile;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
  createdAt: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "running" | "done" | "error";
}

export type ChartType = "bar" | "line" | "scatter" | "pie" | "histogram";

export interface ChartSpec {
  id: string;
  title: string;
  type: ChartType;
  xKey: string;
  yKey?: string;
  data: { [k: string]: string | number }[];
  description?: string;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warn" | "important";
}
