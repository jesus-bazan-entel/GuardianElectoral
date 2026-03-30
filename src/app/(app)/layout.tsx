"use client";

import { BottomNav } from "@/components/ui/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SyncIndicator } from "@/components/SyncIndicator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <OfflineBanner />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 safe-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="font-bold text-primary-900">Guardian Electoral</span>
          </div>
          <SyncIndicator />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
