"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Loader2, Database } from "lucide-react";
import { parseCsvFile } from "@/lib/dataAnalyzer";
import type { Dataset } from "@/types";

interface Props {
  onLoaded: (ds: Dataset) => void;
}

export function DataUpload({ onLoaded }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Currently only .csv files are supported.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("File too large (max 20 MB).");
        return;
      }
      setIsLoading(true);
      try {
        const ds = await parseCsvFile(file);
        onLoaded(ds);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse file");
      } finally {
        setIsLoading(false);
      }
    },
    [onLoaded],
  );

  const loadSample = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/sample-data.csv");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const file = new File([blob], "sample-sales.csv", { type: "text/csv" });
      const ds = await parseCsvFile(file);
      onLoaded(ds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sample");
    } finally {
      setIsLoading(false);
    }
  }, [onLoaded]);

  return (
    <div className="max-w-2xl mx-auto w-full animate-fade-in">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`panel cursor-pointer transition-all duration-200 p-12 text-center ${
          isDragging
            ? "border-brand-500 bg-brand-500/5 scale-[1.01]"
            : "hover:border-brand-500/40 hover:bg-[rgb(var(--panel-2))]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400/20 to-brand-600/20 flex items-center justify-center border border-brand-500/30">
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-brand-400" />
            )}
          </div>
        </div>
        <h3 className="text-lg font-medium mb-1">
          {isLoading ? "Parsing your data…" : "Drop a CSV file here"}
        </h3>
        <p className="text-sm muted mb-4">
          or click to browse. Max 20&nbsp;MB. Data stays in your browser.
        </p>
        {error && (
          <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center mt-6">
        <button
          onClick={loadSample}
          disabled={isLoading}
          className="text-sm muted hover:text-brand-400 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          or try the sample dataset (e-commerce sales)
        </button>
      </div>

      <div className="mt-12 grid grid-cols-3 gap-3">
        {[
          { icon: FileText, title: "CSV in, insights out", body: "Parse, profile, visualize" },
          { icon: Database, title: "Agent with tools", body: "Reasoning + 8 analytical tools" },
          { icon: Upload, title: "Privacy-first", body: "Data never leaves your browser" },
        ].map((f, i) => (
          <div key={i} className="panel-2 p-4">
            <f.icon className="w-4 h-4 text-brand-400 mb-2" />
            <div className="text-sm font-medium">{f.title}</div>
            <div className="text-xs muted mt-1">{f.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
