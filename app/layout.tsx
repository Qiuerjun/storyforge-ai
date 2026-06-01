// app/layout.tsx
// 根布局 - Sidebar + Header + 主内容区

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StoryForge AI - 本地化 AI 创作平台",
  description:
    "为小说家和跑团玩家打造的 AI 辅助创作环境，深度结合世界观、角色与记忆管理。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden">
        <Providers>
          <div className="flex h-full">
            {/* 桌面端侧边栏 */}
            <Sidebar />

            {/* 移动端侧边栏 */}
            <MobileSidebar />

            {/* 主内容区 */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <Header />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
