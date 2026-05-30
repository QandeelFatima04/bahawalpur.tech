"use client";

/**
 * CoachView (which imports @ricky0123/vad-web) is loaded with { ssr: false }
 * so Next.js never tries to run ONNX / WebAssembly on the server.
 * Without this, the page crashes with "This page couldn't load".
 *
 * It's also wrapped in <ErrorBoundary> so a runtime VAD/mic failure on the
 * client (asset 404, MediaDevices unavailable, permission denied, WASM init
 * crash) shows a friendly inline message instead of tearing down the whole
 * /student/coach route.
 */
import dynamic from "next/dynamic";
import {
  LayoutDashboard,
  FileText as FileTextIcon,
  UserCircle,
  Sparkles as SparklesIcon,
  Briefcase,
  Send as SendIcon,
  CalendarClock as CalendarClockIcon,
  BarChart3,
  MessageSquare,
  BotMessageSquare,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { RequireRole } from "@/components/RequireRole";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

function CoachFallback(error, reset) {
  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[480px] flex-col items-center justify-center gap-3 rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <BotMessageSquare size={22} />
      </div>
      <p className="text-[15px] font-semibold text-foreground">
        Coach is having trouble starting
      </p>
      <p className="max-w-md text-[13px] text-muted-foreground">
        {error?.message?.includes("microphone") || error?.message?.includes("Permission")
          ? "Microphone access is required for voice mode. You can still chat with text."
          : "We hit a snag loading the coach. Please refresh and try again."}
      </p>
      <button
        onClick={reset}
        className="rounded-pill bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}

// Mirror the nav items from apps/web/app/student/page.js.
// Tabs that are local state on /student use href:"/student" so clicking them
// navigates back to the dashboard (which opens on the default/overview tab).
// Insights and Coach keep their own dedicated routes.
const NAV_ITEMS = [
  { key: "overview",      label: "Overview",      icon: LayoutDashboard,    href: "/student" },
  { key: "resume",        label: "CV",            icon: FileTextIcon,       href: "/student" },
  { key: "profile",       label: "Profile",       icon: UserCircle,         href: "/student" },
  { key: "report",        label: "Career report", icon: SparklesIcon,       href: "/student" },
  { key: "jobs",          label: "Jobs",          icon: Briefcase,          href: "/student" },
  { key: "applications",  label: "Applications",  icon: SendIcon,           href: "/student" },
  { key: "interviews",    label: "Interviews",    icon: CalendarClockIcon,  href: "/student" },
  { key: "insights",      label: "Insights",      icon: BarChart3,          href: "/student/insights" },
  { key: "coach",         label: "Coach",         icon: MessageSquare,      href: "/student/coach" },
];

export default function CoachPage() {
  return (
    <RequireRole role="student">
      <DashboardShell
        title="Career Coach"
        subtitle="Your personal AI advisor — ask about jobs, skills, or anything career-related."
        nav={<DashboardSidebar items={NAV_ITEMS} activeKey="coach" />}
      >
        <ErrorBoundary fallback={CoachFallback}>
          <CoachView />
        </ErrorBoundary>
      </DashboardShell>
    </RequireRole>
  );
}
