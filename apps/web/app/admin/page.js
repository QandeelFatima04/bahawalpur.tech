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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Users, Building2, Briefcase, CalendarClock } from "lucide-react";

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

function OverviewTab({ onToast }) {
  const [analytics, setAnalytics] = useState(null);
  const [pending, setPending] = useState([]);

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        api("/admin/analytics"),
        api("/admin/companies/pending"),
      ]);
      setAnalytics(a);
      setPending(p);
    } catch (err) {
      onToast(friendlyError(err));
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, decision) => {
    try {
      await api(`/admin/companies/${id}/${decision}`, { method: "POST" });
      onToast(`Company ${decision}d`);
      load();
    } catch (err) {
      onToast(friendlyError(err));
    }
  };

  const kpis = [
    { label: "Students", value: analytics?.students_total ?? "—", icon: Users },
    { label: "Verified companies", value: analytics?.companies_verified ?? "—", icon: Building2 },
    { label: "Active jobs", value: analytics?.jobs_active ?? "—", icon: Briefcase },
    { label: "Active interviews", value: analytics?.interviews_active ?? "—", icon: CalendarClock },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <div className="text-xs uppercase text-muted-foreground">{label}</div>
                <div className="text-2xl font-semibold">{value}</div>
              </div>
              <Icon size={24} className="text-accent" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending company approvals</CardTitle>
          <CardDescription>Approve before they can post jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <Tr>
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Contact email</Th>
                <Th>Applied</Th>
                <Th className="text-right">Decision</Th>
              </Tr>
            </THead>
            <TBody>
              {pending.map((c) => (
                <Tr key={c.id}>
                  <Td>#{c.id}</Td>
                  <Td className="font-medium">{c.name}</Td>
                  <Td className="text-xs">{c.email || "—"}</Td>
                  <Td className="text-xs text-muted-foreground">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="success" onClick={() => decide(c.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(c.id, "reject")}>Reject</Button>
                    </div>
                  </Td>
                </Tr>
              ))}
              {pending.length === 0 && (
                <Tr><Td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No pending companies.</Td></Tr>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentsTab({ onToast }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const search = q ? `?q=${encodeURIComponent(q)}` : "";
      setRows(await api(`/admin/students${search}`));
    } catch (err) {
      onToast(friendlyError(err));
    }
  }, [q, onToast]);

  useEffect(() => { load(); }, [load]);

  const toggleDisable = async (row) => {
    const next = !row.is_disabled;
    // Optimistic
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_disabled: next } : r)));
    try {
      await api(`/admin/students/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_disabled: next }),
      });
      onToast(next ? "Student disabled" : "Student enabled");
    } catch (err) {
      // Roll back optimistic change
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_disabled: !next } : r)));
      onToast(friendlyError(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>Search, update, and disable student accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2">
          <Input placeholder="Search by email, university, degree" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Button onClick={load}>Search</Button>
        </div>
        <Table>
          <THead>
            <Tr>
              <Th>ID</Th>
              <Th>Email</Th>
              <Th>University</Th>
              <Th>Degree</Th>
              <Th>Visible</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>#{r.id}</Td>
                <Td>{r.email}</Td>
                <Td>{r.university || "—"}</Td>
                <Td>{r.degree || "—"}</Td>
                <Td>{r.visibility_flag ? "Yes" : "No"}</Td>
                <Td>
                  <Badge variant={r.is_disabled ? "destructive" : "success"}>
                    {r.is_disabled ? "Disabled" : "Active"}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <Button size="sm" variant={r.is_disabled ? "primary" : "destructive"} onClick={() => toggleDisable(r)}>
                    {r.is_disabled ? "Enable" : "Disable"}
                  </Button>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <Tr><Td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">No students found.</Td></Tr>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CompaniesTab({ onToast }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const search = q ? `?q=${encodeURIComponent(q)}` : "";
      setRows(await api(`/admin/companies${search}`));
    } catch (err) {
      onToast(friendlyError(err));
    }
  }, [q, onToast]);

  useEffect(() => { load(); }, [load]);

  const patch = async (row, patchBody, label) => {
    // Optimistic: apply the patch locally so the UI updates instantly
    const snapshot = { ...row };
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patchBody } : r)));
    try {
      await api(`/admin/companies/${row.id}`, { method: "PATCH", body: JSON.stringify(patchBody) });
      onToast(label);
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? snapshot : r)));
      onToast(friendlyError(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Companies</CardTitle>
        <CardDescription>Verify, disable, and update company records.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2">
          <Input placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Button onClick={load}>Search</Button>
        </div>
        <Table>
          <THead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Verification</Th>
              <Th>State</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>#{r.id}</Td>
                <Td>{r.name}</Td>
                <Td>{r.email}</Td>
                <Td>
                  <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "destructive" : "warn"}>
                    {r.status}
                  </Badge>
                </Td>
                <Td>
                  <Badge variant={r.is_disabled ? "destructive" : "success"}>
                    {r.is_disabled ? "Disabled" : "Active"}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    {r.status !== "approved" && (
                      <Button size="sm" variant="success" onClick={() => patch(r, { status: "approved" }, "Approved")}>Approve</Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button size="sm" variant="ghost" onClick={() => patch(r, { status: "rejected" }, "Rejected")}>Reject</Button>
                    )}
                    <Button size="sm" variant={r.is_disabled ? "primary" : "destructive"}
                      onClick={() => patch(r, { is_disabled: !r.is_disabled }, r.is_disabled ? "Enabled" : "Disabled")}>
                      {r.is_disabled ? "Enable" : "Disable"}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <Tr><Td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No companies found.</Td></Tr>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function JobsTab({ onToast }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const search = q ? `?q=${encodeURIComponent(q)}` : "";
      setRows(await api(`/admin/jobs${search}`));
    } catch (err) {
      onToast(friendlyError(err));
    }
  }, [q, onToast]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (row) => {
    const next = !row.is_active;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)));
    try {
      await api(`/admin/jobs/${row.id}`, { method: "PATCH", body: JSON.stringify({ is_active: next }) });
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: !next } : r)));
      onToast(friendlyError(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
        <CardDescription>Open, close, and edit any job on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2">
          <Input placeholder="Search by title, company, or location" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Button onClick={load}>Search</Button>
        </div>
        <Table>
          <THead>
            <Tr>
              <Th>ID</Th>
              <Th>Title</Th>
              <Th>Company</Th>
              <Th>Location</Th>
              <Th>Threshold</Th>
              <Th>Applicants</Th>
              <Th>State</Th>
              <Th className="text-right">Action</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>#{r.id}</Td>
                <Td>{r.title}</Td>
                <Td>{r.company_name}</Td>
                <Td>{r.location}</Td>
                <Td>{r.apply_threshold.toFixed(0)}%</Td>
                <Td>{r.applicant_count}</Td>
                <Td>
                  <Badge variant={r.is_active ? "success" : "default"}>
                    {r.is_active ? "Active" : "Closed"}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <Button size="sm" variant={r.is_active ? "destructive" : "primary"} onClick={() => toggleActive(r)}>
                    {r.is_active ? "Close" : "Reopen"}
                  </Button>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <Tr><Td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">No jobs found.</Td></Tr>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InterviewsTab({ onToast }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const search = q ? `?q=${encodeURIComponent(q)}` : "";
      setRows(await api(`/admin/interviews${search}`));
    } catch (err) {
      onToast(friendlyError(err));
    }
  }, [q, onToast]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (row) => {
    try {
      await api(`/admin/interviews/${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
      onToast("Interview cancelled");
      load();
    } catch (err) {
      onToast(friendlyError(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interviews</CardTitle>
        <CardDescription>All pending and completed interviews across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2">
          <Input placeholder="Search by company or job title" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Button onClick={load}>Search</Button>
        </div>
        <Table>
          <THead>
            <Tr>
              <Th>ID</Th>
              <Th>Company</Th>
              <Th>Role</Th>
              <Th>Candidate</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Hire</Th>
              <Th className="text-right">Action</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>#{r.id}</Td>
                <Td>{r.company_name}</Td>
                <Td>{r.job_title}</Td>
                <Td>#{r.candidate_id}</Td>
                <Td className="text-xs">{new Date(r.interview_date).toLocaleString()}</Td>
                <Td><Badge variant="default">{r.status}</Badge></Td>
                <Td>
                  {r.hire_status ? (
                    <Badge variant={r.hire_status === "yes" ? "success" : "destructive"}>{r.hire_status}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </Td>
                <Td className="text-right">
                  {["pending", "accepted"].includes(r.status) ? (
                    <Button size="sm" variant="destructive" onClick={() => cancel(r)}>Cancel</Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <Tr><Td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">No interviews found.</Td></Tr>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useTabState("overview");
  return (
    <DashboardShell title="Admin panel" subtitle="Platform-wide oversight and controls.">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab onToast={setToast} /></TabsContent>
        <TabsContent value="students"><StudentsTab onToast={setToast} /></TabsContent>
        <TabsContent value="companies"><CompaniesTab onToast={setToast} /></TabsContent>
        <TabsContent value="jobs"><JobsTab onToast={setToast} /></TabsContent>
        <TabsContent value="interviews"><InterviewsTab onToast={setToast} /></TabsContent>
      </Tabs>
      <Toast message={toast} onClear={() => setToast(null)} />
    </DashboardShell>
  );
}

export default function Page() {
  return (
    <RequireRole role="admin">
      <AdminDashboard />
    </RequireRole>
  );
}
