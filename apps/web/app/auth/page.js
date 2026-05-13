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
import { ArrowLeft, MailCheck } from "lucide-react";

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
  // After register: show "check your inbox" panel instead of auto-routing.
  const [checkInbox, setCheckInbox] = useState(null); // { email } | null
  // After login attempt with unverified account: show "resend link" CTA.
  const [needsVerification, setNeedsVerification] = useState(null); // { email } | null
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);

  useEffect(() => {
    if (ready && isAuthenticated && userRole) {
      router.replace(`/${userRole}`);
    }
  }, [ready, isAuthenticated, userRole, router]);

  // If the API layer cleared tokens with a one-shot message (e.g. admin disabled the
  // account mid-session), surface it here on the login screen they were redirected to.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const msg = window.sessionStorage.getItem("cb_auth_message");
      if (msg) {
        setError(msg);
        window.sessionStorage.removeItem("cb_auth_message");
      }
    } catch {
      /* sessionStorage unavailable — skip */
    }
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(null);
    setResendMsg(null);
    setBusy(true);
    try {
      if (mode === "register") {
        const payload = {
          email: form.email,
          password: form.password,
          role: form.role,
          company_name:
            form.role === "company" ? form.company_name || "Pending Company" : undefined,
        };
        await api("/auth/register", { method: "POST", body: JSON.stringify(payload) });
        // Backend does NOT issue tokens on register. User must verify email first.
        setCheckInbox({ email: form.email });
      } else {
        const data = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        login(data.access_token, data.refresh_token);
        const role = decodeRole(data.access_token) || "student";
        router.replace(`/${role}`);
      }
    } catch (err) {
      // 403 with detail "email_unverified" → show resend UI
      if (err.status === 403 && err.body?.detail === "email_unverified") {
        setNeedsVerification({ email: form.email });
      } else if (err.status === 403 && err.body?.detail === "account_disabled") {
        setError("Your account has been disabled. Please contact the administrator.");
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async (email) => {
    setResending(true);
    setResendMsg(null);
    try {
      await api("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResendMsg("If that account exists and is unverified, a fresh link has been sent.");
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResending(false);
    }
  };

  const isRegister = mode === "register";

  // ----- Post-register success panel (no tokens issued — user must verify) -----
  if (checkInbox) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed inset-x-0 top-0 z-50 nav-glass">
          <div className="mx-auto flex h-12 max-w-[1120px] items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 text-[14px] font-medium text-white">
              <ArrowLeft size={14} />
              CareerBridge AI
            </Link>
          </div>
        </nav>
        <div className="flex min-h-screen items-center justify-center px-4 pt-16">
          <div className="w-full max-w-[480px] rounded-xl bg-card p-10 ring-1 ring-black/[0.04] text-center">
            <MailCheck className="mx-auto mb-4 text-accent" size={48} />
            <h1 className="font-display text-[28px] font-semibold leading-[1.18]">
              Check your inbox
            </h1>
            <p className="mx-auto mt-3 max-w-[360px] text-[15px] leading-[1.47] text-muted-foreground">
              We sent a verification link to <strong>{checkInbox.email}</strong>. Open it within
              <strong> one hour</strong> to activate your account.
            </p>
            <p className="mt-6 text-[13px] text-muted-foreground">
              Didn&apos;t get it? Check spam, or:
            </p>
            <Button
              variant="outline"
              className="mt-3"
              disabled={resending}
              onClick={() => resend(checkInbox.email)}
            >
              {resending ? "Sending…" : "Resend verification email"}
            </Button>
            {resendMsg && (
              <p className="mt-3 text-[13px] text-muted-foreground">{resendMsg}</p>
            )}
            <div className="mt-6 text-[12px] text-muted-foreground">
              Already verified?{" "}
              <button
                onClick={() => {
                  setCheckInbox(null);
                  setMode("login");
                }}
                className="text-accent underline-offset-4 hover:underline"
              >
                Log in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                ? "Sign up as a student or company. We'll email you a link to verify."
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
            {needsVerification && (
              <div className="rounded-sm bg-amber-50 px-4 py-3 text-[14px] leading-[1.43] text-amber-900 ring-1 ring-amber-200">
                <p className="font-medium">Email not verified yet.</p>
                <p className="mt-1 text-[13px]">
                  Open the verification link we sent to{" "}
                  <strong>{needsVerification.email}</strong>, or request a new one:
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  type="button"
                  disabled={resending}
                  onClick={() => resend(needsVerification.email)}
                >
                  {resending ? "Sending…" : "Resend verification email"}
                </Button>
                {resendMsg && (
                  <p className="mt-2 text-[12px] text-muted-foreground">{resendMsg}</p>
                )}
              </div>
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
