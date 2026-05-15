"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { HeroStatement } from "@/components/dashboard/HeroStatement";
import { NextActionCard } from "@/components/dashboard/NextActionCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { RingProgress } from "@/components/dashboard/charts";
import { JoinMeetingButton } from "@/components/JoinMeetingButton";
import {
  STAGES,
  STAGE_LABEL,
  derivePipelineStage,
} from "@/lib/applicationPipeline";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  FileText,
  Lightbulb,
  Send,
  Sparkles,
  Target,
  Upload,
  XCircle,
} from "lucide-react";

const PROFILE_ITEMS = [
  { key: "resume", label: "CV parsed", test: (p) => Boolean(p?.skills?.length || p?.summary), tab: "resume" },
  { key: "summary", label: "Summary written", test: (p) => Boolean(p?.summary), tab: "profile" },
  { key: "skills", label: "5+ skills listed", test: (p) => (p?.skills?.length || 0) >= 5, tab: "profile" },
  { key: "education", label: "Education filled", test: (p) => Boolean(p?.university && p?.degree), tab: "profile" },
  { key: "projects", label: "1+ project", test: (p) => (p?.projects?.length || 0) >= 1, tab: "profile" },
  { key: "links", label: "LinkedIn / GitHub", test: (p) => Boolean(p?.linkedin_url || p?.github_url || p?.portfolio_url), tab: "profile" },
];

function computeProfileCompletion(profile) {
  const items = PROFILE_ITEMS.map((it) => ({ ...it, done: it.test(profile) }));
  const done = items.filter((it) => it.done).length;
  const percent = Math.round((done / items.length) * 100);
  return { items, done, total: items.length, percent };
}

