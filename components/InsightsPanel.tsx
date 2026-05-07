"use client";

import type { Insight } from "@/types";
import { Lightbulb, AlertTriangle, Star } from "lucide-react";

const ICONS = {
  info: Lightbulb,
  warn: AlertTriangle,
  important: Star,
};

const COLORS = {
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  warn: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  important: "text-brand-400 bg-brand-500/10 border-brand-500/20",
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="text-sm muted italic px-1">
        No insights yet. Ask the agent to analyze your data.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {insights.map((ins) => {
        const Icon = ICONS[ins.severity];
        return (
          <div key={ins.id} className="panel-2 p-3 animate-slide-up">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-md border flex items-center justify-center flex-shrink-0 ${COLORS[ins.severity]}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{ins.title}</div>
                <div className="text-xs muted mt-1 leading-relaxed">{ins.body}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
