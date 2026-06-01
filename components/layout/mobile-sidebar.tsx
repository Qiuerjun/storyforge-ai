// components/layout/mobile-sidebar.tsx
// 移动端侧边栏 - 抽屉式

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PenTool,
  Users,
  Globe,
  Brain,
  Settings,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAppStore } from "@/stores/app-store";

/** 导航项定义 */
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  matchPrefix?: boolean;
  needProject?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: "首页", href: "/", icon: Home },
  { label: "创作空间", href: "/workspace", icon: PenTool, matchPrefix: true, needProject: true },
  { label: "角色管理", href: "/characters", icon: Users, matchPrefix: true, needProject: true },
  { label: "世界观", href: "/lore", icon: Globe, matchPrefix: true, needProject: true },
  { label: "记忆索引", href: "/memory", icon: Brain, matchPrefix: true, needProject: true },
];

const bottomNavItems: NavItem[] = [
  { label: "设置", href: "/settings", icon: Settings },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const { mobileSidebarOpen, setMobileSidebarOpen, currentProjectId } = useAppStore();

  // 从 URL 或 store 获取项目 ID
  const urlMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = urlMatch ? urlMatch[1] : currentProjectId;

  if (!mobileSidebarOpen) return null;

  /** 渲染导航链接 */
  const renderNavLink = (item: NavItem) => {
    let fullHref = item.href;
    let disabled = false;

    if (item.needProject) {
      if (projectId) {
        fullHref = `/projects/${projectId}${item.href}`;
      } else {
        disabled = true;
        fullHref = "#";
      }
    }

    const isActive = !disabled && (item.matchPrefix
      ? pathname.startsWith(fullHref)
      : pathname === fullHref);

    if (disabled) {
      return (
        <div
          key={item.href}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/30 cursor-not-allowed"
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span>{item.label}</span>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={fullHref}
        onClick={() => setMobileSidebarOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/70"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden animate-in fade-in-0"
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* 侧边栏面板 */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border md:hidden animate-in slide-in-from-left">
        <div className="flex flex-col h-full">
          {/* Logo + 关闭按钮 */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
                StoryForge
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* 主导航 */}
          <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
            {mainNavItems.map(renderNavLink)}
          </nav>

          <Separator className="mx-3 bg-sidebar-border" />

          {/* 底部导航 */}
          <div className="flex flex-col gap-1 p-3">
            {bottomNavItems.map(renderNavLink)}

            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
