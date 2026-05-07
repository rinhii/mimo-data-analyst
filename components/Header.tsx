"use client";

import { Sparkles, Github, Cpu } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg tracking-tight">MiMo Data Analyst</h1>
            <span className="text-[10px] uppercase tracking-wider font-medium text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
              Agent
            </span>
          </div>
          <p className="text-xs muted">Autonomous data analysis powered by Xiaomi MiMo</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs muted">
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-mono">mimo-v2.5</span>
        </div>
        <a
          href="https://platform.xiaomimimo.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs muted hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Github className="w-3.5 h-3.5" />
          MiMo Platform
        </a>
      </div>
    </header>
  );
}
