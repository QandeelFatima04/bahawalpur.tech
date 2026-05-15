"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { HorizontalBars, TimelineLine } from "@/components/dashboard/Charts";
import { Funnel } from "@/components/dashboard/Funnel";
import { STAGE_COLOR, STAGE_LABEL, bucketByDate, derivePipelineStage } from "@/lib/applicationPipeline";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  ChevronRight,
  Clock,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";

// ---- Filtering layer ----
// All applicants below are filtered CLIENT-SIDE. The backend supports min_score / skill /
// education on /companies/jobs/{id}/applicants but not status / date / completion-%. Mark
// this so future engineers know to push the filter down once a richer endpoint exists.
const MOCK_FILTER_LAYER = true; // eslint-disable-line no-unused-vars

const DATE_RANGES = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

function withinRange(iso, rangeKey) {
  if (rangeKey === "all" || !iso) return true;
  const ts = new Date(iso).getTime();
  const now = Date.now();
  if (rangeKey === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }
  if (rangeKey === "7d") return now - ts <= 7 * 86400 * 1000;
  if (rangeKey === "30d") return now - ts <= 30 * 86400 * 1000;
  return true;
}

function PendingAction({ icon, title, hint, onClick, tone = "default" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-lg border border-black/[0.04] bg-card px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/[0.03]"
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
      <ChevronRight size={14} className="text-muted-foreground group-hover:text-accent" />
    </button>
  );
}

