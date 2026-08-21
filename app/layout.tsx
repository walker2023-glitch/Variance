import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Variance — Budgeting",
  description:
    "Sub-5-second expense logging with receipt OCR and real analytics.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Variance",
    statusBarStyle: "default",
  },
  applicationName: "Variance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
