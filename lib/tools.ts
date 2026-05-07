import type { ChartSpec, DataRow, Dataset } from "@/types";
import { uid } from "./utils";

// ---- Tool schema exposed to the model (OpenAI-compatible tools format) ----
export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "compute_stats",
      description:
        "Compute a single aggregate statistic on a numeric column of the current dataset. Use this for mean, median, min, max, sum, stddev, count_distinct.",
      parameters: {
        type: "object",
        properties: {
          column: { type: "string", description: "Column name" },
          op: {
            type: "string",
            enum: ["mean", "median", "min", "max", "sum", "stddev", "count_distinct", "count", "null_count"],
          },
        },
        required: ["column", "op"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "group_aggregate",
      description:
        "Group rows by a categorical column and aggregate a numeric column. Returns up to 50 groups sorted by the aggregate descending.",
      parameters: {
        type: "object",
        properties: {
          group_by: { type: "string" },
          agg_column: { type: "string", description: "Column to aggregate. Use '*' for count." },
          op: { type: "string", enum: ["sum", "mean", "min", "max", "count"] },
          top_n: { type: "integer", default: 20 },
        },
        required: ["group_by", "agg_column", "op"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "value_counts",
      description: "Return counts per distinct value for a column. Best for categorical/string columns.",
      parameters: {
        type: "object",
        properties: {
          column: { type: "string" },
          top_n: { type: "integer", default: 10 },
        },
        required: ["column"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "filter_rows",
      description:
        "Filter rows by simple conditions (AND). Returns matching row count and first 5 sample rows.",
      parameters: {
        type: "object",
        properties: {
          conditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                op: { type: "string", enum: ["eq", "ne", "gt", "lt", "gte", "lte", "contains"] },
                value: {},
              },
              required: ["column", "op", "value"],
            },
          },
        },
        required: ["conditions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "correlation",
      description: "Compute Pearson correlation between two numeric columns.",
      parameters: {
        type: "object",
        properties: {
          column_a: { type: "string" },
          column_b: { type: "string" },
        },
        required: ["column_a", "column_b"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_chart",
      description:
        "Render a chart in the UI. Use 'bar' for categorical comparisons, 'line' for time series, 'scatter' for two numeric columns, 'pie' for composition of a small set of categories.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["bar", "line", "scatter", "pie"] },
          x: { type: "string", description: "Column for the x-axis / category" },
          y: { type: "string", description: "Column for the y-axis (numeric). Required for bar/line/scatter." },
          aggregation: {
            type: "string",
            enum: ["none", "sum", "mean", "count"],
            default: "none",
            description: "If set, aggregates y by x using the given operation.",
          },
          title: { type: "string" },
          description: { type: "string", description: "One-sentence takeaway for the reader" },
          top_n: { type: "integer", default: 20 },
        },
        required: ["type", "x", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_insight",
      description: "Record a concise finding in the Insights panel of the report.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          severity: { type: "string", enum: ["info", "warn", "important"], default: "info" },
        },
        required: ["title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sample_rows",
      description: "Return up to 10 rows of the dataset. Optionally filter first.",
      parameters: {
        type: "object",
        properties: {
          n: { type: "integer", default: 5 },
          conditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                op: { type: "string", enum: ["eq", "ne", "gt", "lt", "gte", "lte", "contains"] },
                value: {},
              },
              required: ["column", "op", "value"],
            },
            default: [],
          },
        },
      },
    },
  },
] as const;

// ---- Tool executor (runs on client with full dataset in memory) ----

type Cond = { column: string; op: string; value: unknown };

function applyCondition(row: DataRow, c: Cond): boolean {
  const v = row[c.column];
  if (v === null || v === undefined) return false;
  const val = c.value;
  switch (c.op) {
    case "eq":
      return String(v) === String(val);
    case "ne":
      return String(v) !== String(val);
    case "gt":
      return Number(v) > Number(val);
    case "lt":
      return Number(v) < Number(val);
    case "gte":
      return Number(v) >= Number(val);
    case "lte":
      return Number(v) <= Number(val);
    case "contains":
      return String(v).toLowerCase().includes(String(val).toLowerCase());
    default:
      return false;
  }
}

function filterRows(rows: DataRow[], conds: Cond[] = []): DataRow[] {
  if (!conds || conds.length === 0) return rows;
  return rows.filter((r) => conds.every((c) => applyCondition(r, c)));
}

function getNumericCol(rows: DataRow[], col: string): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) out.push(n);
  }
  return out;
}

