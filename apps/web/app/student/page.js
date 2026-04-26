"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, uploadFile } from "@/lib/api";
import { friendlyError } from "@/lib/friendlyError";
import { useTabState } from "@/lib/useTabState";
import { RequireRole } from "@/components/RequireRole";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { SkeletonTable } from "@/components/ui/skeleton";
import { JoinMeetingButton } from "@/components/JoinMeetingButton";
import { Upload, CheckCircle2, XCircle, Clock, Sparkles, Lock, EyeOff, CircleCheck, Circle } from "lucide-react";

function Chips({ items, onRemove, variant = "accent" }) {
  if (!items?.length) return <span className="text-xs text-muted-foreground">None yet</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <Badge key={t} variant={variant} className="gap-1">
          {t}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(t)}
              className="ml-1 text-accent/70 hover:text-accent"
              aria-label={`remove ${t}`}
            >
              ×
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
}

function ChipInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
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
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      <Chips items={value} onRemove={(t) => onChange(value.filter((v) => v !== t))} />
    </div>
  );
}

function ScoreBadge({ score }) {
  const variant = score >= 75 ? "success" : score >= 50 ? "accent" : "warn";
  return <Badge variant={variant}>{score.toFixed(0)}%</Badge>;
}

function StatusBadge({ status }) {
  const map = {
    pending: { variant: "warn", icon: <Clock size={12} /> },
    processing: { variant: "warn", icon: <Clock size={12} /> },
    accepted: { variant: "success", icon: <CheckCircle2 size={12} /> },
    rejected: { variant: "destructive", icon: <XCircle size={12} /> },
    completed: { variant: "success", icon: <CheckCircle2 size={12} /> },
    failed: { variant: "destructive", icon: <XCircle size={12} /> },
    cancelled: { variant: "default", icon: null },
    applied: { variant: "accent", icon: null },
    withdrawn: { variant: "default", icon: null },
  };
  const cfg = map[status] || { variant: "default", icon: null };
  return (
    <Badge variant={cfg.variant} className="gap-1">
      {cfg.icon}
      {status}
    </Badge>
  );
}