function buildActivity({ pipeline, interviews }) {
  const events = [];
  for (const row of pipeline) {
    if (row.created_at) {
      events.push({
        at: row.created_at,
        text: `Applied to ${row.title || "a role"}`,
        meta: row.company_name,
        icon: Send,
        tone: "accent",
      });
    }
  }
  for (const it of interviews) {
    if (it.status === "pending") {
      events.push({
        at: it.created_at || it.interview_date,
        text: `${it.company_name} wants to interview you`,
        meta: it.job_title,
        icon: CalendarClock,
        tone: "warn",
      });
    } else if (it.status === "accepted") {
      events.push({
        at: it.updated_at || it.created_at,
        text: `Interview accepted with ${it.company_name}`,
        meta: it.job_title,
        icon: CheckCircle2,
        tone: "success",
      });
    } else if (it.status === "rejected") {
      events.push({
        at: it.updated_at || it.created_at,
        text: `Declined interview from ${it.company_name}`,
        meta: it.job_title,
        icon: XCircle,
      });
    }
    if (it.hire_status === "hired") {
      events.push({
        at: it.updated_at,
        text: `Hired by ${it.company_name}`,
        meta: it.job_title,
        icon: CheckCircle2,
        tone: "success",
      });
    }
  }
  return events
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6);
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
          ? "Accepted. Meeting link is in both inboxes."
          : "Declined. The company has been notified.",
      );
    } catch (err) {
      setInterviews((prev) => prev.map((r) => (r.id === interview.id ? { ...r, status: original } : r)));
      onToast?.(err.message || "Could not update interview");
    }
  };

  const completion = useMemo(() => computeProfileCompletion(profile), [profile]);

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
      return { ...a, stage, interview: it };
    });
  }, [applications, interviews]);

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
    for (const row of pipeline) counts[row.stage] = (counts[row.stage] || 0) + 1;
    return counts;
  }, [pipeline]);

  const totalApps = pipeline.length;

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

  const inFlight =
    stageCounts.under_review +
    stageCounts.shortlisted +
    stageCounts.interview_requested +
    stageCounts.interview_scheduled;

  const interviewsThisWeek = useMemo(() => {
    const now = new Date();
    const inWeek = new Date(now.getTime() + 7 * 86400000);
    return interviews.filter(
      (i) =>
        i.status === "accepted" &&
        new Date(i.interview_date) > now &&
        new Date(i.interview_date) <= inWeek,
    ).length;
  }, [interviews]);

  const activity = useMemo(
    () => buildActivity({ pipeline, interviews }),
    [pipeline, interviews],
  );

  const heroTokens = useMemo(() => {
    const tokens = [];
    if (eligibleJobs.length > 0) {
      tokens.push({ type: "text", value: "You've got " });
      tokens.push({
        type: "number",
        value: eligibleJobs.length,
        suffix: ` ${eligibleJobs.length === 1 ? "door" : "doors"} open`,
        onClick: () => onJump?.("jobs"),
      });
    } else if (totalApps > 0) {
      tokens.push({ type: "text", value: "You have " });
      tokens.push({
        type: "number",
        value: inFlight,
        suffix: ` ${inFlight === 1 ? "CV" : "CVs"} in play`,
        onClick: () => onJump?.("applications"),
      });
    } else {
      tokens.push({ type: "text", value: "No CVs in flight yet — " });
      tokens.push({
        type: "number",
        value: jobs.length,
        suffix: ` roles waiting to be scored`,
        onClick: () => onJump?.("jobs"),
      });
    }

    if (pendingInterviews.length > 0) {
      tokens.push({ type: "text", value: ", " });
      tokens.push({
        type: "number",
        value: pendingInterviews.length,
        suffix: ` ${pendingInterviews.length === 1 ? "company" : "companies"} waiting on you`,
        onClick: () => onJump?.("interviews"),
      });
    } else if (interviewsThisWeek > 0) {
      tokens.push({ type: "text", value: ", " });
      tokens.push({
        type: "number",
        value: interviewsThisWeek,
        suffix: ` ${interviewsThisWeek === 1 ? "interview" : "interviews"} this week`,
        onClick: () => onJump?.("interviews"),
      });
    }

    tokens.push({ type: "text", value: ", profile is " });
    tokens.push({
      type: "number",
      value: completion.percent,
      suffix: "% ready",
      onClick: () => onJump?.("profile"),
    });
    tokens.push({ type: "text", value: "." });
    return tokens;
  }, [
    eligibleJobs.length,
    totalApps,
    inFlight,
    jobs.length,
    pendingInterviews.length,
    interviewsThisWeek,
    completion.percent,
    onJump,
  ]);

  const nextActions = useMemo(() => {
    const actions = [];
    if (pendingInterviews.length > 0) {
      actions.push({
        icon: CalendarClock,
        tone: "warn",
        title: `${pendingInterviews.length} ${pendingInterviews.length === 1 ? "company" : "companies"} waiting on your answer`,
        hint: "They sent an interview request. Accept or decline so they can plan.",
        cta: "Open requests",
        onClick: () => onJump?.("interviews"),
      });
    }
    if (!profile?.visibility_flag) {
      actions.push({
        icon: Activity,
        title: "Turn on visibility — companies can't find you yet",
        hint: "Off means zero matches sent to recruiters. One toggle fixes it.",
        cta: "Turn on",
        onClick: () => onJump?.("profile"),
      });
    }
    if (!completion.items[0].done) {
      actions.push({
        icon: Upload,
        tone: "warn",
        title: "Drop your CV. AI does the rest in 15 to 30 seconds",
        hint: "Profile, scores, and ranked jobs — all built from one PDF.",
        cta: "Drop CV",
        onClick: () => onJump?.("resume"),
      });
    }
    if ((profile?.skills?.length || 0) < 5 && (profile?.skills?.length || 0) > 0) {
      actions.push({
        icon: Sparkles,
        title: `Add ${5 - profile.skills.length} more skill${5 - profile.skills.length === 1 ? "" : "s"} — match scores go up immediately`,
        hint: "Skills carry the most weight in your match score.",
        cta: "Edit profile",
        onClick: () => onJump?.("profile"),
      });
    }
    if (eligibleJobs.length > 0 && totalApps < 3) {
      actions.push({
        icon: Target,
        tone: "warn",
        title: `Apply to ${Math.min(eligibleJobs.length, 3)} role${eligibleJobs.length === 1 ? "" : "s"} where you already cleared the bar`,
        hint: `${eligibleJobs.length} ${eligibleJobs.length === 1 ? "company says" : "companies say"} you fit. Don't leave them sitting.`,
        cta: "See matches",
        onClick: () => onJump?.("jobs"),
      });
    }
    if (!completion.items.find((i) => i.key === "links")?.done) {
      actions.push({
        icon: Lightbulb,
        title: "Add a LinkedIn or GitHub link",
        hint: "Recruiters click through. Empty link is a missed signal.",
        cta: "Add link",
        onClick: () => onJump?.("profile"),
      });
    }
    return actions;
  }, [
    profile,
    completion.items,
    eligibleJobs.length,
    totalApps,
    pendingInterviews.length,
    onJump,
  ]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-xl bg-muted/40" />
        <div className="grid gap-4 lg:grid-cols-[5fr_3fr]">
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="pb-2">
        <HeroStatement tokens={heroTokens} />
      </section>

      {/* Next action + activity */}
      <section className="grid gap-5 lg:grid-cols-[5fr_3fr]">
        <NextActionCard
          actions={nextActions}
          emptyState={{
            title: "You're caught up.",
            hint: "Nothing needs your attention right now. New roles drop into Jobs as companies post them.",
          }}
        />
        <ActivityFeed
          title="Lately"
          items={activity}
          emptyState="Apply to a role and your timeline starts here."
        />
      </section>

      {/* Pending interviews — surface if any */}
      {(pendingInterviews.length > 0 || upcomingInterviews.length > 0) && (
        <section>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            On the calendar
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingInterviews.map((i) => (
              <div
                key={i.id}
                className="rounded-xl bg-warn-tint p-5 ring-1 ring-warn/25 transition-shadow hover:shadow-card"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-warn">
                  Waiting on you
                </div>
                <div className="mt-1 text-[15px] font-semibold leading-[1.3]">
                  {i.job_title}
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  {i.company_name} · {new Date(i.interview_date).toLocaleString()}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="success" onClick={() => decideInterview(i, "accept")}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => decideInterview(i, "reject")}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
            {upcomingInterviews.map((i) => (
              <div
                key={i.id}
                className="rounded-xl bg-accent-tint p-5 ring-1 ring-accent/20 transition-shadow hover:shadow-card"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
                  Coming up
                </div>
                <div className="mt-1 text-[15px] font-semibold leading-[1.3]">
                  {i.job_title}
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  {i.company_name} · {new Date(i.interview_date).toLocaleString()}
                </div>
                <div className="mt-3">
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
        </section>
      )}

      {/* Profile readiness — compact */}
      {completion.percent < 100 && (
        <section className="rounded-xl bg-card p-6 ring-1 ring-black/[0.04]">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="text-accent">
              <RingProgress value={completion.percent} size={84} stroke={8} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[18px] font-semibold leading-[1.2] tracking-[-0.01em]">
                How findable you are
              </h3>
              <p className="mt-1 text-[14px] leading-[1.45] text-muted-foreground">
                Each box you tick lifts your match scores. Aim for 100%.
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {completion.items.map((it) => (
                  <li
                    key={it.key}
                    className={`flex items-center gap-1.5 text-[13px] ${
                      it.done ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {it.done ? (
                      <CheckCircle2 size={13} className="text-success" />
                    ) : (
                      <XCircle size={13} className="text-muted-foreground" />
                    )}
                    <span>{it.label}</span>
                    {!it.done && (
                      <button
                        type="button"
                        className="ml-1 text-[12px] font-medium text-accent transition-opacity hover:opacity-80"
                        onClick={() => onJump?.(it.tab)}
                      >
                        Fix →
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Footer drill-down */}
      <section className="flex items-center justify-between rounded-xl bg-[rgba(0,0,0,0.02)] px-5 py-4">
        <div>
          <div className="text-[13px] font-medium text-foreground">Want the numbers behind this?</div>
          <div className="text-[12px] text-muted-foreground">
            Application funnel, match patterns, skill gaps — all on Insights.
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onJump?.("insights")}>
          Open Insights →
        </Button>
      </section>
    </div>
  );
}
