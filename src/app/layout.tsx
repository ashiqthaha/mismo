import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

// Headings only. next/font downloads it at build time and serves it from our own server.
const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Mismo", template: "%s · Mismo" },
  description: "Find, plan and track the work on your home.",
  appleWebApp: { capable: true, title: "Mismo", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b5d41",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${fraunces.variable}`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
