"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shamrock } from "./birds";

const MAIN = [
  { href: "/", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/walk", label: "Walk", icon: "M12 3a2 2 0 110 4 2 2 0 010-4zM9 21l2-7-2-2V8l3-1 3 3 3 1M11 14l3 2 1 5" },
  { href: "/findings", label: "Findings", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/projects", label: "Projects", icon: "M4 5h6v14H4zM14 5h6v8h-6z" },
  { href: "/maintenance", label: "Upkeep", icon: "M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** The top bar. `pathname` is null in the prerendered shell, before the current page is known. */
export function TopBarView({ pathname }: { pathname: string | null }) {
  const tab = (href: string) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive(pathname, href) ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10 hover:text-white"}`;
  return (
    <header className="sticky top-0 z-20 bg-brand-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Shamrock className="h-7 w-7 text-brand-50" />
          <span className="font-display text-xl font-semibold text-sand-50">Mismo</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          {MAIN.map((item) => (
            <Link key={item.href} href={item.href} className={tab(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/home" className={tab("/home")}>House</Link>
          <Link href="/settings" className={tab("/settings")}>Settings</Link>
        </div>
      </div>
      <div className="henna-band" aria-hidden />
    </header>
  );
}

export function BottomNavView({ pathname }: { pathname: string | null }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="grid grid-cols-5">
        {MAIN.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center gap-0.5 pb-2 text-[11px] font-medium ${active ? "text-brand-700" : "text-sand-500"}`}
            >
              {/* A saffron marker over the current tab. */}
              <span className={`mb-1 h-[3px] w-6 rounded-b-full ${active ? "bg-saffron-500" : "bg-transparent"}`} />
              <Icon d={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar() {
  return <TopBarView pathname={usePathname()} />;
}

export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}
