"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "../_providers/AuthProvider";
import { CheckCircle2, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";

function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role;
  } catch {
    return null;
  }
}

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const token = params.get("token") || "";
  const [state, setState] = useState({ status: "verifying", message: "" });
  // React StrictMode double-invokes effects in dev; guard so we only POST once.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (!token) {
      setState({ status: "error", message: "This link is missing the verification token." });
      return;
    }
    (async () => {
      try {
        const data = await api("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        login(data.access_token, data.refresh_token);
        const role = decodeRole(data.access_token) || "student";
        setState({ status: "ok", message: "" });
        // Brief pause so the user sees the success state before the redirect.
        setTimeout(() => router.replace(`/${role}`), 1200);
      } catch (err) {
        setState({
          status: "error",
          message: err.message || "Verification failed. The link may have expired.",
        });
      }
    })();
  }, [token, login, router]);

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
          {state.status === "verifying" && (
            <>
              <Loader2 className="mx-auto mb-4 animate-spin text-accent" size={48} />
              <h1 className="font-display text-[28px] font-semibold leading-[1.18]">
                Verifying your email…
              </h1>
              <p className="mt-3 text-[14px] text-muted-foreground">One moment.</p>
            </>
          )}
          {state.status === "ok" && (
            <>
              <CheckCircle2 className="mx-auto mb-4 text-green-600" size={48} />
              <h1 className="font-display text-[28px] font-semibold leading-[1.18]">
                Email verified
              </h1>
              <p className="mt-3 text-[14px] text-muted-foreground">
                Logging you in and taking you to your dashboard…
              </p>
            </>
          )}
          {state.status === "error" && (
            <>
              <AlertTriangle className="mx-auto mb-4 text-destructive" size={48} />
              <h1 className="font-display text-[28px] font-semibold leading-[1.18]">
                Couldn&apos;t verify
              </h1>
              <p className="mt-3 text-[14px] text-muted-foreground">{state.message}</p>
              <p className="mt-4 text-[13px] text-muted-foreground">
                Verification links expire after 1 hour. Try logging in to request a fresh one.
              </p>
              <Link
                href="/auth"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-sm bg-accent px-5 text-[17px] text-white hover:bg-[#0077ed]"
              >
                Go to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[14px] text-muted-foreground">
          Loading…
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
