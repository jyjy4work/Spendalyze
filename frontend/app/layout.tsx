import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnalysisProvider } from "@/app/context/AnalysisContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spendalyze",
  description: "법인카드 지출 내역 분석 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}
