"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "../_providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role;
  } catch {
    return null;
  }
}

function AuthPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { login, isAuthenticated, role: userRole, ready } = useAuth();

  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: params.get("role") || "student",
    company_name: "",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && isAuthenticated && userRole) {
      router.replace(`/${userRole}`);
    }
  }, [ready, isAuthenticated, userRole, router]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "register"
          ? {
              email: form.email,
              password: form.password,
              role: form.role,
              company_name:
                form.role === "company" ? form.company_name || "Pending Company" : undefined,
            }
          : { email: form.email, password: form.password };

      const data = await api(path, { method: "POST", body: JSON.stringify(payload) });
      login(data.access_token, data.refresh_token);
      const role = decodeRole(data.access_token) || "student";
      router.replace(`/${role}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="min-h-screen bg-background">
      {/* Slim dark glass nav so the auth page still carries the brand */}
      <nav className="fixed inset-x-0 top-0 z-50 nav-glass">
        <div className="mx-auto flex h-12 max-w-[1120px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-[14px] font-medium text-white">
            <ArrowLeft size={14} />
            CareerBridge AI
          </Link>
          <div className="text-[12px] text-white/70">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-white underline-offset-4 hover:underline"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-white underline-offset-4 hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-[480px] rounded-xl bg-card p-10 ring-1 ring-black/[0.04]">
          <div className="mb-8 text-center">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">
              CareerBridge AI
            </p>
            <h1 className="font-display text-[32px] font-semibold leading-[1.12] tracking-[-0.01em]">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mx-auto mt-3 max-w-[360px] text-[15px] leading-[1.47] tracking-[-0.016em] text-muted-foreground">
              {isRegister
                ? "Sign up as a student, company, or administrator."
                : "Log in to access your dashboard."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={update("password")}
                placeholder="At least 8 characters"
              />
            </div>
            {isRegister && (
              <>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select id="role" value={form.role} onChange={update("role")}>
                    <option value="student">Student</option>
                    <option value="company">Company (requires admin approval)</option>
                    <option value="admin">Administrator</option>
                  </Select>
                </div>
                {form.role === "company" && (
                  <div>
                    <Label htmlFor="company_name">Company name</Label>
                    <Input
                      id="company_name"
                      required
                      value={form.company_name}
                      onChange={update("company_name")}
                      placeholder="e.g. Acme Software"
                    />
                  </div>
                )}
              </>
            )}
            {error && (
              <p className="rounded-sm bg-destructive/10 px-4 py-3 text-[14px] leading-[1.43] text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full" size="md">
              {busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}
            </Button>
          </form>

          <div className="mt-8 text-center text-[12px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              &larr; Back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[14px] text-muted-foreground">
          Loading…
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
