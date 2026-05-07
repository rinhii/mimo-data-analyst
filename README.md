# MiMo Data Analyst

An autonomous **AI data analyst agent** built on top of **Xiaomi MiMo**. Upload any CSV — the agent plans, calls analytical tools, generates charts, and produces an insight report entirely in the browser.

Built for the **Xiaomi MiMo Orbit 100T Token Creator Incentive Program** as a reference project showing how MiMo's reasoning + tool-calling can power a real, useful product.

![stack](https://img.shields.io/badge/Next.js-14-black) ![stack](https://img.shields.io/badge/TypeScript-5-blue) ![stack](https://img.shields.io/badge/Xiaomi_MiMo-v2.5-orange)

---

## Why this project?

Most "ask-your-data" tools either (a) send your rows to a vendor, or (b) use fragile code-interpreter sandboxes. This one is different:

- **Data never leaves your browser.** CSV parsing + all tool execution runs client-side.
- **The model only sees a tiny schema summary** (column names, dtypes, a few stats). It then calls tools on your local data.
- **Deterministic tools, creative reasoning.** Every number in the report is verifiable — it came from a tool call, not from the LLM's imagination.

## How it works

```
┌──────────────────────────────────────────────┐
│  Browser (Next.js client)                    │
│  ├─ Parse CSV, build profile                 │
│  ├─ Render chat, charts, insights            │
│  └─ Execute tool calls on local rows         │
└──────────────┬───────────────────────────────┘
               │ (messages + profile only)
               ▼
┌──────────────────────────────────────────────┐
│  /api/chat (Next.js route, Node.js runtime)  │
│  └─ Proxies to Xiaomi MiMo API               │
│       model=mimo-reasoning-v2.5              │
│       tools=[compute_stats, group_aggregate, │
│              value_counts, filter_rows,      │
│              correlation, create_chart,      │
│              add_insight, sample_rows]       │
└──────────────┬───────────────────────────────┘
               ▼
       Xiaomi MiMo API (OpenAI-compatible)
```

The UI runs an **agent loop** (up to 8 steps):

1. Send conversation + dataset profile + tool schemas to MiMo.
2. If the model returns `tool_calls`, execute them locally against the in-memory rows.
3. Append tool outputs to the conversation and go back to step 1.
4. When the model returns a final message (no tool calls), stop and render.

## Tools exposed to the model

| Tool | Purpose |
|------|---------|
| `compute_stats` | mean / median / min / max / sum / stddev / count_distinct / null_count on a column |
| `group_aggregate` | Group by a column, aggregate a numeric column (sum, mean, count, etc.) |
| `value_counts` | Top-N distinct values + frequencies for categorical columns |
| `filter_rows` | Boolean filter with simple conditions, returns match count + samples |
| `correlation` | Pearson correlation between two numeric columns |
| `create_chart` | Render bar / line / scatter / pie chart in the report panel |
| `add_insight` | Save a structured finding to the Insights panel |
| `sample_rows` | Return up to 10 rows (optionally filtered) for inspection |

## Running locally

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# edit .env.local and set MIMO_API_KEY

# 3. Run
npm run dev
# open http://localhost:3000
```

### Environment variables

```
MIMO_API_KEY=...          # from https://platform.xiaomimimo.com
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-reasoning-v2.5
```

## Demo

Click **"try the sample dataset"** on the landing screen to load 100 rows of e-commerce sales. Then ask things like:

- _"Give me a full analysis of this dataset"_
- _"Which region generates the highest revenue?"_
- _"Is there a correlation between customer age and discount?"_
- _"Make a monthly revenue trend chart"_

The agent will plan, call a handful of tools in parallel, render charts, save insights, and produce a narrated summary.

## Project structure

```
app/
  layout.tsx, page.tsx, globals.css
  api/
    chat/route.ts        # MiMo proxy with tools
    health/route.ts
components/
  Header, DataUpload, DataProfile, DataPreview,
  ChatPanel, ChartRenderer, InsightsPanel
lib/
  dataAnalyzer.ts        # CSV parse + column profiling
  tools.ts               # Tool schemas + local executor
  mimo.ts                # MiMo client + system prompt
  utils.ts
types/
  index.ts
public/
  sample-data.csv
```

## License

MIT
