"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantContext } from "@/components/TenantProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, isAuthenticated, loading } = useTenantContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !session)) {
      router.replace("/login");
      return;
    }
    // Only admin and coordinator roles can access /admin
    if (!loading && session && session.role !== "admin" && session.role !== "coordinator" && session.role !== "superadmin") {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!session || (session.role !== "admin" && session.role !== "coordinator" && session.role !== "superadmin")) {
    return null;
  }

  return <>{children}</>;
}
