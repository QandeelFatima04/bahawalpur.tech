"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { DashboardShell } from "@/components/DashboardShell";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillLearnLink } from "@/components/SkillLearnLink";
import {
  PipelineDonut,
  TimelineLine,
  HorizontalBars,
} from "@/components/dashboard/charts";
import {
  STAGES,
  STAGE_LABEL,
  STAGE_COLOR,
  bucketByDate,
  derivePipelineStage,
} from "@/lib/applicationPipeline";
import {
  LayoutDashboard,
  FileText as FileTextIcon,
  UserCircle,
  Sparkles as SparklesIcon,
  Briefcase,
  Send as SendIcon,
  CalendarClock as CalendarClockIcon,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

const STOPWORDS = new Set([
  "junior",
  "senior",
  "engineer",
  "developer",
  "intern",
  "lead",
  "specialist",
  "manager",
  "level",
  "entry",
]);

function aggregateMissingSkills(jobs) {
  const freq = new Map();
  for (const job of jobs || []) {
    if ((job.total_score || 0) >= (job.apply_threshold || 0)) continue;
    for (const s of job.missing_skills || []) {
      freq.set(s, (freq.get(s) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
}

function aggregateBestCategories(jobs) {
  const freq = new Map();
  for (const job of jobs || []) {
    if ((job.total_score || 0) < 50) continue;
    for (const word of String(job.title || "")
      .toLowerCase()
      .split(/\s+/)) {
      if (word.length < 4 || STOPWORDS.has(word)) continue;
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word[0].toUpperCase() + word.slice(1));
}

function InsightsView() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const safe = (p) => p.catch(() => null);
    const [j, a, i] = await Promise.all([
      safe(api("/students/me/jobs")),
      safe(api("/students/me/applications")),
      safe(api("/students/me/interviews")),
    ]);
    setJobs(Array.isArray(j) ? j : []);
    setApplications(Array.isArray(a) ? a : []);
    setInterviews(Array.isArray(i) ? i : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pipeline = useMemo(() => {
    const interviewByJob = new Map();
    for (const it of interviews) interviewByJob.set(it.job_id, it);
    return applications.map((a) => {
      const it = interviewByJob.get(a.job_id);
      const stage = derivePipelineStage({
        applicationStatus: a.status,
        appliedAt: a.created_at,
        interviewStatus: it?.status,
        hireStatus: it?.hire_status,
      });
      return { ...a, stage };
    });
  }, [applications, interviews]);

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
    for (const row of pipeline) counts[row.stage] = (counts[row.stage] || 0) + 1;
    return counts;
  }, [pipeline]);

  const totalApps = pipeline.length;
  const donutData = useMemo(
    () =>
      STAGES.filter((s) => stageCounts[s] > 0).map((s) => ({
        name: STAGE_LABEL[s],
        value: stageCounts[s],
        color: STAGE_COLOR[s],
      })),
    [stageCounts],
  );

  const timeline = useMemo(
    () => bucketByDate(applications, (r) => r.created_at, 30),
    [applications],
  );

  const missingSkillsData = useMemo(() => aggregateMissingSkills(jobs), [jobs]);
  const bestCategories = useMemo(() => aggregateBestCategories(jobs), [jobs]);

  const avgMatch = useMemo(() => {
    const scores = pipeline
      .map((p) => p.match_score_at_apply)
      .filter((s) => typeof s === "number");
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [pipeline]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Where your CVs sit</CardTitle>
            <CardDescription>
              {totalApps === 0
                ? "Apply to your first role and the donut wakes up."
                : `${totalApps} application${totalApps === 1 ? "" : "s"} across the pipeline.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineDonut
              data={donutData}
              centerLabel={totalApps === 1 ? "Application" : "Applications"}
              centerValue={totalApps}
            />
            <ul className="mt-4 space-y-1.5 text-[13px]">
              {STAGES.map((s) => {
                const count = stageCounts[s] || 0;
                if (count === 0 && totalApps > 0) return null;
                return (
                  <li key={s} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: STAGE_COLOR[s] }}
                    />
                    <span className="flex-1">{STAGE_LABEL[s]}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>30-day pace</CardTitle>
            <CardDescription>
              Applications you've sent over the last 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalApps === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-[13px] text-muted-foreground">
                Quiet 30 days. Send a few applications and the line lights up.
              </div>
            ) : (
              <TimelineLine data={timeline} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What's between you and the locked roles</CardTitle>
            <CardDescription>
              Skills you're missing across jobs you haven't cleared.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {missingSkillsData.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">
                No major gaps detected. You're set.
              </p>
            ) : (
              <>
                <HorizontalBars
                  data={missingSkillsData}
                  height={Math.max(180, missingSkillsData.length * 28)}
                  valueLabel="Jobs locked by this skill"
                />
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {missingSkillsData.slice(0, 8).map((s) => (
                    <SkillLearnLink key={s.name} skill={s.name} />
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Click a skill — free learning resource opens.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where you fit best</CardTitle>
            <CardDescription>
              Patterns across roles where your match score is 50%+.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Strongest role types
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {bestCategories.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                      Apply to more roles and patterns appear here.
                    </p>
                  ) : (
                    bestCategories.map((c) => (
                      <Badge key={c} variant="accent">
                        {c}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-md bg-[rgba(0,0,0,0.02)] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Your average fit
                </div>
                <div className="mt-1 font-display text-[28px] font-semibold leading-[1.14] tracking-[-0.01em]">
                  {avgMatch}%
                </div>
                <p className="mt-1 text-[12px] leading-[1.4] text-muted-foreground">
                  {avgMatch >= 75
                    ? "Strong fit on average. Companies see a clean signal."
                    : avgMatch >= 50
                    ? "Close. Closing 1–2 skill gaps lifts this fast."
                    : avgMatch > 0
                    ? "Long stretch. Pick roles where you clear the bar first."
                    : "No applications yet — your average score will land here."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InsightsPage() {
  const navItems = [
    { key: "overview", label: "Overview", icon: LayoutDashboard, href: "/student?tab=overview" },
    { key: "resume", label: "CV", icon: FileTextIcon, href: "/student?tab=resume" },
    { key: "profile", label: "Profile", icon: UserCircle, href: "/student?tab=profile" },
    { key: "report", label: "Career report", icon: SparklesIcon, href: "/student?tab=report" },
    { key: "jobs", label: "Jobs", icon: Briefcase, href: "/student?tab=jobs" },
    { key: "applications", label: "Applications", icon: SendIcon, href: "/student?tab=applications" },
    { key: "interviews", label: "Interviews", icon: CalendarClockIcon, href: "/student?tab=interviews" },
    { key: "insights", label: "Insights", icon: BarChart3 },
  ];

  return (
    <DashboardShell
      title="The numbers behind your search."
      subtitle="Where your CVs sit, what's between you and locked roles, and the role types you keep clearing."
      nav={<DashboardSidebar items={navItems} activeKey="insights" />}
    >
      <div className="mb-4 lg:hidden">
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </div>
      <InsightsView />
    </DashboardShell>
  );
}

export default function Page() {
  return (
    <RequireRole role="student">
      <InsightsPage />
    </RequireRole>
  );
}
