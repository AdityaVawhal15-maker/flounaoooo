import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { CartProvider } from "@/lib/cart";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ToastProvider>
        <CartProvider>
          {/* Suspense: Sidebar reads useSearchParams to track the active chat */}
          <Suspense fallback={null}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </CartProvider>
      </ToastProvider>
    </RequireAuth>
  );
}
