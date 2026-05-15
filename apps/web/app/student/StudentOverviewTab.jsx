"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CircularProgress } from "@/components/dashboard/CircularProgress";
import { PipelineDonut, TimelineLine } from "@/components/dashboard/Charts";
import { SkillLearnLink } from "@/components/SkillLearnLink";
import { JoinMeetingButton } from "@/components/JoinMeetingButton";
import {
  STAGES,
  STAGE_COLOR,
  STAGE_LABEL,
  bucketByDate,
  derivePipelineStage,
} from "@/lib/applicationPipeline";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  Lightbulb,
  Sparkles,
  Target,
  Upload,
  Users,
  XCircle,
} from "lucide-react";

const PROFILE_ITEMS = [
  { key: "resume", label: "Resume parsed", test: (p) => Boolean(p?.skills?.length || p?.summary), tab: "resume" },
  { key: "summary", label: "Professional summary", test: (p) => Boolean(p?.summary), tab: "profile" },
  { key: "skills", label: "At least 5 skills", test: (p) => (p?.skills?.length || 0) >= 5, tab: "profile" },
  { key: "education", label: "Education filled", test: (p) => Boolean(p?.university && p?.degree), tab: "profile" },
  { key: "projects", label: "At least 1 project", test: (p) => (p?.projects?.length || 0) >= 1, tab: "profile" },
  { key: "links", label: "LinkedIn / GitHub / portfolio link", test: (p) => Boolean(p?.linkedin_url || p?.github_url || p?.portfolio_url), tab: "profile" },
];

function computeProfileCompletion(profile) {
  const items = PROFILE_ITEMS.map((it) => ({ ...it, done: it.test(profile) }));
  const done = items.filter((it) => it.done).length;
  const percent = Math.round((done / items.length) * 100);
  return { items, done, total: items.length, percent };
}

