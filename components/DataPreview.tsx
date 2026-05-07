"use client";

import type { Dataset } from "@/types";

export function DataPreview({ dataset }: { dataset: Dataset }) {
  const cols = dataset.profile.columns.map((c) => c.name);
  const rows = dataset.rows.slice(0, 10);
  return (
    <div className="panel p-3 overflow-hidden">
      <div className="text-xs muted uppercase tracking-wider mb-2 px-1">
        Preview (first 10 rows)
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="text-xs w-full">
          <thead>
            <tr className="text-left border-b border-[rgb(var(--border))]">
              {cols.map((c) => (
                <th key={c} className="font-medium px-2 py-1.5 muted whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[rgb(var(--border))]/50 hover:bg-[rgb(var(--panel-2))]/50">
                {cols.map((c) => (
                  <td key={c} className="px-2 py-1.5 font-mono whitespace-nowrap">
                    {r[c] === null || r[c] === undefined ? (
                      <span className="muted italic">null</span>
                    ) : (
                      String(r[c])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
