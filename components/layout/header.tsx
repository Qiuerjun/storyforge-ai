// components/layout/header.tsx
// 顶部栏 - 面包屑 + 操作按钮

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";

/** 根据路径生成面包屑标签 */
function getBreadcrumb(pathname: string): string {
  if (pathname === "/") return "首页";
  const segments = pathname.split("/").filter(Boolean);
  const nameMap: Record<string, string> = {
    workspace: "创作空间",
    characters: "角色管理",
    lore: "世界观",
    memory: "记忆索引",
    settings: "设置",
  };
  return segments.map((s) => nameMap[s] || s).join(" / ");
}

export function Header() {
  const pathname = usePathname();
  const { setMobileSidebarOpen } = useAppStore();
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <header className="flex items-center h-14 px-4 md:px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* 移动端菜单按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden mr-2"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">打开菜单</span>
      </Button>

      {/* 面包屑 */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-medium text-foreground">{breadcrumb}</h1>
      </div>

      {/* 右侧操作区 */}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-5 w-5" />
          <span className="sr-only">通知</span>
        </Button>
      </div>
    </header>
  );
}