export function CompanyOverviewTab({ onJump, onToast }) {
  const [jobs, setJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [applicantsByJob, setApplicantsByJob] = useState({}); // { jobId: [...rows] }
  const [loading, setLoading] = useState(true);

  // Filter state for the "All applicants" card.
  const [filters, setFilters] = useState({
    jobId: "all",
    dateRange: "all",
    stage: "all",
    minScore: 0,
    skill: "",
    education: "",
    minCompletion: 0,
    search: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const safe = (p) => p.catch(() => null);
    const [j, i] = await Promise.all([
      safe(api("/companies/jobs")),
      safe(api("/companies/interviews")),
    ]);
    const jobsList = Array.isArray(j) ? j : [];
    const interviewsList = Array.isArray(i) ? i : [];
    setJobs(jobsList);
    setInterviews(interviewsList);

    // Pull applicants for the 10 most-recent jobs that have at least one application,
    // sequentially so we don't hammer the API with a burst.
    const target = jobsList
      .slice()
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .filter((job) => (job.applicant_count || 0) > 0)
      .slice(0, 10);
    const map = {};
    for (const job of target) {
      const rows = await safe(api(`/companies/jobs/${job.id}/applicants`));
      map[job.id] = Array.isArray(rows) ? rows : [];
    }
    setApplicantsByJob(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Flatten applicants across jobs and join with interview state for pipeline stage ----
  const flatApplicants = useMemo(() => {
    const interviewKey = (candidateId, jobId) => `${candidateId}:${jobId}`;
    const interviewByPair = new Map();
    for (const it of interviews) {
      interviewByPair.set(interviewKey(it.candidate_id, it.job_id), it);
    }
    const rows = [];
    for (const [jobIdStr, applicants] of Object.entries(applicantsByJob)) {
      const jobId = Number(jobIdStr);
      const job = jobs.find((j) => j.id === jobId);
      for (const a of applicants || []) {
        const it = interviewByPair.get(interviewKey(a.candidate_id, jobId));
        const stage = derivePipelineStage({
          applicationStatus: a.status,
          appliedAt: a.applied_at,
          interviewStatus: it?.status,
          hireStatus: it?.hire_status,
        });
        rows.push({ ...a, jobId, jobTitle: job?.title || `Job #${jobId}`, interview: it, stage });
      }
    }
    return rows;
  }, [applicantsByJob, jobs, interviews]);

  const jobSummary = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => j.status === "active").length;
    const paused = jobs.filter((j) => j.status === "paused").length;
    const closed = jobs.filter((j) => j.status === "inactive").length;
    // "Expiring soon" heuristic: active jobs the company posted >30 days ago.
    const cutoff = Date.now() - 30 * 86400 * 1000;
    const stale = jobs.filter(
      (j) => j.status === "active" && j.created_at && new Date(j.created_at).getTime() < cutoff,
    ).length;
    return { total, active, paused, closed, stale };
  }, [jobs]);

  const candidateMetrics = useMemo(() => {
    const totalApplicants = flatApplicants.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = flatApplicants.filter(
      (a) => a.applied_at && new Date(a.applied_at).getTime() >= today.getTime(),
    ).length;
    const weekAgo = Date.now() - 7 * 86400 * 1000;
    const newThisWeek = flatApplicants.filter(
      (a) => a.applied_at && new Date(a.applied_at).getTime() >= weekAgo,
    ).length;
    const pendingReview = flatApplicants.filter((a) => a.stage === "applied" || a.stage === "under_review").length;
    const interviewRequested = interviews.filter((i) => i.status === "pending").length;
    const interviewScheduled = interviews.filter((i) => i.status === "accepted").length;
    const hired = interviews.filter((i) => i.hire_status === "yes").length;
    return {
      totalApplicants,
      newToday,
      newThisWeek,
      pendingReview,
      interviewRequested,
      interviewScheduled,
      hired,
    };
  }, [flatApplicants, interviews]);

  const candidatesByRole = useMemo(() => {
    const map = new Map();
    for (const j of jobs) {
      if ((j.applicant_count || 0) > 0) {
        map.set(j.title || `Job #${j.id}`, j.applicant_count || 0);
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const applicationsOverTime = useMemo(
    () => bucketByDate(flatApplicants, (r) => r.applied_at, 30),
    [flatApplicants],
  );

  const funnelStages = useMemo(() => {
    const applied = flatApplicants.length;
    const underReview = flatApplicants.filter(
      (a) => a.stage === "applied" || a.stage === "under_review",
    ).length;
    const interviewRequested = interviews.filter((i) => i.status === "pending").length;
    const interviewScheduled = interviews.filter((i) => i.status === "accepted").length;
    const hired = interviews.filter((i) => i.hire_status === "yes").length;
    const rejected =
      interviews.filter((i) => i.hire_status === "no" || i.status === "rejected").length;
    return [
      { key: "applied", label: STAGE_LABEL.applied, count: applied, color: STAGE_COLOR.applied },
      { key: "under_review", label: STAGE_LABEL.under_review, count: underReview, color: STAGE_COLOR.under_review },
      { key: "interview_requested", label: STAGE_LABEL.interview_requested, count: interviewRequested, color: STAGE_COLOR.interview_requested },
      { key: "interview_scheduled", label: STAGE_LABEL.interview_scheduled, count: interviewScheduled, color: STAGE_COLOR.interview_scheduled },
      { key: "hired", label: STAGE_LABEL.hired, count: hired, color: STAGE_COLOR.hired },
      { key: "rejected", label: STAGE_LABEL.rejected, count: rejected, color: STAGE_COLOR.rejected },
    ];
  }, [flatApplicants, interviews]);

  const topCandidates = useMemo(
    () =>
      flatApplicants
        .slice()
        .sort((a, b) => (b.current_total_score || 0) - (a.current_total_score || 0))
        .slice(0, 5),
    [flatApplicants],
  );

  const perJobInsights = useMemo(() => {
    const insights = [];
    for (const job of jobs) {
      const rows = applicantsByJob[job.id] || [];
      if (rows.length === 0) continue;
      const avg = rows.reduce((sum, r) => sum + (r.current_total_score || 0), 0) / rows.length;
      const aboveThreshold = rows.filter(
        (r) => (r.current_total_score || 0) >= (job.apply_threshold || 0),
      ).length;
      insights.push({
        jobId: job.id,
        title: job.title,
        avg: Math.round(avg),
        threshold: Math.round(job.apply_threshold || 0),
        aboveThreshold,
        total: rows.length,
      });
    }
    return insights.sort((a, b) => b.avg - a.avg).slice(0, 5);
  }, [jobs, applicantsByJob]);

  // ---- Pending actions widget ----
  const pendingActions = useMemo(() => {
    const actions = [];
    if (candidateMetrics.pendingReview > 0) {
      actions.push({
        icon: <Users size={16} />,
        tone: "warn",
        title: `${candidateMetrics.pendingReview} candidate${candidateMetrics.pendingReview === 1 ? "" : "s"} need review`,
        hint: "Shortlist or reject to keep your pipeline moving.",
        onClick: () => onJump?.("applicants"),
      });
    }
    if (candidateMetrics.interviewRequested > 0) {
      actions.push({
        icon: <CalendarClock size={16} />,
        title: `${candidateMetrics.interviewRequested} interview request${candidateMetrics.interviewRequested === 1 ? "" : "s"} waiting on candidates`,
        hint: "Candidates haven't accepted or rejected yet.",
        onClick: () => onJump?.("interviews"),
      });
    }
    const next24h = interviews.filter((i) => {
      if (i.status !== "accepted") return false;
      const dt = new Date(i.interview_date).getTime();
      return dt > Date.now() && dt - Date.now() < 24 * 3600 * 1000;
    }).length;
    if (next24h > 0) {
      actions.push({
        icon: <Clock size={16} />,
        tone: "warn",
        title: `${next24h} interview${next24h === 1 ? "" : "s"} scheduled in the next 24h`,
        hint: "Make sure your team is briefed.",
        onClick: () => onJump?.("interviews"),
      });
    }
    if (jobSummary.stale > 0) {
      actions.push({
        icon: <AlertTriangle size={16} />,
        title: `${jobSummary.stale} job${jobSummary.stale === 1 ? "" : "s"} older than 30 days`,
        hint: "Consider refreshing the description or closing if filled.",
        onClick: () => onJump?.("jobs"),
      });
    }
    return actions;
  }, [candidateMetrics, jobSummary, interviews, onJump]);

  // ---- Filtered all-applicants table ----
  const filteredApplicants = useMemo(() => {
    let rows = flatApplicants.slice();
    if (filters.jobId !== "all") rows = rows.filter((r) => r.jobId === Number(filters.jobId));
    rows = rows.filter((r) => withinRange(r.applied_at, filters.dateRange));
    if (filters.stage !== "all") rows = rows.filter((r) => r.stage === filters.stage);
    if (filters.minScore > 0)
      rows = rows.filter((r) => (r.current_total_score || 0) >= filters.minScore);
    if (filters.skill.trim()) {
      const needle = filters.skill.toLowerCase();
      rows = rows.filter((r) => r.skills?.some((s) => s.toLowerCase().includes(needle)));
    }
    if (filters.education.trim()) {
      const needle = filters.education.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.degree || "").toLowerCase().includes(needle) ||
          (r.university || "").toLowerCase().includes(needle),
      );
    }
    if (filters.minCompletion > 0) {
      // Approximate profile completion from the ApplicantRow fields available to us.
      rows = rows.filter((r) => {
        const items = [
          r.university,
          r.degree,
          r.graduation_year,
          (r.skills?.length || 0) >= 3,
          r.linkedin_url || r.github_url,
        ];
        const pct = (items.filter(Boolean).length / items.length) * 100;
        return pct >= filters.minCompletion;
      });
    }
    if (filters.search.trim()) {
      const needle = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.candidate_id).includes(needle) ||
          r.skills?.some((s) => s.toLowerCase().includes(needle)) ||
          (r.degree || "").toLowerCase().includes(needle),
      );
    }
    return rows.slice(0, 50);
  }, [flatApplicants, filters]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
        <div className="h-60 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total job posts"
          value={jobSummary.total}
          hint={`${jobSummary.active} active`}
          icon={<Briefcase size={16} />}
        />
        <KpiCard
          label="Active"
          value={jobSummary.active}
          hint={jobSummary.paused > 0 ? `${jobSummary.paused} paused` : "Accepting applications"}
          tone={jobSummary.active > 0 ? "accent" : "default"}
        />
        <KpiCard
          label="Closed"
          value={jobSummary.closed}
          hint="No longer accepting applicants"
        />
        <KpiCard
          label="Expiring soon"
          value={jobSummary.stale}
          hint={
            jobSummary.stale > 0
              ? `${jobSummary.stale} active job${jobSummary.stale === 1 ? "" : "s"} older than 30 days`
              : "All active jobs are fresh"
          }
          tone={jobSummary.stale > 0 ? "warn" : "default"}
          icon={<AlertTriangle size={16} />}
        />
      </div>

      {/* Candidate metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total applicants"
          value={candidateMetrics.totalApplicants}
          hint={`${candidateMetrics.newToday} new today, ${candidateMetrics.newThisWeek} this week`}
          icon={<Users size={16} />}
        />
        <KpiCard
          label="Pending review"
          value={candidateMetrics.pendingReview}
          hint={
            candidateMetrics.pendingReview > 0
              ? "Shortlist or schedule interviews"
              : "All reviewed"
          }
          tone={candidateMetrics.pendingReview > 0 ? "warn" : "default"}
        />
        <KpiCard
          label="Interviews scheduled"
          value={candidateMetrics.interviewScheduled}
          hint={
            candidateMetrics.interviewRequested > 0
              ? `${candidateMetrics.interviewRequested} pending response`
              : "No pending requests"
          }
          icon={<CalendarClock size={16} />}
          tone={candidateMetrics.interviewScheduled > 0 ? "accent" : "default"}
        />
        <KpiCard
          label="Hired"
          value={candidateMetrics.hired}
          hint="Marked hired after interview"
          tone={candidateMetrics.hired > 0 ? "success" : "default"}
          icon={<UserCheck size={16} />}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Candidates by job role</CardTitle>
            <CardDescription>Where your applicant volume is landing.</CardDescription>
          </CardHeader>
          <CardContent>
            {candidatesByRole.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-[13px] text-muted-foreground">
                No applicants yet.
              </div>
            ) : (
              <HorizontalBars data={candidatesByRole} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications over time</CardTitle>
            <CardDescription>Last 30 days across all jobs.</CardDescription>
          </CardHeader>
          <CardContent>
            {candidateMetrics.totalApplicants === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-[13px] text-muted-foreground">
                Once candidates apply you'll see daily volume here.
              </div>
            ) : (
              <TimelineLine data={applicationsOverTime} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel + pending actions */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Hiring pipeline</CardTitle>
            <CardDescription>
              Funnel from first application to hire. Rejected shown separately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Funnel stages={funnelStages} />
            <p className="mt-4 text-[12px] text-muted-foreground">
              Note: the "Shortlisted" stage isn't exposed by the API yet, so candidates flow
              directly from <em>Under review</em> into <em>Interview requested</em>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending actions</CardTitle>
            <CardDescription>What needs your attention now.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingActions.length === 0 ? (
              <div className="rounded-lg bg-success/[0.06] p-4 text-[14px] text-success ring-1 ring-success/20">
                You're caught up — nothing pending.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingActions.map((a, idx) => (
                  <PendingAction key={idx} {...a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranked candidates + per-job insights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top candidates by match score</CardTitle>
            <CardDescription>Across all your open roles.</CardDescription>
          </CardHeader>
          <CardContent>
            {topCandidates.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">No applicants yet.</div>
            ) : (
              <ul className="space-y-2">
                {topCandidates.map((c) => (
                  <li
                    key={`${c.candidate_id}-${c.jobId}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.04] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium">Candidate #{c.candidate_id}</div>
                      <div className="truncate text-[12px] text-muted-foreground">
                        {c.degree || "—"} · {c.jobTitle}
                      </div>
                    </div>
                    <Badge variant={c.current_total_score >= 75 ? "success" : c.current_total_score >= 50 ? "accent" : "warn"}>
                      <Trophy size={11} className="mr-1" />
                      {Math.round(c.current_total_score || 0)}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per-role match quality</CardTitle>
            <CardDescription>Avg score and threshold crossing.</CardDescription>
          </CardHeader>
          <CardContent>
            {perJobInsights.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">
                No applicants yet — once people apply you'll see per-role insights.
              </div>
            ) : (
              <ul className="space-y-2">
                {perJobInsights.map((j) => (
                  <li key={j.jobId} className="rounded-lg border border-black/[0.04] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[14px] font-medium">{j.title}</div>
                      <Badge variant={j.avg >= 75 ? "success" : j.avg >= 50 ? "accent" : "warn"}>
                        avg {j.avg}%
                      </Badge>
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {j.aboveThreshold} of {j.total} crossed your threshold ({j.threshold}%).
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All applicants with client-side filters */}
      <Card>
        <CardHeader>
          <CardTitle>All applicants</CardTitle>
          <CardDescription>
            Filter across every open role. Filters are applied in your browser for now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Job</Label>
              <Select
                value={filters.jobId}
                onChange={(e) => setFilters((f) => ({ ...f, jobId: e.target.value }))}
              >
                <option value="all">All jobs</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date range</Label>
              <Select
                value={filters.dateRange}
                onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value }))}
              >
                {DATE_RANGES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Pipeline stage</Label>
              <Select
                value={filters.stage}
                onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}
              >
                <option value="all">All stages</option>
                <option value="applied">Applied</option>
                <option value="under_review">Under review</option>
                <option value="interview_requested">Interview requested</option>
                <option value="interview_scheduled">Interview scheduled</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div>
              <Label>Search</Label>
              <Input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Candidate ID, skill, degree…"
              />
            </div>
            <div>
              <Label>Min match score ({filters.minScore}%)</Label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={filters.minScore}
                onChange={(e) => setFilters((f) => ({ ...f, minScore: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <Label>Skill contains</Label>
              <Input
                value={filters.skill}
                onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value }))}
                placeholder="e.g. Python"
              />
            </div>
            <div>
              <Label>Education contains</Label>
              <Input
                value={filters.education}
                onChange={(e) => setFilters((f) => ({ ...f, education: e.target.value }))}
                placeholder="e.g. BSCS"
              />
            </div>
            <div>
              <Label>Min profile completion ({filters.minCompletion}%)</Label>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={filters.minCompletion}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, minCompletion: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <THead>
                <Tr>
                  <Th>Candidate</Th>
                  <Th>Job</Th>
                  <Th>Stage</Th>
                  <Th>Match</Th>
                  <Th>Applied</Th>
                  <Th>Education</Th>
                </Tr>
              </THead>
              <TBody>
                {filteredApplicants.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No applicants match these filters.
                    </Td>
                  </Tr>
                ) : (
                  filteredApplicants.map((r) => (
                    <Tr key={`${r.candidate_id}-${r.jobId}`}>
                      <Td>#{r.candidate_id}</Td>
                      <Td className="text-[12px]">{r.jobTitle}</Td>
                      <Td>
                        <Badge variant="accent" className="capitalize">
                          {STAGE_LABEL[r.stage] || r.stage}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge
                          variant={
                            (r.current_total_score || 0) >= 75
                              ? "success"
                              : (r.current_total_score || 0) >= 50
                              ? "accent"
                              : "warn"
                          }
                        >
                          {Math.round(r.current_total_score || 0)}%
                        </Badge>
                      </Td>
                      <Td className="text-[12px] text-muted-foreground">
                        {r.applied_at ? new Date(r.applied_at).toLocaleDateString() : "—"}
                      </Td>
                      <Td className="text-[12px]">{r.degree || "—"}</Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
