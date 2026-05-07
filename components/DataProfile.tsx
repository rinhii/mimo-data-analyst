"use client";

import type { Dataset } from "@/types";
import { fmtBytes, fmtNumber } from "@/lib/utils";
import { Hash, Type, Calendar, ToggleLeft, Shuffle } from "lucide-react";

const typeIcon = {
  number: Hash,
  string: Type,
  date: Calendar,
  boolean: ToggleLeft,
  mixed: Shuffle,
};

const typeColor = {
  number: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  string: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  date: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  boolean: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  mixed: "text-gray-400 bg-gray-500/10 border-gray-500/20",
};

interface Props {
  dataset: Dataset;
}

export function DataProfile({ dataset }: Props) {
  const { profile } = dataset;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Rows" value={fmtNumber(profile.rowCount)} />
        <Stat label="Columns" value={fmtNumber(profile.columnCount)} />
        <Stat label="File size" value={fmtBytes(profile.fileSizeBytes)} />
      </div>
      <div>
        <div className="text-xs muted uppercase tracking-wider mb-2 px-1">Columns</div>
        <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin pr-1">
          {profile.columns.map((c) => {
            const Icon = typeIcon[c.type];
            return (
              <div key={c.name} className="panel-2 p-2.5 flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-md border flex items-center justify-center flex-shrink-0 ${typeColor[c.type]}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${typeColor[c.type]}`}>
                      {c.type}
                    </span>
                  </div>
                  <div className="text-[11px] muted mt-0.5 font-mono">
                    {c.type === "number" ? (
                      <span>
                        µ={fmtNumber(c.mean, 2)} · σ={fmtNumber(c.stdDev, 2)} · [{fmtNumber(c.min)}, {fmtNumber(c.max)}]
                      </span>
                    ) : (
                      <span>
                        {fmtNumber(c.uniqueCount)} unique · {fmtNumber(c.nullCount)} null
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-2 p-3">
      <div className="text-[10px] uppercase tracking-wider muted">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
