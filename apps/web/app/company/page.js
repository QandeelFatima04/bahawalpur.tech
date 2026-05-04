"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { friendlyError } from "@/lib/friendlyError";
import { useTabState } from "@/lib/useTabState";
import { RequireRole } from "@/components/RequireRole";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { SkeletonTable } from "@/components/ui/skeleton";
import { JoinMeetingButton } from "@/components/JoinMeetingButton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

function ScoreBadge({ score }) {
  const variant = score >= 75 ? "success" : score >= 50 ? "accent" : "warn";
  return <Badge variant={variant}>{Number(score).toFixed(0)}%</Badge>;
}

function ProfileLinks({ row }) {
  const items = [
    { label: "LinkedIn", url: row.linkedin_url },
    { label: "GitHub", url: row.github_url },
    { label: "LeetCode", url: row.leetcode_url },
    { label: "HackerRank", url: row.hackerrank_url },
  ].filter((i) => i.url);
  if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <a
          key={i.label}
          href={i.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent underline hover:no-underline"
        >
          {i.label}
        </a>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: "warn",
    accepted: "success",
    rejected: "destructive",
    completed: "accent",
    cancelled: "default",
  };
  return <Badge variant={map[status] || "default"}>{status}</Badge>;
}

function ChipInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <Badge key={t} variant="accent" className="gap-1">
            {t}
            <button className="ml-1 text-accent/70 hover:text-accent" onClick={() => onChange(value.filter((v) => v !== t))}>
              ×
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function JobForm({ initial, onSubmit, onCancel, onToast }) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    required_skills: initial?.required_skills || [],
    experience_level: initial?.experience_level || "entry",
    education_requirement: initial?.education_requirement || "Bachelor's in CS or related",
    location: initial?.location || "",
    description: initial?.description || "",
    apply_threshold: initial?.apply_threshold ?? 60,
    hiring_limit: initial?.hiring_limit ?? "",
    status: initial?.status || "active",
    extra: initial?.extra || null,
  });
  const [roleDraft, setRoleDraft] = useState("");
  const [generating, setGenerating] = useState(false);

  // Compose a Markdown description from the AI draft so the Description textarea remains
  // human-editable. The structured fields stay in `extra` for filtering / future UI.
  const composeDescription = (draft) => {
    const lines = [];
    if (draft.job_summary) lines.push(draft.job_summary, "");
    if (draft.key_responsibilities?.length) {
      lines.push("**Responsibilities**");
      draft.key_responsibilities.forEach((r) => lines.push(`- ${r}`));
      lines.push("");
    }
    if (draft.preferred_skills?.length) {
      lines.push("**Preferred skills**");
      lines.push(draft.preferred_skills.join(", "));
      lines.push("");
    }
    if (draft.benefits?.length) {
      lines.push("**Benefits**");
      draft.benefits.forEach((b) => lines.push(`- ${b}`));
      lines.push("");
    }
    if (draft.career_growth_path) {
      lines.push("**Career growth**");
      lines.push(draft.career_growth_path);
      lines.push("");
    }
    if (draft.interview_process?.length) {
      lines.push("**Interview process**");
      draft.interview_process.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    }
    return lines.join("\n").trim();
  };

  const generate = async () => {
    const role = roleDraft.trim();
    if (!role) {
      onToast?.("Enter a job role name first (e.g. 'Software Engineer').");
      return;
    }
    setGenerating(true);
    try {
      const draft = await api("/companies/jobs/generate", {
        method: "POST",
        body: JSON.stringify({ role_name: role }),
      });
      setForm((f) => ({
        ...f,
        title: draft.title || f.title,
        required_skills: draft.required_skills || [],
        experience_level: draft.experience_level || f.experience_level,
        education_requirement: draft.education_requirement || f.education_requirement,
        location: draft.location || f.location,
        description: composeDescription(draft),
        extra: {
          job_summary: draft.job_summary,
          key_responsibilities: draft.key_responsibilities,
          preferred_skills: draft.preferred_skills,
          required_experience_years: draft.required_experience_years,
          employment_type: draft.employment_type,
          work_mode: draft.work_mode,
          salary_range: draft.salary_range,
          benefits: draft.benefits,
          career_growth_path: draft.career_growth_path,
          department: draft.department,
          seniority_level: draft.seniority_level,
          interview_process: draft.interview_process,
          tags: draft.tags,
        },
      }));
      onToast?.(
        draft.used_fallback
          ? "AI is unavailable — drafted a starter template. Edit before saving."
          : "Drafted with AI. Review and edit before saving."
      );
    } catch (err) {
      onToast?.(friendlyError(err));
    } finally {
      setGenerating(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    const parsedLimit = form.hiring_limit === "" ? null : Math.max(0, Math.floor(Number(form.hiring_limit)));
    const body = {
      ...form,
      apply_threshold: Number(form.apply_threshold),
      // On create, null means "no limit". On edit, send 0 to clear a previously-set limit.
      hiring_limit: parsedLimit === null ? (initial ? 0 : null) : parsedLimit,
    };
    if (!initial) delete body.status;  // server defaults new jobs to active
    onSubmit(body);
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="rounded-md border border-dashed border-accent/40 bg-accent/5 p-3">
        <Label className="flex items-center gap-2">
          <span>Draft with AI</span>
          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
            Beta
          </span>
        </Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Enter a role name and we'll pre-fill every field. You can edit anything before saving.
        </p>
        <div className="flex gap-2">
          <Input
            value={roleDraft}
            onChange={(e) => setRoleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!generating) generate();
              }
            }}
            placeholder="e.g. Software Engineer, UI/UX Designer, Data Analyst"
            maxLength={100}
            disabled={generating}
          />
          <Button type="button" onClick={generate} disabled={generating || !roleDraft.trim()}>
            {generating ? "Drafting…" : form.title ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>
      <div>
        <Label>Job title</Label>
        <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Experience level</Label>
          <Input value={form.experience_level} onChange={(e) => setForm((f) => ({ ...f, experience_level: e.target.value }))} />
        </div>
        <div>
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label>Education requirement</Label>
        <Input value={form.education_requirement} onChange={(e) => setForm((f) => ({ ...f, education_requirement: e.target.value }))} />
      </div>
      <div>
        <Label>Required skills</Label>
        <ChipInput value={form.required_skills} onChange={(skills) => setForm((f) => ({ ...f, required_skills: skills }))} placeholder="e.g. Python" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea rows={5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div>
        <Label>Minimum match score to apply ({Number(form.apply_threshold).toFixed(0)}%)</Label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={form.apply_threshold}
          onChange={(e) => setForm((f) => ({ ...f, apply_threshold: e.target.value }))}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Students below this match score cannot apply. Default is 60%.
        </p>
      </div>
      <div>
        <Label>No. of open positions (optional)</Label>
        <Input
          type="number"
          min={1}
          placeholder="Leave blank for unlimited"
          value={form.hiring_limit}
          onChange={(e) => setForm((f) => ({ ...f, hiring_limit: e.target.value }))}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          How many people you plan to hire for this role. The job auto-closes once this many hires are marked Yes.
        </p>
      </div>
      {initial && (
        <div>
          <Label>Status</Label>
          <select
            className="input-base"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="active">Active — accepting applications</option>
            <option value="paused">Paused — temporarily on hold</option>
            <option value="inactive">Inactive — closed</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Pause to stop new applicants without closing the role; set Inactive to fully close it.
          </p>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? "Save changes" : "Create job"}</Button>
      </DialogFooter>
    </form>
  );
}

function JobsTab({ onToast }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await api("/companies/jobs"));
    } catch (err) {
      onToast(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const create = async (form) => {
    try {
      await api("/companies/jobs", { method: "POST", body: JSON.stringify(form) });
      onToast("Job created");
      setCreating(false);
      load();
    } catch (err) {
      onToast(friendlyError(err));
    }
  };

  const save = async (form) => {
    try {
      await api(`/companies/jobs/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
      onToast("Job updated");
      setEditing(null);
      load();
    } catch (err) {
      onToast(friendlyError(err));
    }
  };

  const setStatus = async (job, next) => {
    try {
      await api(`/companies/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      load();
    } catch (err) {
      onToast(friendlyError(err));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/companies/jobs/${deleting.id}`, { method: "DELETE" });
      onToast(`Deleted "${deleting.title}"`);
      setDeleting(null);
      load();
    } catch (err) {
      onToast(friendlyError(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Your jobs</CardTitle>
          <CardDescription>Post roles, tune the apply threshold, and open/close listings.</CardDescription>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button>New job</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post a new job</DialogTitle>
            </DialogHeader>
            <JobForm onSubmit={create} onCancel={() => setCreating(false)} onToast={onToast} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-3 inline-flex rounded-md border border-border bg-muted p-1 text-sm">
          {[
            { key: "all", label: `All (${jobs.length})` },
            { key: "active", label: `Active (${jobs.filter((j) => j.status === "active").length})` },
            { key: "paused", label: `Paused (${jobs.filter((j) => j.status === "paused").length})` },
            { key: "inactive", label: `Inactive (${jobs.filter((j) => j.status === "inactive").length})` },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={`rounded-sm px-3 py-1 font-medium transition-colors ${
                filter === opt.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {loading ? (
          <SkeletonTable rows={4} cols={7} />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Title</Th>
                <Th>Location</Th>
                <Th>Threshold</Th>
                <Th>Applicants</Th>
                <Th>Hires</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {jobs
                .filter((j) => filter === "all" || j.status === filter)
                .map((j) => {
                const limitReached = j.hiring_limit != null && j.hires_count >= j.hiring_limit;
                const statusVariant =
                  j.status === "active" ? "success" : j.status === "paused" ? "warn" : "default";
                const statusLabel =
                  j.status === "active" ? "Active" :
                  j.status === "paused" ? "Paused" :
                  limitReached ? "Filled" : "Inactive";
                return (
                  <Tr key={j.id}>
                    <Td>
                      <div className="font-medium">{j.title}</div>
                      <div className="text-xs text-muted-foreground">{j.required_skills.join(" · ")}</div>
                    </Td>
                    <Td>{j.location}</Td>
                    <Td>{j.apply_threshold.toFixed(0)}%</Td>
                    <Td>{j.applicant_count}</Td>
                    <Td>
                      {j.hiring_limit != null ? (
                        <Badge variant={limitReached ? "success" : "accent"}>
                          {j.hires_count} / {j.hiring_limit}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{j.hires_count} hired</span>
                      )}
                    </Td>
                    <Td>
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(j)}>Edit</Button>
                        {j.status === "active" ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(j, "paused")}>Pause</Button>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(j, "inactive")}>Close</Button>
                          </>
                        ) : j.status === "paused" ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(j, "active")}>Resume</Button>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(j, "inactive")}>Close</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setStatus(j, "active")}>Reopen</Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => setDeleting(j)}>Delete</Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
              {jobs.filter((j) => filter === "all" || j.status === filter).length === 0 && (
                <Tr>
                  <Td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    {jobs.length === 0
                      ? "No jobs yet."
                      : filter === "active"
                      ? "No active jobs right now."
                      : filter === "paused"
                      ? "No paused jobs."
                      : filter === "inactive"
                      ? "No inactive jobs."
                      : "No jobs match this filter."}
                  </Td>
                </Tr>
              )}
            </TBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit job</DialogTitle>
          </DialogHeader>
          {editing && <JobForm initial={editing} onSubmit={save} onCancel={() => setEditing(null)} onToast={onToast} />}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(deleting)} onOpenChange={(v) => !v && !deleteBusy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this job role?</DialogTitle>
          </DialogHeader>
          {deleting && (
            <div className="space-y-3 text-sm">
              <p>
                You&apos;re about to permanently delete <strong>{deleting.title}</strong>.
              </p>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                <div className="font-medium">This will also remove:</div>
                <ul className="ml-4 mt-1 list-disc">
                  <li>{deleting.applicant_count} application{deleting.applicant_count === 1 ? "" : "s"}</li>
                  <li>{deleting.hires_count} recorded hire{deleting.hires_count === 1 ? "" : "s"} and their interviews</li>
                  <li>All match scores and shortlists for this role</li>
                </ul>
              </div>
              <p className="text-muted-foreground">
                Prefer to keep history? Use <strong>Close</strong> or <strong>Pause</strong> instead.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ApplicantsTab({ onToast }) {
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ min_score: "", skill: "", education: "" });
  const [interviewFor, setInterviewFor] = useState(null);
  const [interviewDate, setInterviewDate] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/companies/jobs");
        setJobs(data);
        if (data.length > 0 && !jobId) setJobId(String(data[0].id));
      } catch (err) {
        onToast(friendlyError(err));
      }
    })();
  }, []); // eslint-disable-line

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filters.min_score) q.set("min_score", filters.min_score);
      if (filters.skill) q.set("skill", filters.skill);
      if (filters.education) q.set("education", filters.education);
      const path = `/companies/jobs/${jobId}/applicants${q.toString() ? `?${q.toString()}` : ""}`;
      setRows(await api(path));
    } catch (err) {
      onToast(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [jobId, filters, onToast]);

  useEffect(() => { load(); }, [load]);

  const shortlist = async (row, statusVal) => {
    try {
      await api("/companies/shortlists", {
        method: "POST",
        body: JSON.stringify({ candidate_id: row.candidate_id, job_id: Number(jobId), status: statusVal }),
      });
      onToast(`Candidate ${statusVal}`);
    } catch (err) {
      onToast(friendlyError(err));
    }
  };

  const sendInterview = async () => {
    if (!interviewFor || !interviewDate) return;
    try {
      await api("/companies/interviews", {
        method: "POST",
        body: JSON.stringify({
          candidate_id: interviewFor.candidate_id,
          job_id: Number(jobId),
          interview_date: new Date(interviewDate).toISOString(),
        }),
      });
      onToast("Interview request sent");
      setInterviewFor(null);
      setInterviewDate("");
    } catch (err) {
      onToast(friendlyError(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applicants</CardTitle>
        <CardDescription>Only candidates who applied. Filters narrow the list.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <div>
            <Label>Job</Label>
            <select className="input-base" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div>
            <Label>Min score</Label>
            <Input type="number" value={filters.min_score} onChange={(e) => setFilters((f) => ({ ...f, min_score: e.target.value }))} />
          </div>
          <div>
            <Label>Skill contains</Label>
            <Input value={filters.skill} onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value }))} />
          </div>
          <div>
            <Label>Education contains</Label>
            <Input value={filters.education} onChange={(e) => setFilters((f) => ({ ...f, education: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={load}>Apply filters</Button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <SkeletonTable rows={4} cols={7} />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Candidate</Th>
                  <Th>Education</Th>
                  <Th>Experience</Th>
                  <Th>Skills</Th>
                  <Th>Profiles</Th>
                  <Th>Score</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <Tr key={r.application_id}>
                    <Td>#{r.candidate_id}</Td>
                    <Td>
                      <div>{r.degree || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.university || ""}</div>
                    </Td>
                    <Td>{r.experience_years} yrs</Td>
                    <Td className="max-w-[200px] text-xs text-muted-foreground">{r.skills.join(", ")}</Td>
                    <Td><ProfileLinks row={r} /></Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <ScoreBadge score={r.current_total_score} />
                        <span className="text-xs text-muted-foreground">
                          at apply: {r.match_score_at_apply.toFixed(0)}%
                        </span>
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="success" onClick={() => shortlist(r, "shortlisted")}>Shortlist</Button>
                        <Button size="sm" variant="ghost" onClick={() => shortlist(r, "rejected")}>Reject</Button>
                        <Button size="sm" onClick={() => setInterviewFor(r)}>Interview</Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {rows.length === 0 && (
                  <Tr><Td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">No applicants match the filters.</Td></Tr>
                )}
              </TBody>
            </Table>
          )}
        </div>
      </CardContent>

      <Dialog open={Boolean(interviewFor)} onOpenChange={(v) => !v && setInterviewFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send interview request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Candidate #{interviewFor?.candidate_id} · job <strong>{jobs.find((j) => String(j.id) === jobId)?.title}</strong>
            </div>
            <div>
              <Label>Interview date & time</Label>
              <Input
                type="datetime-local"
                min={nowForPicker()}
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewFor(null)}>Cancel</Button>
            <Button onClick={sendInterview} disabled={!interviewDate}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function nowForPicker() {
  // Min-attribute for <input type="datetime-local"> — local time in the YYYY-MM-DDTHH:mm shape.
  const d = new Date();
  const tzoff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzoff).toISOString().slice(0, 16);
}

function InterviewsTab({ onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api("/companies/interviews"));
    } catch (err) {
      onToast(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const openReschedule = (interview) => {
    setRescheduling(interview);
    // Pre-fill with the current interview date (converted to local for the picker)
    const dt = new Date(interview.interview_date);
    const off = dt.getTimezoneOffset();
    const local = new Date(dt.getTime() - off * 60000);
    setRescheduleDate(local.toISOString().slice(0, 16));
  };

  const submitReschedule = async () => {
    if (!rescheduling || !rescheduleDate) return;
    setRescheduleBusy(true);
    try {
      const updated = await api(`/companies/interviews/${rescheduling.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          candidate_id: rescheduling.candidate_id,
          job_id: rescheduling.job_id,
          interview_date: new Date(rescheduleDate).toISOString(),
        }),
      });
      setRows((prev) => prev.map((r) => (r.id === rescheduling.id ? { ...r, ...updated } : r)));
      onToast("Interview rescheduled — the candidate has been notified by email");
      setRescheduling(null);
      setRescheduleDate("");
    } catch (err) {
      onToast(friendlyError(err));
    } finally {
      setRescheduleBusy(false);
    }
  };

  const hire = async (interview, hired) => {
    // Optimistic: flip state to completed + hire_status immediately
    setRows((prev) =>
      prev.map((r) =>
        r.id === interview.id ? { ...r, status: "completed", hire_status: hired ? "yes" : "no" } : r
      )
    );
    try {
      await api(`/companies/interviews/${interview.id}/hire`, {
        method: "POST",
        body: JSON.stringify({ hired }),
      });
      onToast(`Marked ${hired ? "hired" : "not hired"}`);
    } catch (err) {
      // Roll back on error
      setRows((prev) =>
        prev.map((r) =>
          r.id === interview.id ? { ...r, status: interview.status, hire_status: interview.hire_status } : r
        )
      );
      onToast(friendlyError(err));
    }
  };

  const now = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview requests</CardTitle>
        <CardDescription>Hire Yes/No becomes available on or after the interview date.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Candidate</Th>
                <Th>Role</Th>
                <Th>Interview date</Th>
                <Th>Status</Th>
                <Th>Meeting</Th>
                <Th>Hire decision</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((i) => {
                const interviewDate = new Date(i.interview_date);
                const canDecide = i.status === "accepted" && now >= interviewDate;
                return (
                  <Tr key={i.id}>
                    <Td>#{i.candidate_id}</Td>
                    <Td>{i.job_title}</Td>
                    <Td className="text-xs">{interviewDate.toLocaleString()}</Td>
                    <Td><StatusBadge status={i.status} /></Td>
                    <Td>
                      {["accepted", "completed"].includes(i.status) ? (
                        <JoinMeetingButton
                          interviewDate={i.interview_date}
                          meetingLink={i.meeting_link}
                          status={i.status}
                          hireStatus={i.hire_status}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td>
                      {i.hire_status ? (
                        <Badge variant={i.hire_status === "yes" ? "success" : "destructive"}>
                          {i.hire_status === "yes" ? "Hired" : "Not hired"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canDecide && (
                          <>
                            <Button size="sm" variant="success" onClick={() => hire(i, true)}>
                              <CheckCircle2 size={14} /> Hired
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => hire(i, false)}>
                              <XCircle size={14} /> Not hired
                            </Button>
                          </>
                        )}
                        {["pending", "accepted"].includes(i.status) && (
                          <Button size="sm" variant="outline" onClick={() => openReschedule(i)}>
                            Reschedule
                          </Button>
                        )}
                        {!canDecide && !["pending", "accepted"].includes(i.status) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {!canDecide && i.status === "accepted" && (
                          <span className="self-center text-xs text-muted-foreground">
                            Hire Yes/No opens on interview day
                          </span>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
              {rows.length === 0 && (
                <Tr><Td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">No interviews yet.</Td></Tr>
              )}
            </TBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={Boolean(rescheduling)} onOpenChange={(v) => !v && !rescheduleBusy && setRescheduling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule interview</DialogTitle>
          </DialogHeader>
          {rescheduling && (
            <div className="space-y-3 text-sm">
              <div className="text-muted-foreground">
                Candidate #{rescheduling.candidate_id} · <strong>{rescheduling.job_title}</strong>
              </div>
              <div className="text-xs text-muted-foreground">
                Current time: {new Date(rescheduling.interview_date).toLocaleString()}
              </div>
              <div>
                <Label>New interview date & time</Label>
                <Input
                  type="datetime-local"
                  min={nowForPicker()}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              {rescheduling.status === "accepted" && (
                <p className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-900">
                  The candidate had already accepted. They&apos;ll need to re-accept the new time.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduling(null)} disabled={rescheduleBusy}>
              Cancel
            </Button>
            <Button onClick={submitReschedule} disabled={!rescheduleDate || rescheduleBusy}>
              {rescheduleBusy ? "Sending..." : "Send new time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Toast({ message, onClear }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClear, 3500);
    return () => clearTimeout(t);
  }, [message, onClear]);
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-md bg-foreground px-4 py-2 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}

function StatusBanner({ me }) {
  if (!me) return null;
  if (me.is_disabled) {
    return (
      <Card className="mb-4 border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 pt-4 text-sm">
          <AlertTriangle size={20} className="mt-0.5 text-destructive" />
          <div>
            <div className="font-semibold text-destructive">Your company account is disabled</div>
            <p className="text-muted-foreground">
              Contact an administrator to reinstate your account. Jobs you created remain in the system but are no longer active.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (me.status === "pending") {
    return (
      <Card className="mb-4 border-yellow-300 bg-yellow-50">
        <CardContent className="flex items-start gap-3 pt-4 text-sm">
          <Clock size={20} className="mt-0.5 text-yellow-700" />
          <div>
            <div className="font-semibold text-yellow-900">Awaiting admin verification</div>
            <p className="text-yellow-900/80">
              We&apos;re reviewing <strong>{me.name}</strong>. You&apos;ll be able to post jobs, review applicants, and send interview requests once approved — typically within a business day. We&apos;ll email <strong>{me.email}</strong> when you&apos;re verified.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (me.status === "rejected") {
    return (
      <Card className="mb-4 border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 pt-4 text-sm">
          <XCircle size={20} className="mt-0.5 text-destructive" />
          <div>
            <div className="font-semibold text-destructive">Registration rejected</div>
            <p className="text-muted-foreground">
              Your company application was not approved. Please contact an administrator for details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return null;
}

function CompanyDashboard() {
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useTabState("jobs");
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setMe(await api("/companies/me"));
      } catch {
        // ignore — banner just stays hidden
      }
    })();
  }, []);

  return (
    <DashboardShell title="Company dashboard" subtitle="Post jobs, review applicants, and manage interviews.">
      <StatusBanner me={me} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="applicants">Applicants</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs">
          <JobsTab onToast={setToast} />
        </TabsContent>
        <TabsContent value="applicants">
          <ApplicantsTab onToast={setToast} />
        </TabsContent>
        <TabsContent value="interviews">
          <InterviewsTab onToast={setToast} />
        </TabsContent>
      </Tabs>
      <Toast message={toast} onClear={() => setToast(null)} />
    </DashboardShell>
  );
}

export default function Page() {
  return (
    <RequireRole role="company">
      <CompanyDashboard />
    </RequireRole>
  );
}