export interface ToolExecContext {
  dataset: Dataset;
  onChart: (spec: ChartSpec) => void;
  onInsight: (insight: {
    title: string;
    body: string;
    severity: "info" | "warn" | "important";
  }) => void;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolExecContext,
): Promise<unknown> {
  const rows = ctx.dataset.rows;

  switch (name) {
    case "compute_stats": {
      const col = String(args.column);
      const op = String(args.op);
      if (op === "count") return { column: col, op, value: rows.length };
      if (op === "null_count") {
        const nulls = rows.filter((r) => r[col] === null || r[col] === undefined).length;
        return { column: col, op, value: nulls };
      }
      if (op === "count_distinct") {
        const set = new Set(rows.map((r) => String(r[col])));
        return { column: col, op, value: set.size };
      }
      const nums = getNumericCol(rows, col);
      if (nums.length === 0) return { column: col, op, error: "no numeric values" };
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      let value = 0;
      if (op === "sum") value = sum;
      else if (op === "mean") value = mean;
      else if (op === "min") value = Math.min(...nums);
      else if (op === "max") value = Math.max(...nums);
      else if (op === "median") {
        const s = [...nums].sort((a, b) => a - b);
        value = s[Math.floor(s.length / 2)];
      } else if (op === "stddev") {
        const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
        value = Math.sqrt(variance);
      }
      return { column: col, op, value, n: nums.length };
    }

    case "group_aggregate": {
      const groupBy = String(args.group_by);
      const aggCol = String(args.agg_column);
      const op = String(args.op);
      const topN = Number(args.top_n ?? 20);
      const groups = new Map<string, number[]>();
      for (const r of rows) {
        const key = String(r[groupBy] ?? "(null)");
        if (!groups.has(key)) groups.set(key, []);
        if (op === "count" || aggCol === "*") {
          groups.get(key)!.push(1);
        } else {
          const v = Number(r[aggCol]);
          if (!Number.isNaN(v)) groups.get(key)!.push(v);
        }
      }
      const result = Array.from(groups.entries()).map(([key, vals]) => {
        let val = 0;
        if (op === "count") val = vals.length;
        else if (op === "sum") val = vals.reduce((a, b) => a + b, 0);
        else if (op === "mean")
          val = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        else if (op === "min") val = Math.min(...vals);
        else if (op === "max") val = Math.max(...vals);
        return { group: key, value: val, n: vals.length };
      });
      result.sort((a, b) => b.value - a.value);
      return { group_by: groupBy, agg: `${op}(${aggCol})`, groups: result.slice(0, topN) };
    }

    case "value_counts": {
      const col = String(args.column);
      const topN = Number(args.top_n ?? 10);
      const counts = new Map<string, number>();
      for (const r of rows) {
        const k = String(r[col] ?? "(null)");
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const out = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([value, count]) => ({ value, count }));
      return { column: col, counts: out, distinct: counts.size };
    }

    case "filter_rows": {
      const conds = (args.conditions as Cond[]) ?? [];
      const matched = filterRows(rows, conds);
      return {
        match_count: matched.length,
        total: rows.length,
        sample: matched.slice(0, 5),
      };
    }

    case "correlation": {
      const a = String(args.column_a);
      const b = String(args.column_b);
      const pairs: [number, number][] = [];
      for (const r of rows) {
        const va = Number(r[a]);
        const vb = Number(r[b]);
        if (!Number.isNaN(va) && !Number.isNaN(vb)) pairs.push([va, vb]);
      }
      if (pairs.length < 2) return { column_a: a, column_b: b, error: "not enough numeric pairs" };
      const n = pairs.length;
      const meanA = pairs.reduce((s, p) => s + p[0], 0) / n;
      const meanB = pairs.reduce((s, p) => s + p[1], 0) / n;
      let num = 0;
      let denA = 0;
      let denB = 0;
      for (const [va, vb] of pairs) {
        num += (va - meanA) * (vb - meanB);
        denA += (va - meanA) ** 2;
        denB += (vb - meanB) ** 2;
      }
      const r = num / Math.sqrt(denA * denB || 1);
      return { column_a: a, column_b: b, pearson_r: r, n };
    }

    case "create_chart": {
      const type = String(args.type) as ChartSpec["type"];
      const x = String(args.x);
      const y = args.y ? String(args.y) : undefined;
      const agg = String(args.aggregation ?? "none");
      const topN = Number(args.top_n ?? 20);
      const title = String(args.title);
      const description = args.description ? String(args.description) : undefined;

      let data: { [k: string]: string | number }[] = [];
      if (type === "scatter" && y) {
        data = rows
          .map((r) => ({ [x]: Number(r[x]), [y]: Number(r[y]) }))
          .filter((p) => !Number.isNaN(p[x] as number) && !Number.isNaN(p[y] as number))
          .slice(0, 500);
      } else if (agg === "none" && y) {
        data = rows
          .slice(0, topN)
          .map((r) => ({ [x]: String(r[x]), [y]: Number(r[y]) }));
      } else if (agg !== "none") {
        // aggregate via group_aggregate logic
        const groups = new Map<string, number[]>();
        for (const r of rows) {
          const key = String(r[x] ?? "(null)");
          if (!groups.has(key)) groups.set(key, []);
          if (agg === "count" || !y) groups.get(key)!.push(1);
          else {
            const v = Number(r[y]);
            if (!Number.isNaN(v)) groups.get(key)!.push(v);
          }
        }
        const arr = Array.from(groups.entries()).map(([k, vals]) => {
          let v = 0;
          if (agg === "count") v = vals.length;
          else if (agg === "sum") v = vals.reduce((a, b) => a + b, 0);
          else if (agg === "mean")
            v = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          return { [x]: k, value: v };
        });
        arr.sort((a, b) => Number(b.value) - Number(a.value));
        data = arr.slice(0, topN);
      } else if (type === "pie" || !y) {
        const counts = new Map<string, number>();
        for (const r of rows) {
          const k = String(r[x] ?? "(null)");
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        data = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, topN)
          .map(([k, v]) => ({ [x]: k, value: v }));
      }

      const spec: ChartSpec = {
        id: uid(),
        type,
        xKey: x,
        yKey: y ?? "value",
        title,
        description,
        data,
      };
      ctx.onChart(spec);
      return {
        chart_id: spec.id,
        rendered: true,
        points: data.length,
      };
    }

    case "add_insight": {
      const ins = {
        title: String(args.title),
        body: String(args.body),
        severity: (args.severity as "info" | "warn" | "important") ?? "info",
      };
      ctx.onInsight(ins);
      return { saved: true };
    }

    case "sample_rows": {
      const n = Number(args.n ?? 5);
      const conds = (args.conditions as Cond[]) ?? [];
      const filtered = filterRows(rows, conds);
      return { rows: filtered.slice(0, Math.min(n, 10)), total_matching: filtered.length };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
