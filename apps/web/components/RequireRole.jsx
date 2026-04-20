"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_providers/AuthProvider";

export function RequireRole({ role, children }) {
  const { ready, isAuthenticated, role: userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (role && userRole !== role) {
      router.replace(`/${userRole || ""}`);
    }
  }, [ready, isAuthenticated, userRole, role, router]);

  if (!ready) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!isAuthenticated || (role && userRole !== role)) return null;
  return children;
}
