// components/layout/header.tsx
// 顶部栏 - 面包屑 + 项目类型 + 操作按钮

"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/** 从路径中提取项目 ID */
function getProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export function Header() {
  const pathname = usePathname();
  const { setMobileSidebarOpen, currentProjectType, setCurrentProjectType } = useAppStore();
  const breadcrumb = getBreadcrumb(pathname);
  const projectId = getProjectIdFromPath(pathname);

  // 当进入项目页面时，获取项目类型
  useEffect(() => {
    if (!projectId) {
      setCurrentProjectType(null);
      return;
    }

    const fetchProjectType = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (data.success) {
          setCurrentProjectType(data.data.type);
        }
      } catch (err) {
        console.error("获取项目类型失败:", err);
      }
    };

    fetchProjectType();
  }, [projectId, setCurrentProjectType]);

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
        {/* 项目类型标签 */}
        {projectId && currentProjectType && (
          <Badge variant="secondary" className="gap-1">
            {currentProjectType === "trpg" ? (
              <>
                <Swords className="h-3 w-3 text-orange-500" />
                <span>跑团</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-blue-500" />
                <span>小说</span>
              </>
            )}
          </Badge>
        )}
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
