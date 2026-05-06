"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MailCheck } from "lucide-react";

function ForgotPasswordInner() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

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
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto mb-4 text-accent" size={48} />
              <h1 className="font-display text-[28px] font-semibold leading-[1.18]">
                Check your inbox
              </h1>
              <p className="mx-auto mt-3 max-w-[360px] text-[15px] leading-[1.47] text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
                It expires in <strong>30 minutes</strong>.
              </p>
              <p className="mt-6 text-[13px] text-muted-foreground">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-accent underline-offset-4 hover:underline"
                >
                  try again
                </button>
                .
              </p>
              <div className="mt-6">
                <Link href="/auth" className="text-[13px] text-accent underline-offset-4 hover:underline">
                  Back to login
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
                  Forgot your password?
                </h1>
                <p className="mx-auto mt-3 max-w-[360px] text-[15px] leading-[1.47] tracking-[-0.016em] text-muted-foreground">
                  Enter your email and we&apos;ll send you a reset link valid for 30 minutes.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                {error && (
                  <p className="rounded-sm bg-destructive/10 px-4 py-3 text-[14px] leading-[1.43] text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={busy} className="w-full" size="md">
                  {busy ? "Sending…" : "Send reset link"}
                </Button>
              </form>

              <div className="mt-8 text-center text-[12px] text-muted-foreground">
                <Link href="/auth" className="hover:text-foreground">
                  &larr; Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[14px] text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
