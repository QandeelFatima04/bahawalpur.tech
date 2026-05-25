"use client";

/**
 * CoachView (which imports @ricky0123/vad-web) is loaded with { ssr: false }
 * so Next.js never tries to run ONNX / WebAssembly on the server.
 * Without this, the page crashes with "This page couldn't load".
 */
import dynamic from "next/dynamic";
import { DashboardShell } from "@/components/DashboardShell";
import { RequireRole } from "@/components/RequireRole";
import { BotMessageSquare } from "lucide-react";

const CoachView = dynamic(() => import("./CoachView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-200px)] min-h-[480px] flex-col items-center justify-center gap-3 rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
      <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <BotMessageSquare size={22} />
      </div>
      <p className="text-[13px] text-muted-foreground">Loading coach…</p>
    </div>
  ),
});

export default function CoachPage() {
  return (
    <RequireRole role="student">
      <DashboardShell
        title="Career Coach"
        subtitle="Your personal AI advisor — ask about jobs, skills, or anything career-related."
      >
        <CoachView />
      </DashboardShell>
    </RequireRole>
  );
}
