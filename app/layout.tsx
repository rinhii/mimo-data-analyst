import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiMo Data Analyst — AI Agent powered by Xiaomi MiMo",
  description:
    "An autonomous AI data analyst agent. Upload a CSV and let Xiaomi MiMo plan, analyze, visualize, and report.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
