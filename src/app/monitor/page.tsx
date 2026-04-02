"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/tenant";

export default function MonitorRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (session && (session.role === "admin" || session.role === "coordinator" || session.role === "superadmin")) {
      // Already authenticated as admin, go directly to monitor
      router.replace("/admin/monitor");
    } else {
      // Not authenticated or not admin, redirect to login with return URL
      localStorage.setItem("ge_redirect_after_login", "/admin/monitor");
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}
