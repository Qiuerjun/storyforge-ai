// app/projects/[projectId]/layout.tsx
// 项目子页面布局 - 提供项目内导航

"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  PenTool,
  Users,
  Globe,
  Brain,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

/** 项目内导航项 */
const projectNavItems = [
  { label: "创作空间", href: "workspace", icon: PenTool },
  { label: "角色", href: "characters", icon: Users },
  { label: "世界观", href: "lore", icon: Globe },
  { label: "记忆", href: "memory", icon: Brain },
  { label: "设置", href: "settings", icon: Settings },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const { setCurrentProjectId } = useAppStore();

  // 进入项目时，将项目 ID 保存到 store（供侧边栏导航使用）
  useEffect(() => {
    setCurrentProjectId(projectId);
  }, [projectId, setCurrentProjectId]);

  return (
    <div className="flex flex-col h-full">
      {/* 项目内标签导航 */}
      <nav className="border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center h-10 px-4 md:px-6 gap-1 overflow-x-auto">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mr-2 shrink-0"
          >
            <ArrowLeft className="h-3 w-3" />
            返回
          </Link>
          {projectNavItems.map((item) => {
            const href = `/projects/${projectId}/${item.href}`;
            const isActive = pathname.startsWith(href);

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-smooth shrink-0",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 子页面内容 */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
