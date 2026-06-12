import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      {/* Suspense: Sidebar reads useSearchParams to track the active chat */}
      <Suspense fallback={null}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </RequireAuth>
  );
}
