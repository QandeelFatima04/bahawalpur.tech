"use client";
import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TurnstileWidget from "@/components/Turnstile";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: form.password, turnstile_token: captchaToken }),
      });
      setDone(true);
      // Redirect to login after a short delay.
      setTimeout(() => router.replace("/auth"), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setCaptchaToken(null);
      captchaRef.current?.reset();
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-[480px] rounded-xl bg-card p-10 ring-1 ring-black/[0.04] text-center">
          <p className="text-[15px] text-destructive">
            Invalid reset link. Please request a new one.
          </p>
          <div className="mt-4">
            <Link href="/forgot-password" className="text-[13px] text-accent underline-offset-4 hover:underline">
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed inset-x-0 top-0 z-50 nav-glass">
        <div className="mx-auto flex h-12 max-w-[1120px] items-center justify-between px-6">
          <Link href="/auth" className="flex items-center gap-2 text-[14px] font-medium text-white">
            <ArrowLeft size={14} />
            Back to login
          </Link>
        </div>
      </nav>

      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-[480px] rounded-xl bg-card p-10 ring-1 ring-black/[0.04]">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 text-green-500" size={48} />
              <h1 className="font-display text-[28px] font-semibold leading-[1.18]">
                Password updated
              </h1>
              <p className="mx-auto mt-3 max-w-[360px] text-[15px] leading-[1.47] text-muted-foreground">
                Your password has been changed. Redirecting you to the login page…
              </p>
              <div className="mt-6">
                <Link href="/auth" className="text-[13px] text-accent underline-offset-4 hover:underline">
                  Log in now
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">
                  CareerBridge AI
                </p>
                <h1 className="font-display text-[32px] font-semibold leading-[1.12] tracking-[-0.01em]">
                  Set a new password
                </h1>
                <p className="mx-auto mt-3 max-w-[360px] text-[15px] leading-[1.47] tracking-[-0.016em] text-muted-foreground">
                  Choose a strong password of at least 8 characters.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div>
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    required
                    minLength={8}
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repeat your new password"
                  />
                </div>
                {error && (
                  <p className="rounded-sm bg-destructive/10 px-4 py-3 text-[14px] leading-[1.43] text-destructive">
                    {error}
                  </p>
                )}
                <TurnstileWidget ref={captchaRef} onToken={setCaptchaToken} />
                <Button type="submit" disabled={busy || !captchaToken} className="w-full" size="md">
                  {busy ? "Updating…" : "Update password"}
                </Button>
              </form>

              <div className="mt-8 text-center text-[12px] text-muted-foreground">
                <Link href="/forgot-password" className="hover:text-foreground">
                  Request a new reset link
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[14px] text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
