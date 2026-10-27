import { Suspense, type ReactNode } from "react";
import { BottomNav, BottomNavView, TopBar, TopBarView } from "@/components/nav";

// Static chrome only. Pages read the session themselves inside their own
// Suspense boundary, so this layout never waits on a request. The nav reads the
// current path, which isn't known while prerendering, so it renders without a
// highlighted tab until then.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-24 sm:pb-8">
      <Suspense fallback={<TopBarView pathname={null} />}>
        <TopBar />
      </Suspense>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
      <Suspense fallback={<BottomNavView pathname={null} />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
