import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