function EmptyState({ title, message, action }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <h4 className="text-base font-medium">{title}</h4>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

function ProfileTab({ profile, reload, onToast }) {
  const [form, setForm] = useState({
    university: "",
    degree: "",
    graduation_year: "",
    experience_years: 0,
    summary: "",
    current_location: "",
    linkedin_url: "",
    github_url: "",
    leetcode_url: "",
    hackerrank_url: "",
    portfolio_url: "",
    skills: [],
    projects: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      university: profile.university || "",
      degree: profile.degree || "",
      graduation_year: profile.graduation_year || "",
      experience_years: profile.experience_years ?? 0,
      summary: profile.summary || "",
      current_location: profile.current_location || "",
      linkedin_url: profile.linkedin_url || "",
      github_url: profile.github_url || "",
      leetcode_url: profile.leetcode_url || "",
      hackerrank_url: profile.hackerrank_url || "",
      portfolio_url: profile.portfolio_url || "",
      skills: profile.skills || [],
      projects: profile.projects || [],
    });
  }, [profile]);

  const save = async () => {
    setSaving(true);
    try {
      await api("/students/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
          experience_years: Number(form.experience_years) || 0,
          current_location: form.current_location.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
          github_url: form.github_url.trim() || null,
          leetcode_url: form.leetcode_url.trim() || null,
          hackerrank_url: form.hackerrank_url.trim() || null,
          portfolio_url: form.portfolio_url.trim() || null,
        }),
      });
      onToast("Profile saved");
      reload();
    } catch (err) {
      onToast(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (flag) => {
    try {
      await api("/students/me/visibility", {
        method: "PATCH",
        body: JSON.stringify({ visibility_flag: flag }),
      });
      reload();
    } catch (err) {
      onToast(friendlyError(err));
    }
  };

  const updateProject = (idx, patch) => {
    setForm((f) => ({
      ...f,
      projects: f.projects.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  };
  const addProject = () =>
    setForm((f) => ({
      ...f,
      projects: [...f.projects, { title: "", technologies: [], description: "" }],
    }));
  const removeProject = (idx) =>
    setForm((f) => ({ ...f, projects: f.projects.filter((_, i) => i !== idx) }));

  const isEmpty =
    !form.university && !form.degree && !form.summary && form.skills.length === 0 && form.projects.length === 0;
  const linkFields = [
    { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/yourname" },
    { key: "github_url", label: "GitHub URL", placeholder: "https://github.com/yourname" },
    { key: "leetcode_url", label: "LeetCode URL", placeholder: "https://leetcode.com/yourname" },
    { key: "hackerrank_url", label: "HackerRank URL", placeholder: "https://hackerrank.com/yourname" },
    { key: "portfolio_url", label: "Portfolio / website", placeholder: "https://yourname.dev" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Basic details</CardTitle>
          <CardDescription>
            {isEmpty
              ? "Upload your resume on the Resume tab and we'll fill these in automatically with AI."
              : "These power your match scores. Adjust anything the parser got wrong."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>University</Label>
              <Input value={form.university} onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))} />
            </div>
            <div>
              <Label>Degree</Label>
              <Input value={form.degree} onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))} />
            </div>
            <div>
              <Label>Graduation year</Label>
              <Input type="number" value={form.graduation_year} onChange={(e) => setForm((f) => ({ ...f, graduation_year: e.target.value }))} />
            </div>
            <div>
              <Label>Experience (years)</Label>
              <Input type="number" step="0.5" value={form.experience_years} onChange={(e) => setForm((f) => ({ ...f, experience_years: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3">
            <Label>Professional summary</Label>
            <Textarea value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          </div>
          <div className="mt-3">
            <Label>Skills</Label>
            <ChipInput
              value={form.skills}
              onChange={(skills) => setForm((f) => ({ ...f, skills }))}
              placeholder="e.g. Python, React, PostgreSQL"
            />
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Projects</Label>
              <Button variant="outline" size="sm" onClick={addProject}>
                Add project
              </Button>
            </div>
            <div className="mt-2 space-y-3">
              {form.projects.map((p, idx) => (
                <div key={idx} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Input placeholder="Project title" value={p.title} onChange={(e) => updateProject(idx, { title: e.target.value })} />
                    <Button variant="ghost" size="sm" onClick={() => removeProject(idx)}>
                      Remove
                    </Button>
                  </div>
                  <ChipInput value={p.technologies || []} onChange={(t) => updateProject(idx, { technologies: t })} placeholder="Technologies used" />
                  <Textarea placeholder="Short description" value={p.description || ""} onChange={(e) => updateProject(idx, { description: e.target.value })} />
                </div>
              ))}
              {form.projects.length === 0 && (
                <p className="text-xs text-muted-foreground">No projects yet.</p>
              )}
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <Label className="mb-0">Contact & links</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              All optional. Your email stays private — this is what companies see on your profile.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Current location</Label>
                <Input
                  value={form.current_location}
                  placeholder="e.g. Bahawalpur, Pakistan"
                  onChange={(e) => setForm((f) => ({ ...f, current_location: e.target.value }))}
                />
              </div>
              {linkFields.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    type="url"
                    value={form[key]}
                    placeholder={placeholder}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Companies can see and match you only when this is on.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="font-medium">Profile visible to companies</div>
              <p className="text-xs text-muted-foreground">
                Turn this off to hide your profile without deleting it.
              </p>
            </div>
            <Switch checked={Boolean(profile?.visibility_flag)} onCheckedChange={(v) => toggleVisibility(Boolean(v))} />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Status: {profile?.visibility_flag ? "Visible" : "Hidden"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ParsedPreview({ profile }) {
  if (!profile) return null;
  const hasData =
    profile.university ||
    profile.degree ||
    profile.summary ||
    profile.current_location ||
    profile.linkedin_url ||
    profile.github_url ||
    profile.portfolio_url ||
    profile.skills?.length ||
    profile.projects?.length;
  if (!hasData) return null;
  return (
    <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-accent">
        <Sparkles size={16} />
        Extracted from your resume
      </div>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <div>
          <span className="text-muted-foreground">University:</span>{" "}
          {profile.university || <em className="text-muted-foreground">not detected</em>}
        </div>
        <div>
          <span className="text-muted-foreground">Degree:</span>{" "}
          {profile.degree || <em className="text-muted-foreground">not detected</em>}
        </div>
        <div>
          <span className="text-muted-foreground">Graduation year:</span>{" "}
          {profile.graduation_year || <em className="text-muted-foreground">not detected</em>}
        </div>
        <div>
          <span className="text-muted-foreground">Experience:</span>{" "}
          {profile.experience_years ? `${profile.experience_years} yrs` : <em className="text-muted-foreground">0 yrs</em>}
        </div>
        <div>
          <span className="text-muted-foreground">Location:</span>{" "}
          {profile.current_location || <em className="text-muted-foreground">not detected</em>}
        </div>
      </div>
      {profile.summary && (
        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">Summary:</span> {profile.summary}
        </div>
      )}
      {(profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {profile.linkedin_url && (
            <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-accent underline">
              LinkedIn
            </a>
          )}
          {profile.github_url && (
            <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-accent underline">
              GitHub
            </a>
          )}
          {profile.portfolio_url && (
            <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="text-accent underline">
              Portfolio
            </a>
          )}
        </div>
      )}
      <div className="mt-3">
        <div className="mb-1 text-xs text-muted-foreground">Skills</div>
        <Chips items={profile.skills} />
      </div>
      {profile.projects?.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-xs text-muted-foreground">Projects</div>
          <ul className="ml-4 list-disc text-sm">
            {profile.projects.map((p, i) => (
              <li key={i}>
                <strong>{p.title}</strong>
                {p.technologies?.length > 0 && (
                  <span className="text-muted-foreground"> · {p.technologies.join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResumeTab({ onToast, reload, profile, onParsed }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const pollStatus = useCallback(
    async (resumeId) => {
      for (let i = 0; i < 40; i++) {
        try {
          const res = await api(`/students/me/resume/${resumeId}/status`);
          setStatus(res);
          if (res.status === "completed") {
            await reload();
            onParsed?.();
            return res;
          }
          if (res.status === "failed") {
            onToast(`Resume parsing failed: ${res.error || "unknown error"}`);
            return res;
          }
        } catch (err) {
          onToast(friendlyError(err));
          return null;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    },
    [onToast, reload, onParsed]
  );

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile("/students/me/resume", file);
      setStatus(res);
      onToast("Resume uploaded, parsing in background...");
      await pollStatus(res.id);
    } catch (err) {
      onToast(friendlyError(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload your resume</CardTitle>
        <CardDescription>
          Upload a PDF/DOC/DOCX and the system will auto-fill your profile and career report with AI.
          You don't need to fill anything manually — just confirm on the Profile tab afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onPick} />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => inputRef.current?.click()} disabled={busy} className="gap-2">
            <Upload size={16} />
            {busy ? "Processing..." : profile?.skills?.length ? "Upload a new resume" : "Choose file"}
          </Button>
          {status && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge status={status.status} />
              {status.status === "processing" && <span className="text-xs text-muted-foreground">Parsing with AI, this can take up to 30s</span>}
            </div>
          )}
        </div>
        {status?.error && <p className="mt-2 text-sm text-destructive">{status.error}</p>}

        {(status?.status === "completed" || profile?.skills?.length > 0) && <ParsedPreview profile={profile} />}

        <div className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          AI parsing needs <code>OPENAI_API_KEY</code> set in the API environment. Without it the system
          falls back to a keyword scan and will only detect a handful of common technologies.
        </div>
      </CardContent>
    </Card>
  );
}

function ReportTab({ profile }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/students/me/report");
      setReport(data);
      setError(null);
    } catch (err) {
      setError(err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="pt-4"><SkeletonTable rows={3} cols={1} /></CardContent></Card>
        <Card><CardContent className="pt-4"><SkeletonTable rows={3} cols={1} /></CardContent></Card>
      </div>
    );
  }

  if (!report) {
    const isMissing = error?.status === 404;
    return (
      <EmptyState
        title={isMissing ? "No career report yet" : "Couldn't load report"}
        message={
          isMissing
            ? "Your career report is generated automatically when you upload a resume. Head to the Resume tab and upload your CV to get started."
            : friendlyError(error)
        }
        action={<Button variant="outline" onClick={load}>Retry</Button>}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Professional summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{report.professional_summary}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Suggested career paths</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="ml-4 list-disc text-sm space-y-1">
            {report.suggested_paths.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Skill gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="ml-4 list-disc text-sm space-y-1">
            {report.skill_gaps.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Resume suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="ml-4 list-disc text-sm space-y-1">
            {report.resume_suggestions.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function JobsTab({ onToast, profileVisible, hasProfile, onApplied }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/students/me/jobs");
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const apply = async (job) => {
    // Optimistic: flip to "Applied" immediately; roll back on failure.
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, already_applied: true } : j)));
    try {
      await api("/students/me/applications", { method: "POST", body: JSON.stringify({ job_id: job.id }) });
      onToast(`Applied to ${job.title}`);
      onApplied?.();  // tick the onboarding checklist
    } catch (err) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, already_applied: false } : j)));
      onToast(friendlyError(err));
    }
  };

  if (loading) return <Card><CardContent className="pt-4"><SkeletonTable rows={5} cols={6} /></CardContent></Card>;
  if (error) {
    return (
      <EmptyState
        title="Couldn't load jobs"
        message={`${error}. Make sure the API is running.`}
        action={<Button variant="outline" onClick={load}>Retry</Button>}
      />
    );
  }
  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No active jobs right now"
        message="Once companies post new roles you'll see them ranked by your match score here."
      />
    );
  }

  const eligible = jobs.filter((j) => j.total_score >= j.apply_threshold);
  const skillGap = jobs.filter((j) => j.total_score < j.apply_threshold && j.total_score >= 30);
  const farAway = jobs.filter((j) => j.total_score < 30);

  const renderRow = (job) => {
    const belowThreshold = job.total_score < job.apply_threshold;
    const gap = Math.max(0, job.apply_threshold - job.total_score);
    let actionCell;
    if (job.already_applied) {
      actionCell = <Badge variant="success">Applied</Badge>;
    } else if (!profileVisible) {
      actionCell = (
        <div className="flex flex-col items-end gap-1">
          <Badge variant="warn" className="gap-1">
            <EyeOff size={12} /> Visibility off
          </Badge>
          <span className="text-xs text-muted-foreground">Enable on the Profile tab</span>
        </div>
      );
    } else if (belowThreshold) {
      actionCell = (
        <div className="flex flex-col items-end gap-1">
          <Badge variant="destructive" className="gap-1">
            <Lock size={12} /> Closed for you
          </Badge>
          <span className="text-xs text-muted-foreground">
            Need {job.apply_threshold.toFixed(0)}% · you have {job.total_score.toFixed(0)}% ({gap.toFixed(0)}% short)
          </span>
        </div>
      );
    } else {
      actionCell = (
        <Button size="sm" variant="primary" onClick={() => apply(job)}>
          Apply
        </Button>
      );
    }
    return (
      <Tr key={job.id}>
        <Td>
          <div className="font-medium">{job.title}</div>
          <div className="text-xs text-muted-foreground">{job.required_skills.join(" · ")}</div>
        </Td>
        <Td>{job.company_name}</Td>
        <Td>{job.location}</Td>
        <Td><ScoreBadge score={job.total_score} /></Td>
        <Td>{job.apply_threshold.toFixed(0)}%</Td>
        <Td>
          {job.missing_skills.length === 0 ? (
            <Badge variant="success">All covered</Badge>
          ) : (
            <div className="flex flex-wrap gap-1">
              {job.missing_skills.map((s) => (
                <Badge key={s} variant="warn">{s}</Badge>
              ))}
            </div>
          )}
        </Td>
        <Td className="text-right">{actionCell}</Td>
      </Tr>
    );
  };

  const Section = ({ title, description, rows }) => (
    rows.length === 0 ? null : (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <Tr>
                <Th>Role</Th>
                <Th>Company</Th>
                <Th>Location</Th>
                <Th>Match</Th>
                <Th>Threshold</Th>
                <Th>Missing skills</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </THead>
            <TBody>{rows.map(renderRow)}</TBody>
          </Table>
        </CardContent>
      </Card>
    )
  );

  return (
    <div className="space-y-4">
      {!hasProfile && (
        <div className="rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
          Your profile is empty — upload a resume on the Resume tab to get accurate match scores.
        </div>
      )}
      {!profileVisible && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          Turn on profile visibility (Profile tab) before you apply to jobs.
        </div>
      )}

      <Section
        title="Ready to apply"
        description="You meet the company's minimum match score on these roles."
        rows={eligible}
      />

      <Section
        title="Close matches — small skill gap"
        description="A few skills away from applying. Add these on your profile or learn them to unlock these roles."
        rows={skillGap}
      />

      <Section
        title="Other roles"
        description="Significant skill gaps — keep these in mind for the future."
        rows={farAway}
      />
    </div>
  );
}

function ApplicationsTab({ onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api("/students/me/applications"));
      setError(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Card><CardContent className="pt-4"><SkeletonTable rows={4} cols={5} /></CardContent></Card>;
  if (error) {
    return (
      <EmptyState
        title="Couldn't load applications"
        message={error}
        action={<Button variant="outline" onClick={load}>Retry</Button>}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        message="Head to the Jobs tab and apply to roles where you meet the minimum match score."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your applications</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <Tr>
              <Th>Role</Th>
              <Th>Company</Th>
              <Th>Applied at</Th>
              <Th>Match at apply</Th>
              <Th>Status</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>{row.job_title}</Td>
                <Td>{row.company_name}</Td>
                <Td className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</Td>
                <Td><ScoreBadge score={row.match_score_at_apply} /></Td>
                <Td><StatusBadge status={row.status} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InterviewsTab({ onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api("/students/me/interviews"));
      setError(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (interview, action) => {
    const targetStatus = action === "accept" ? "accepted" : "rejected";
    const originalStatus = interview.status;
    // Optimistic status flip
    setRows((prev) => prev.map((r) => (r.id === interview.id ? { ...r, status: targetStatus } : r)));
    try {
      const updated = await api(`/students/me/interviews/${interview.id}/${action}`, { method: "POST" });
      // Replace row with authoritative data (includes meeting_link on accept)
      setRows((prev) => prev.map((r) => (r.id === interview.id ? { ...r, ...updated } : r)));
      onToast(
        action === "accept"
          ? "Interview accepted — meeting link sent to you and the company by email"
          : "Interview declined — the company has been notified"
      );
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === interview.id ? { ...r, status: originalStatus } : r)));
      onToast(friendlyError(err));
    }
  };

  if (loading) return <Card><CardContent className="pt-4"><SkeletonTable rows={4} cols={6} /></CardContent></Card>;
  if (error) {
    return (
      <EmptyState
        title="Couldn't load interviews"
        message={error}
        action={<Button variant="outline" onClick={load}>Retry</Button>}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No interview requests yet"
        message="After you apply, companies can send you interview requests. They'll appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview requests</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <Tr>
              <Th>Company</Th>
              <Th>Role</Th>
              <Th>Interview date</Th>
              <Th>Status</Th>
              <Th>Meeting</Th>
              <Th>Hire decision</Th>
              <Th className="text-right">Action</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((i) => (
              <Tr key={i.id}>
                <Td>{i.company_name}</Td>
                <Td>{i.job_title}</Td>
                <Td className="text-xs">{new Date(i.interview_date).toLocaleString()}</Td>
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
                  {i.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="success" onClick={() => decide(i, "accept")}>Accept</Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(i, "reject")}>Reject</Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </CardContent>
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

function OnboardingChecklist({ profile, hasApplied, onJump, onDismiss }) {
  const steps = [
    {
      key: "resume",
      label: "Upload your resume",
      done: Boolean(profile?.skills?.length || profile?.university),
      target: "resume",
    },
    {
      key: "visibility",
      label: "Turn on profile visibility so companies can see you",
      done: Boolean(profile?.visibility_flag),
      target: "profile",
    },
    {
      key: "apply",
      label: "Apply to a role that fits you",
      done: hasApplied,
      target: "jobs",
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  return (
    <Card className="mb-4 border-accent/30 bg-accent/5">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-accent">Finish setting up your account</div>
            <p className="text-xs text-muted-foreground">
              {completed} of {steps.length} done — three quick steps to start getting matched.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
        <ul className="space-y-1.5 text-sm">
          {steps.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              {s.done ? (
                <CircleCheck size={18} className="text-success" />
              ) : (
                <Circle size={18} className="text-muted-foreground" />
              )}
              <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
              {!s.done && (
                <button
                  type="button"
                  onClick={() => onJump(s.target)}
                  className="ml-auto text-xs text-accent hover:underline"
                >
                  Go →
                </button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}


function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useTabState("resume");
  const [hasApplied, setHasApplied] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("cb_student_checklist_dismissed") === "1";
  });

  const loadProfile = useCallback(async () => {
    try {
      const data = await api("/students/me/profile");
      setProfile(data);
    } catch (err) {
      setToast(friendlyError(err));
    }
  }, []);

  // Load whether the student has applied to anything — drives the checklist last step.
  const loadApplied = useCallback(async () => {
    try {
      const rows = await api("/students/me/applications");
      setHasApplied(rows.length > 0);
    } catch {
      /* silent — checklist just shows step incomplete */
    }
  }, []);

  useEffect(() => { loadProfile(); loadApplied(); }, [loadProfile, loadApplied]);

  const hasProfile = Boolean(profile?.skills?.length || profile?.university || profile?.summary);

  const dismissChecklist = useCallback(() => {
    setChecklistDismissed(true);
    if (typeof window !== "undefined") window.localStorage.setItem("cb_student_checklist_dismissed", "1");
  }, []);

  const onParsed = useCallback(() => {
    setToast("Profile auto-filled from your resume");
    setTab("profile");
  }, [setTab]);

  return (
    <DashboardShell
      title="Student dashboard"
      subtitle="Upload your resume — we'll do the rest: profile, career report, and ranked job matches."
    >
      {!checklistDismissed && profile && (
        <OnboardingChecklist
          profile={profile}
          hasApplied={hasApplied}
          onJump={setTab}
          onDismiss={dismissChecklist}
        />
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="report">Career report</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
        </TabsList>
        <TabsContent value="resume">
          <ResumeTab onToast={setToast} reload={loadProfile} profile={profile} onParsed={onParsed} />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileTab profile={profile} reload={loadProfile} onToast={setToast} />
        </TabsContent>
        <TabsContent value="report">
          <ReportTab profile={profile} />
        </TabsContent>
        <TabsContent value="jobs">
          <JobsTab
            onToast={setToast}
            profileVisible={Boolean(profile?.visibility_flag)}
            hasProfile={hasProfile}
            onApplied={() => setHasApplied(true)}
          />
        </TabsContent>
        <TabsContent value="applications">
          <ApplicationsTab onToast={setToast} />
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
    <RequireRole role="student">
      <StudentDashboard />
    </RequireRole>
  );
}
