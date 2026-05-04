"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_providers/AuthProvider";

const ROLE_LABEL = {
  student: "Student",
  company: "Company",
  admin: "Administrator",
};

export function DashboardShell({ title, subtitle, children }) {
  const { role, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 nav-glass">
        <div className="mx-auto flex h-12 max-w-[1180px] items-center justify-between px-6">
          <Link
            href="/"
            className="text-[14px] font-medium tracking-[-0.01em] text-white hover:text-white"
          >
            CareerBridge AI
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-white/80">
            {isAuthenticated && (
              <>
                <span className="hidden sm:inline">
                  Signed in as{" "}
                  <span className="text-white">{ROLE_LABEL[role] || role}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-pill bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/20"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[88px]">
        <div className="mb-10">
          <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.01em]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-[720px] text-[17px] leading-[1.47] tracking-[-0.022em] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
