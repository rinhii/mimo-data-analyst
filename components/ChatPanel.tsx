"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Wrench, Loader2, Sparkles, User, CheckCircle2, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { truncate } from "@/lib/utils";

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
  name?: string;
  // UI-only metadata
  _display?: {
    resultPreview?: string;
    status?: "running" | "done" | "error";
  };
}

interface Props {
  messages: AgentMessage[];
  onSend: (text: string) => void;
  onQuickAction: (text: string) => void;
  isRunning: boolean;
  agentStatus: string;
  disabled?: boolean;
  quickPrompts: string[];
}

export function ChatPanel({
  messages,
  onSend,
  onQuickAction,
  isRunning,
  agentStatus,
  disabled,
  quickPrompts,
}: Props) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isRunning]);

  const visible = messages.filter(
    (m) => m.role !== "system" && !(m.role === "assistant" && !m.content && !m.tool_calls?.length),
  );

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgb(var(--border))] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="font-medium text-sm">Agent Chat</span>
        </div>
        <div className="flex items-center gap-2 text-xs muted">
          {isRunning ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
              <span className="text-brand-400">{agentStatus}</span>
            </>
          ) : (
            <span>{messages.filter((m) => m.role !== "system").length} messages</span>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {visible.length === 0 && !isRunning && (
          <div className="text-center py-8">
            <div className="text-sm muted mb-4">
              Start by asking a question or pick a suggested analysis:
            </div>
            <div className="flex flex-col gap-2 max-w-md mx-auto">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => onQuickAction(p)}
                  disabled={disabled}
                  className="panel-2 text-left text-sm px-3 py-2 hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {visible.map((m, i) => (
          <Message key={i} m={m} />
        ))}

        {isRunning && (
          <div className="flex items-center gap-2 text-xs muted pl-10 animate-fade-in">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{agentStatus}</span>
          </div>
        )}
      </div>

      <div className="border-t border-[rgb(var(--border))] p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isRunning && !disabled) {
              onSend(input.trim());
              setInput("");
            }
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isRunning || disabled}
            placeholder={
              disabled
                ? "Upload a dataset to start chatting"
                : "Ask the agent to analyze, visualize, or compare…"
            }
            className="flex-1 panel-2 px-3 py-2 text-sm focus:outline-none focus:border-brand-500/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isRunning || disabled || !input.trim()}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function Message({ m }: { m: AgentMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex gap-3 animate-slide-up">
        <div className="w-7 h-7 rounded-full bg-[rgb(var(--panel-2))] border flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 muted" />
        </div>
        <div className="flex-1 pt-0.5">
          <div className="text-xs muted mb-1">You</div>
          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
        </div>
      </div>
    );
  }

  if (m.role === "assistant") {
    return (
      <div className="flex gap-3 animate-slide-up">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 pt-0.5 min-w-0">
          <div className="text-xs muted mb-1">MiMo Agent</div>
          {m.content && (
            <div className="text-sm md leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
          )}
          {m.tool_calls && m.tool_calls.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {m.tool_calls.map((tc) => (
                <ToolCallChip key={tc.id} name={tc.function.name} args={tc.function.arguments} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (m.role === "tool") {
    return (
      <div className="flex gap-3 animate-slide-up">
        <div className="w-7 h-7 rounded-md bg-[rgb(var(--panel-2))] border border-brand-500/30 flex items-center justify-center flex-shrink-0">
          {m._display?.status === "error" ? (
            <XCircle className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </div>
        <div className="flex-1 pt-0.5 min-w-0">
          <div className="text-xs muted mb-1">
            Tool: <span className="text-brand-400 font-mono">{m.name}</span>
          </div>
          <div className="text-xs muted font-mono bg-[rgb(var(--panel-2))] border rounded px-2 py-1.5 overflow-x-auto scrollbar-thin">
            {truncate(String(m.content ?? ""), 280)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ToolCallChip({ name, args }: { name: string; args: string }) {
  let pretty = args;
  try {
    pretty = JSON.stringify(JSON.parse(args));
  } catch {
    /* ignore */
  }
  return (
    <div className="panel-2 px-2.5 py-1.5 inline-flex items-center gap-2 text-xs">
      <Wrench className="w-3 h-3 text-brand-400" />
      <span className="font-mono text-brand-400">{name}</span>
      <span className="muted font-mono truncate max-w-[280px]">{truncate(pretty, 80)}</span>
    </div>
  );
}
