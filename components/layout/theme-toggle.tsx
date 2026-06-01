// components/layout/theme-toggle.tsx
// 主题切换组件 - 支持浅色/深色/跟随系统

"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** 是否折叠状态（只显示图标） */
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  /** 循环切换主题：light → dark → system → light */
  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  /** 获取当前主题图标 */
  const getIcon = () => {
    if (theme === "light") return <Sun className="h-5 w-5" />;
    if (theme === "dark") return <Moon className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  /** 获取主题标签 */
  const getLabel = () => {
    if (theme === "light") return "浅色模式";
    if (theme === "dark") return "深色模式";
    return "跟随系统";
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth",
        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        collapsed && "justify-center px-2"
      )}
      title={getLabel()}
    >
      {getIcon()}
      {!collapsed && <span>{getLabel()}</span>}
    </button>
  );
}
