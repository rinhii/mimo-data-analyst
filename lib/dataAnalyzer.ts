import Papa from "papaparse";
import type {
  ColumnProfile,
  ColumnType,
  DataRow,
  Dataset,
  DatasetProfile,
} from "@/types";

function inferType(values: unknown[]): ColumnType {
  let numCount = 0;
  let boolCount = 0;
  let dateCount = 0;
  let strCount = 0;
  let nonNull = 0;

  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    nonNull++;
    if (typeof v === "boolean") {
      boolCount++;
      continue;
    }
    const s = String(v).trim();
    if (s === "true" || s === "false") {
      boolCount++;
      continue;
    }
    const n = Number(s);
    if (!Number.isNaN(n) && s !== "") {
      numCount++;
      continue;
    }
    // date check (ISO or common formats)
    if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        dateCount++;
        continue;
      }
    }
    strCount++;
  }

  if (nonNull === 0) return "string";
  if (numCount / nonNull > 0.9) return "number";
  if (boolCount / nonNull > 0.9) return "boolean";
  if (dateCount / nonNull > 0.7) return "date";
  if (strCount / nonNull > 0.7) return "string";
  return "mixed";
}

function coerceValue(v: unknown, type: ColumnType): string | number | boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (type === "number") {
    const n = typeof v === "number" ? v : Number(String(v).trim());
    return Number.isNaN(n) ? null : n;
  }
  if (type === "boolean") {
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
    return null;
  }
  return String(v);
}

function profileColumn(name: string, raw: unknown[]): ColumnProfile {
  const type = inferType(raw);
  const coerced = raw.map((v) => coerceValue(v, type));
  const nonNull = coerced.filter((v) => v !== null);
  const unique = new Set(nonNull.map((v) => String(v)));

  const profile: ColumnProfile = {
    name,
    type,
    count: raw.length,
    nullCount: coerced.length - nonNull.length,
    uniqueCount: unique.size,
    sampleValues: nonNull.slice(0, 5) as (string | number | boolean | null)[],
  };

  if (type === "number") {
    const nums = nonNull as number[];
    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      const variance =
        nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
      profile.min = sorted[0];
      profile.max = sorted[sorted.length - 1];
      profile.mean = mean;
      profile.median = sorted[Math.floor(sorted.length / 2)];
      profile.stdDev = Math.sqrt(variance);
    }
  } else if (type === "string" || type === "boolean") {
    const counts = new Map<string, number>();
    for (const v of nonNull) {
      const k = String(v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    profile.topValues = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));
  }

  return profile;
}

export async function parseCsvFile(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse<DataRow>(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: "greedy",
      complete: (results) => {
        try {
          const rows = results.data;
          if (rows.length === 0) {
            reject(new Error("CSV kosong atau gak bisa di-parse"));
            return;
          }
          const columnNames = Object.keys(rows[0] ?? {});
          const columns: ColumnProfile[] = columnNames.map((name) => {
            const raw = rows.map((r) => r[name]);
            return profileColumn(name, raw);
          });

          // coerce rows to match column types
          const typed: DataRow[] = rows.map((r) => {
            const out: DataRow = {};
            for (const col of columns) {
              out[col.name] = coerceValue(r[col.name], col.type);
            }
            return out;
          });

          const profile: DatasetProfile = {
            rowCount: typed.length,
            columnCount: columns.length,
            columns,
            fileName: file.name,
            fileSizeBytes: file.size,
          };
          resolve({ name: file.name, rows: typed, profile });
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}

export function summarizeForPrompt(ds: Dataset, maxRows = 5): string {
  const lines: string[] = [];
  lines.push(`Dataset: ${ds.profile.fileName}`);
  lines.push(`Rows: ${ds.profile.rowCount}, Columns: ${ds.profile.columnCount}`);
  lines.push("");
  lines.push("Columns:");
  for (const c of ds.profile.columns) {
    const parts = [`- ${c.name} (${c.type})`];
    parts.push(`nulls=${c.nullCount}`);
    parts.push(`unique=${c.uniqueCount}`);
    if (c.type === "number") {
      parts.push(
        `min=${c.min?.toFixed(2)}`,
        `max=${c.max?.toFixed(2)}`,
        `mean=${c.mean?.toFixed(2)}`,
        `std=${c.stdDev?.toFixed(2)}`,
      );
    } else if (c.topValues && c.topValues.length > 0) {
      parts.push(
        `top=[${c.topValues
          .slice(0, 3)
          .map((t) => `${t.value}:${t.count}`)
          .join(", ")}]`,
      );
    }
    lines.push(parts.join(" | "));
  }
  lines.push("");
  lines.push(`First ${Math.min(maxRows, ds.rows.length)} rows:`);
  for (const row of ds.rows.slice(0, maxRows)) {
    lines.push(JSON.stringify(row));
  }
  return lines.join("\n");
}
