"use client";

import { useState } from "react";
import { AppStateProvider, useApp } from "@/components/app-state";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text shadow-xl">
          {t.message}
        </div>
      ))}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const { ready } = useApp();
  return (
    <div className="flex min-h-screen">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenu(true)} />
        <main className="flex-1">
          {ready ? (
            children
          ) : (
            <div className="space-y-4 p-6">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-2" />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-2" />
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-xl bg-surface-2" />
            </div>
          )}
        </main>
      </div>
      <Toasts />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <Shell>{children}</Shell>
    </AppStateProvider>
  );
}
