import type { Metadata } from "next";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["400","500","600","700"], display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["400","500","600","700"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400","500"], display: "swap" });

export const metadata: Metadata = {
  title: "RoundReady",
  description: "Angel rounding and QAPI compliance for skilled nursing facilities",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
