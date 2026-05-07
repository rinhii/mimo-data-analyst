"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/types";

const PALETTE = [
  "#fb923c",
  "#f59e0b",
  "#60a5fa",
  "#34d399",
  "#a78bfa",
  "#f472b6",
  "#facc15",
  "#22d3ee",
];

export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  return (
    <div className="panel-2 p-4 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-medium text-sm">{spec.title}</div>
          {spec.description && (
            <div className="text-xs muted mt-0.5">{spec.description}</div>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
          {spec.type}
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(spec)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function renderChart(spec: ChartSpec) {
  const { type, xKey, yKey, data } = spec;
  const commonAxis = {
    stroke: "rgb(140, 140, 155)",
    fontSize: 11,
    tickLine: false,
  };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />;
  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "rgb(28, 28, 34)",
        border: "1px solid rgb(45, 45, 55)",
        borderRadius: 8,
        fontSize: 12,
      }}
      labelStyle={{ color: "rgb(240, 240, 244)" }}
    />
  );

  if (type === "bar") {
    return (
      <BarChart data={data}>
        {grid}
        <XAxis dataKey={xKey} {...commonAxis} />
        <YAxis {...commonAxis} />
        {tooltip}
        <Bar dataKey={yKey ?? "value"} fill={PALETTE[0]} radius={[6, 6, 0, 0]} />
      </BarChart>
    );
  }
  if (type === "line") {
    return (
      <LineChart data={data}>
        {grid}
        <XAxis dataKey={xKey} {...commonAxis} />
        <YAxis {...commonAxis} />
        {tooltip}
        <Line
          type="monotone"
          dataKey={yKey ?? "value"}
          stroke={PALETTE[0]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    );
  }
  if (type === "scatter") {
    return (
      <ScatterChart>
        {grid}
        <XAxis dataKey={xKey} type="number" name={xKey} {...commonAxis} />
        <YAxis dataKey={yKey} type="number" name={yKey} {...commonAxis} />
        {tooltip}
        <Scatter data={data} fill={PALETTE[0]} />
      </ScatterChart>
    );
  }
  if (type === "pie") {
    return (
      <PieChart>
        {tooltip}
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Pie
          data={data}
          dataKey={yKey ?? "value"}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={(entry: { name?: string }) => entry.name ?? ""}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  }
  return <BarChart data={data} />;
}
