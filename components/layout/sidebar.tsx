// components/layout/sidebar.tsx
// 左侧导航栏 - 可折叠，支持响应式

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
  ChevronLeft,
  ChevronRight,
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
  /** 匹配前缀即可（用于子路由） */
  matchPrefix?: boolean;
  /** 是否需要项目上下文 */
  needProject?: boolean;
}

/** 主导航项 */
const mainNavItems: NavItem[] = [
  { label: "首页", href: "/", icon: Home },
  { label: "创作空间", href: "/workspace", icon: PenTool, matchPrefix: true, needProject: true },
  { label: "角色管理", href: "/characters", icon: Users, matchPrefix: true, needProject: true },
  { label: "世界观", href: "/lore", icon: Globe, matchPrefix: true, needProject: true },
  { label: "记忆索引", href: "/memory", icon: Brain, matchPrefix: true, needProject: true },
];

/** 底部导航项 */
const bottomNavItems: NavItem[] = [
  { label: "设置", href: "/settings", icon: Settings },
];

/** 获取当前项目 ID（从 URL 或 store） */
function useProjectId(): string | null {
  const pathname = usePathname();
  const { currentProjectId } = useAppStore();

  // 优先从 URL 中提取
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (match) return match[1];

  // 否则使用 store 中保存的
  return currentProjectId;
}

/** 导航链接组件 */
function NavLink({
  item,
  collapsed,
  projectId,
}: {
  item: NavItem;
  collapsed: boolean;
  projectId: string | null;
}) {
  const pathname = usePathname();

  // 计算实际 href
  let fullHref = item.href;
  let disabled = false;

  if (item.needProject) {
    if (projectId) {
      fullHref = `/projects/${projectId}${item.href}`;
    } else {
      // 没有项目上下文，禁用链接
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
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
          "text-sidebar-foreground/30 cursor-not-allowed",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? `${item.label}（请先选择项目）` : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </div>
    );
  }

  return (
    <Link
      href={fullHref}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/70",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

/** 侧边栏主组件 */
export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const projectId = useProjectId();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300 ease-in-out",
        sidebarOpen ? "w-60" : "w-16"
      )}
    >
      {/* Logo 区域 */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
              StoryForge
            </span>
          )}
        </Link>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={!sidebarOpen}
            projectId={projectId}
          />
        ))}
      </nav>

      <Separator className="mx-3 bg-sidebar-border" />

      {/* 底部导航 */}
      <div className="flex flex-col gap-1 p-3">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={!sidebarOpen}
            projectId={projectId}
          />
        ))}

        {/* 主题切换 */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2",
            !sidebarOpen && "justify-center px-2"
          )}
        >
          <ThemeToggle collapsed={!sidebarOpen} />
        </div>
      </div>

      {/* 折叠按钮 */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
