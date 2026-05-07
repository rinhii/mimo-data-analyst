"use client";

import { useCallback, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { DataUpload } from "@/components/DataUpload";
import { DataProfile } from "@/components/DataProfile";
import { DataPreview } from "@/components/DataPreview";
import { ChatPanel, type AgentMessage } from "@/components/ChatPanel";
import { ChartRenderer } from "@/components/ChartRenderer";
import { InsightsPanel } from "@/components/InsightsPanel";
import type { ChartSpec, Dataset, Insight } from "@/types";
import { summarizeForPrompt } from "@/lib/dataAnalyzer";
import { executeTool } from "@/lib/tools";
import { uid } from "@/lib/utils";
import { RefreshCw, Download, BarChart3, Lightbulb } from "lucide-react";

const MAX_AGENT_STEPS = 8;

const QUICK_PROMPTS = [
  "Give me a full analysis of this dataset",
  "What are the key trends and outliers?",
  "Which columns correlate the most?",
  "Create 3 useful charts that summarize this data",
];

export default function Page() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);

  const datasetSummary = useMemo(
    () => (dataset ? summarizeForPrompt(dataset) : ""),
    [dataset],
  );

  const reset = () => {
    setMessages([]);
    setCharts([]);
    setInsights([]);
    setError(null);
  };

  const resetAll = () => {
    reset();
    setDataset(null);
  };

  const runAgent = useCallback(
    async (userText: string) => {
      if (!dataset) return;
      setError(null);
      setIsRunning(true);

      const ctx = {
        dataset,
        onChart: (spec: ChartSpec) => setCharts((cs) => [...cs, spec]),
        onInsight: (ins: { title: string; body: string; severity: "info" | "warn" | "important" }) =>
          setInsights((ins0) => [
            ...ins0,
            { id: uid(), title: ins.title, body: ins.body, severity: ins.severity },
          ]),
      };

      const working: AgentMessage[] = [
        ...messages,
        { role: "user", content: userText },
      ];
      setMessages(working);

      try {
        for (let step = 0; step < MAX_AGENT_STEPS; step++) {
          setAgentStatus(step === 0 ? "Planning analysis…" : `Reasoning (step ${step + 1})…`);

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messages: working.map(({ _display, ...m }) => m),
              datasetSummary,
            }),
          });
          if (!res.ok) {
            const { error: errMsg } = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errMsg || `Chat API error: ${res.status}`);
          }
          const json = (await res.json()) as {
            message: AgentMessage;
            usage?: unknown;
          };
          const assistant = json.message;
          working.push(assistant);
          setMessages([...working]);

          const toolCalls = assistant.tool_calls ?? [];
          if (toolCalls.length === 0) break;

          setAgentStatus(`Running ${toolCalls.length} tool${toolCalls.length > 1 ? "s" : ""}…`);

          // Execute all tool calls (in parallel where possible)
          const results = await Promise.all(
            toolCalls.map(async (tc) => {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(tc.function.arguments || "{}");
              } catch {
                parsed = {};
              }
              try {
                const result = await executeTool(tc.function.name, parsed, ctx);
                return { tc, result, ok: true as const };
              } catch (err) {
                return {
                  tc,
                  result: { error: err instanceof Error ? err.message : String(err) },
                  ok: false as const,
                };
              }
            }),
          );

          for (const r of results) {
            const payload = JSON.stringify(r.result);
            working.push({
              role: "tool",
              content: payload,
              tool_call_id: r.tc.id,
              name: r.tc.function.name,
              _display: { status: r.ok ? "done" : "error", resultPreview: payload },
            });
          }
          setMessages([...working]);
        }
        setAgentStatus("Done");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setAgentStatus("Error");
      } finally {
        setIsRunning(false);
        setTimeout(() => setAgentStatus("idle"), 1500);
      }
    },
    [dataset, datasetSummary, messages],
  );

  const exportReport = () => {
    if (!dataset) return;
    const lines: string[] = [];
    lines.push(`# MiMo Data Analyst Report`);
    lines.push(`Dataset: **${dataset.profile.fileName}**`);
    lines.push(
      `Rows: ${dataset.profile.rowCount} · Columns: ${dataset.profile.columnCount}`,
    );
    lines.push(``);
    lines.push(`## Key Insights`);
    if (insights.length === 0) lines.push(`_No insights yet._`);
    for (const ins of insights) {
      lines.push(`### ${ins.title} _(${ins.severity})_`);
      lines.push(ins.body);
      lines.push(``);
    }
    lines.push(`## Charts`);
    for (const c of charts) {
      lines.push(`### ${c.title}`);
      if (c.description) lines.push(c.description);
      lines.push(`\`\`\`json`);
      lines.push(JSON.stringify({ type: c.type, x: c.xKey, y: c.yKey, data: c.data }, null, 2));
      lines.push(`\`\`\``);
    }
    lines.push(`## Conversation`);
    for (const m of messages) {
      if (m.role === "system") continue;
      if (m.role === "tool") {
        lines.push(`- **tool(${m.name})** → \`${(m.content ?? "").slice(0, 200)}\``);
      } else if (m.role === "user") {
        lines.push(`**You:** ${m.content}`);
      } else if (m.role === "assistant" && m.content) {
        lines.push(`**Agent:** ${m.content}`);
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mimo-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 p-6">
        {!dataset ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="text-center mb-8 max-w-xl">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
                Let <span className="gradient-text">Xiaomi MiMo</span> analyze your data.
              </h2>
              <p className="muted">
                Upload a CSV and the agent will autonomously plan, call tools,
                generate charts, and produce an insight report — all in your browser.
              </p>
            </div>
            <DataUpload onLoaded={setDataset} />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
            {/* Left: dataset + preview */}
            <aside className="col-span-3 panel p-4 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs muted uppercase tracking-wider">Dataset</div>
                  <div className="font-medium text-sm truncate" title={dataset.profile.fileName}>
                    {dataset.profile.fileName}
                  </div>
                </div>
                <button
                  onClick={resetAll}
                  className="muted hover:text-white transition-colors"
                  title="Load a different dataset"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <DataProfile dataset={dataset} />
              <div className="mt-4">
                <DataPreview dataset={dataset} />
              </div>
            </aside>

            {/* Middle: chat */}
            <section className="col-span-5 flex flex-col">
              {error && (
                <div className="mb-2 text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded">
                  {error}
                </div>
              )}
              <div className="flex-1 min-h-0">
                <ChatPanel
                  messages={messages}
                  onSend={runAgent}
                  onQuickAction={runAgent}
                  isRunning={isRunning}
                  agentStatus={agentStatus}
                  disabled={!dataset}
                  quickPrompts={QUICK_PROMPTS}
                />
              </div>
            </section>

            {/* Right: insights + charts */}
            <aside className="col-span-4 panel p-4 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-400" />
                  <span className="font-medium text-sm">Report</span>
                </div>
                <button
                  onClick={exportReport}
                  disabled={insights.length === 0 && charts.length === 0}
                  className="text-xs muted hover:text-brand-400 flex items-center gap-1 transition-colors disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs muted uppercase tracking-wider mb-2">Insights</div>
                  <InsightsPanel insights={insights} />
                </div>
                <div>
                  <div className="text-xs muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Charts
                  </div>
                  {charts.length === 0 ? (
                    <div className="text-sm muted italic px-1">
                      No charts yet. Ask the agent to create some.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {charts.map((c) => (
                        <ChartRenderer key={c.id} spec={c} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