function aggregateMissingSkills(jobs) {
  // Frequency-count missing skills across jobs the student is below threshold on.
  const freq = new Map();
  for (const job of jobs || []) {
    if ((job.total_score || 0) >= (job.apply_threshold || 0)) continue;
    for (const s of job.missing_skills || []) {
      freq.set(s, (freq.get(s) || 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s);
}

function aggregateBestCategories(jobs) {
  // Heuristic: split each title on whitespace, keep words >= 4 chars, count where match >= 50%.
  const freq = new Map();
  const STOPWORDS = new Set(["junior", "senior", "engineer", "developer", "intern", "lead", "specialist", "manager", "level", "entry"]);
  for (const job of jobs || []) {
    if ((job.total_score || 0) < 50) continue;
    for (const word of String(job.title || "").toLowerCase().split(/\s+/)) {
      if (word.length < 4 || STOPWORDS.has(word)) continue;
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word[0].toUpperCase() + word.slice(1));
}

function NextAction({ icon, title, hint, cta, onClick, tone = "default" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-3 rounded-lg border border-black/[0.04] bg-card px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/[0.03]`}
    >
      <div
        className={`mt-0.5 shrink-0 ${
          tone === "warn" ? "text-warn" : tone === "destructive" ? "text-destructive" : "text-accent"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-medium leading-[1.3]">{title}</div>
        {hint && <div className="mt-0.5 text-[12px] leading-[1.3] text-muted-foreground">{hint}</div>}
      </div>
      <div className="text-[12px] text-muted-foreground group-hover:text-accent">
        {cta || "Go"} <ChevronRight size={12} className="inline" />
      </div>
    </button>
  );
}

export function StudentOverviewTab({ onJump, onToast }) {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const safe = (p) => p.catch(() => null);
    const [p, j, a, i] = await Promise.all([
      safe(api("/students/me/profile")),
      safe(api("/students/me/jobs")),
      safe(api("/students/me/applications")),
      safe(api("/students/me/interviews")),
    ]);
    setProfile(p);
    setJobs(Array.isArray(j) ? j : []);
    setApplications(Array.isArray(a) ? a : []);
    setInterviews(Array.isArray(i) ? i : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decideInterview = async (interview, action) => {
    const target = action === "accept" ? "accepted" : "rejected";
    const original = interview.status;
    setInterviews((prev) => prev.map((r) => (r.id === interview.id ? { ...r, status: target } : r)));
    try {
      const updated = await api(`/students/me/interviews/${interview.id}/${action}`, { method: "POST" });
      setInterviews((prev) => prev.map((r) => (r.id === interview.id ? { ...r, ...updated } : r)));
      onToast?.(
        action === "accept"
          ? "Interview accepted — meeting link sent by email"
          : "Interview declined — the company has been notified",
      );
    } catch (err) {
      setInterviews((prev) => prev.map((r) => (r.id === interview.id ? { ...r, status: original } : r)));
      onToast?.(err.message || "Could not update interview");
    }
  };

  // ---- Derived state ----
  const completion = useMemo(() => computeProfileCompletion(profile), [profile]);

  const pipeline = useMemo(() => {
    // Join applications with interviews (no shortlist info on student side — that's company-private).
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
      return { ...a, stage, interview: it };
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
      STAGES
        .filter((s) => stageCounts[s] > 0)
        .map((s) => ({ name: STAGE_LABEL[s], value: stageCounts[s], color: STAGE_COLOR[s] })),
    [stageCounts],
  );

  const timeline = useMemo(
    () => bucketByDate(applications, (r) => r.created_at, 30),
    [applications],
  );

  const avgMatch = useMemo(() => {
    const scores = pipeline.map((p) => p.match_score_at_apply).filter((s) => typeof s === "number");
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [pipeline]);

  const topMissing = useMemo(() => aggregateMissingSkills(jobs), [jobs]);
  const bestCategories = useMemo(() => aggregateBestCategories(jobs), [jobs]);

  const eligibleJobs = useMemo(
    () =>
      jobs.filter(
        (j) => (j.total_score || 0) >= (j.apply_threshold || 0) && !j.already_applied,
      ),
    [jobs],
  );

  const pendingInterviews = useMemo(
    () => interviews.filter((i) => i.status === "pending"),
    [interviews],
  );
  const upcomingInterviews = useMemo(
    () =>
      interviews
        .filter((i) => i.status === "accepted" && new Date(i.interview_date) > new Date())
        .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date))
        .slice(0, 3),
    [interviews],
  );

  // Next actions list — rule-based, prioritized.
  const nextActions = useMemo(() => {
    const actions = [];
    if (pendingInterviews.length > 0) {
      actions.push({
        icon: <CalendarClock size={16} />,
        tone: "warn",
        title: `Respond to ${pendingInterviews.length} pending interview request${pendingInterviews.length === 1 ? "" : "s"}`,
        hint: "Companies are waiting on your accept / reject.",
        cta: "Open",
        onClick: () => onJump?.("interviews"),
      });
    }
    if (!profile?.visibility_flag) {
      actions.push({
        icon: <Activity size={16} />,
        title: "Turn on profile visibility",
        hint: "Companies can only match and contact you when this is on.",
        cta: "Enable",
        onClick: () => onJump?.("profile"),
      });
    }
    if (!completion.items[0].done) {
      actions.push({
        icon: <Upload size={16} />,
        tone: "warn",
        title: "Upload your CV to generate your AI profile",
        hint: "Most fields fill themselves once your resume is parsed.",
        cta: "Upload",
        onClick: () => onJump?.("resume"),
      });
    }
    if ((profile?.skills?.length || 0) < 5 && (profile?.skills?.length || 0) > 0) {
      actions.push({
        icon: <Sparkles size={16} />,
        title: `Add ${5 - profile.skills.length} more skill${5 - profile.skills.length === 1 ? "" : "s"} to improve matching`,
        hint: "Skills carry the most weight in your match score.",
        cta: "Edit",
        onClick: () => onJump?.("profile"),
      });
    }
    if (eligibleJobs.length > 0 && totalApps < 3) {
      actions.push({
        icon: <Target size={16} />,
        tone: "warn",
        title: `Apply to ${Math.min(eligibleJobs.length, 3)} recommended role${eligibleJobs.length === 1 ? "" : "s"}`,
        hint: `You meet the threshold on ${eligibleJobs.length} job${eligibleJobs.length === 1 ? "" : "s"} — don't leave them sitting.`,
        cta: "Browse",
        onClick: () => onJump?.("jobs"),
      });
    }
    if (topMissing.length >= 3) {
      actions.push({
        icon: <Lightbulb size={16} />,
        title: `Review missing skills across ${topMissing.length} role${topMissing.length === 1 ? "" : "s"}`,
        hint: "Click any missing skill on the Jobs tab to open a learning resource.",
        cta: "Open",
        onClick: () => onJump?.("jobs"),
      });
    }
    return actions.slice(0, 5);
  }, [profile, completion, eligibleJobs, totalApps, pendingInterviews, topMissing, onJump]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1 — KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total applications"
          value={totalApps}
          hint={
            totalApps === 0
              ? "Apply to your first role to start tracking."
              : `${stageCounts.under_review} under review, ${stageCounts.interview_requested} need your response.`
          }
          icon={<FileText size={16} />}
        />
        <KpiCard
          label="Interviews scheduled"
          value={stageCounts.interview_scheduled}
          hint={
            upcomingInterviews[0]
              ? `Next: ${new Date(upcomingInterviews[0].interview_date).toLocaleDateString()}`
              : "No upcoming interviews."
          }
          icon={<CalendarClock size={16} />}
          tone={stageCounts.interview_scheduled > 0 ? "accent" : "default"}
        />
        <KpiCard
          label="Avg match score"
          value={`${avgMatch}%`}
          hint={
            avgMatch >= 75
              ? "Strong fit on the roles you applied to."
              : avgMatch > 0
              ? "Aim for ≥75% by closing skill gaps."
              : "Apply to a few roles to see your avg."
          }
          icon={<Target size={16} />}
          tone={avgMatch >= 75 ? "success" : avgMatch >= 50 ? "default" : "warn"}
        />
        <KpiCard
          label="Eligible jobs"
          value={eligibleJobs.length}
          hint={
            eligibleJobs.length > 0
              ? `You meet the threshold — go apply.`
              : "Improve your profile to unlock more jobs."
          }
          icon={<CheckCircle2 size={16} />}
          tone={eligibleJobs.length > 0 ? "accent" : "default"}
        />
      </div>

      {/* Row 2 — Profile completion + What To Do Next */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile completion</CardTitle>
            <CardDescription>
              {completion.percent === 100
                ? "All set — your profile is fully filled in."
                : `Your profile is ${completion.percent}% complete. Finish these to improve job matching.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-5">
              <CircularProgress value={completion.percent} size={96} stroke={9} />
              <ul className="grid flex-1 gap-2 sm:grid-cols-2">
                {completion.items.map((it) => (
                  <li
                    key={it.key}
                    className={`flex items-center gap-2 text-[13px] ${it.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {it.done ? (
                      <CheckCircle2 size={14} className="text-success" />
                    ) : (
                      <XCircle size={14} className="text-muted-foreground" />
                    )}
                    <span>{it.label}</span>
                    {!it.done && (
                      <button
                        type="button"
                        className="ml-auto text-[12px] text-accent hover:underline"
                        onClick={() => onJump?.(it.tab)}
                      >
                        Fix →
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What to do next</CardTitle>
            <CardDescription>Prioritized by what unlocks the most matches.</CardDescription>
          </CardHeader>
          <CardContent>
            {nextActions.length === 0 ? (
              <div className="rounded-lg bg-success/[0.06] p-4 text-[14px] text-success ring-1 ring-success/20">
                <CheckCircle2 size={16} className="mr-1 inline" />
                You're on top of everything. Keep an eye on new roles in the Jobs tab.
              </div>
            ) : (
              <div className="space-y-2">
                {nextActions.map((a, idx) => (
                  <NextAction key={idx} {...a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Application tracking + Applications over time */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Application status</CardTitle>
            <CardDescription>
              {totalApps === 0
                ? "No applications yet — browse jobs to get started."
                : `${totalApps} application${totalApps === 1 ? "" : "s"} across the pipeline.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-center">
              <PipelineDonut data={donutData} />
              <ul className="space-y-1.5 text-[13px]">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications over time</CardTitle>
            <CardDescription>Last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {totalApps === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-[13px] text-muted-foreground">
                Apply to roles to see your activity.
              </div>
            ) : (
              <TimelineLine data={timeline} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Match insights + Interviews & deadlines */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Match insights</CardTitle>
            <CardDescription>Where to focus to unlock more roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                  Best-matching role types
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {bestCategories.length === 0 ? (
                    <span className="text-[13px] text-muted-foreground">
                      Apply to more jobs to see patterns.
                    </span>
                  ) : (
                    bestCategories.map((c) => (
                      <Badge key={c} variant="accent">
                        {c}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                  Top missing skills
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topMissing.length === 0 ? (
                    <span className="text-[13px] text-muted-foreground">
                      No major gaps detected.
                    </span>
                  ) : (
                    topMissing.map((s) => <SkillLearnLink key={s} skill={s} />)
                  )}
                </div>
                {topMissing.length > 0 && (
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    Click a skill to open a free learning resource.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interviews & deadlines</CardTitle>
            <CardDescription>Pending requests and upcoming interviews.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInterviews.length === 0 && upcomingInterviews.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">No interview activity yet.</div>
            ) : (
              <div className="space-y-3">
                {pendingInterviews.map((i) => (
                  <div
                    key={i.id}
                    className="rounded-lg border border-warn/30 bg-warn/[0.04] px-3 py-2.5"
                  >
                    <div className="text-[13px] font-medium">{i.job_title}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {i.company_name} · {new Date(i.interview_date).toLocaleString()}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="success" onClick={() => decideInterview(i, "accept")}>
                        Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => decideInterview(i, "reject")}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {upcomingInterviews.map((i) => (
                  <div
                    key={i.id}
                    className="rounded-lg border border-accent/30 bg-accent/[0.04] px-3 py-2.5"
                  >
                    <div className="text-[13px] font-medium">{i.job_title}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {i.company_name} · {new Date(i.interview_date).toLocaleString()}
                    </div>
                    <div className="mt-2">
                      <JoinMeetingButton
                        interviewDate={i.interview_date}
                        meetingLink={i.meeting_link}
                        status={i.status}
                        hireStatus={i.hire_status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
