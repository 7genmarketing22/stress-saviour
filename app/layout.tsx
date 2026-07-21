import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stress Saviors - Pakistan Telehealth Platform",
  description:
    "Connect with verified mental health professionals and doctors across Pakistan. Online appointments, video consultations, and chat services.",
  keywords: [
    "telehealth",
    "pakistan",
    "mental health",
    "online consultation",
    "doctors",
    "psychiatrist",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-32.png", type: "image/png", sizes: "32x32" },
      { url: "/logo-48.png", type: "image/png", sizes: "48x48" },
      { url: "/logo-96.png", type: "image/png", sizes: "96x96" },
      { url: "/logo-144.png", type: "image/png", sizes: "144x144" },
      { url: "/logo-192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/logo-192.png", sizes: "192x192", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StressSaviors",
  },
};

export const viewport: Viewport = {
  themeColor: "#0080b8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
