// app/page.tsx
// 首页 Dashboard - 项目列表与统计

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  BookOpen,
  Users,
  Globe,
  Brain,
  FileText,
  Clock,
  Trash2,
  MoreHorizontal,
  Sparkles,
  Swords,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/app-store";

/** 项目数据类型 */
interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    characters: number;
    loreEntries: number;
    memories: number;
    messages: number;
  };
}

/** 统计数据 */
interface Stats {
  projects: number;
  characters: number;
  loreEntries: number;
  memories: number;
  messages: number;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({
    projects: 0,
    characters: 0,
    loreEntries: 0,
    memories: 0,
    messages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    type: "novel",
    description: "",
  });
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setCurrentProjectId } = useAppStore();

  // 回到首页时清除项目 ID
  useEffect(() => {
    setCurrentProjectId(null);
  }, [setCurrentProjectId]);

  /** 加载项目列表 */
  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
        // 计算统计
        const s: Stats = {
          projects: data.data.length,
          characters: 0,
          loreEntries: 0,
          memories: 0,
          messages: 0,
        };
        for (const p of data.data) {
          s.characters += p._count.characters;
          s.loreEntries += p._count.loreEntries;
          s.memories += p._count.memories;
          s.messages += p._count.messages;
        }
        setStats(s);
      }
    } catch (err) {
      console.error("加载项目失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  /** 创建新项目 */
  const handleCreate = async () => {
    if (!newProject.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        setNewProject({ name: "", type: "novel", description: "" });
        loadProjects();
        toast({
          title: "项目已创建",
          description: `「${newProject.name}」创建成功`,
          variant: "success",
        });
      }
    } catch (err) {
      toast({
        title: "创建失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  /** 导入项目 */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success) {
        loadProjects();
        toast({
          title: "导入成功",
          description: `项目「${result.data.name}」已导入`,
          variant: "success",
        });
      } else {
        toast({
          title: "导入失败",
          description: result.error || "请检查文件格式",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "导入失败",
        description: "请确保文件是有效的 JSON 格式",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /** 删除项目 */
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个项目吗？所有相关数据将被永久删除。")) return;
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      loadProjects();
      toast({ title: "项目已删除" });
    } catch (err) {
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const statItems = [
    { label: "项目数", value: stats.projects, icon: BookOpen, color: "text-blue-500" },
    { label: "角色数", value: stats.characters, icon: Users, color: "text-green-500" },
    { label: "知识库", value: stats.loreEntries, icon: Globe, color: "text-purple-500" },
    { label: "记忆数", value: stats.memories, icon: Brain, color: "text-orange-500" },
    { label: "消息数", value: stats.messages, icon: FileText, color: "text-pink-500" },
  ];

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8">
      {/* 欢迎区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            欢迎来到 StoryForge AI
          </h2>
          <p className="text-muted-foreground mt-1">
            开始创作你的下一个精彩故事
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {importing ? "导入中..." : "导入项目"}
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            新建项目
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statItems.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 项目列表 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">我的项目</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            // 加载骨架屏
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : projects.length === 0 ? (
            // 空状态
            <Card className="col-span-full border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  还没有项目，创建你的第一个故事吧！
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  创建第一个项目
                </Button>
              </CardContent>
            </Card>
          ) : (
            // 项目卡片列表
            projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}/workspace`}>
                <Card className="h-full hover:shadow-md hover:border-primary/50 transition-smooth cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {project.type === "trpg" ? (
                          <Swords className="h-5 w-5 text-orange-500" />
                        ) : (
                          <Sparkles className="h-5 w-5 text-blue-500" />
                        )}
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(project.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {project.type === "trpg" ? "跑团" : "小说"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project._count.characters}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {project._count.loreEntries}
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        {project._count.memories}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(project.updatedAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 新建项目弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建项目</DialogTitle>
            <DialogDescription>
              创建一个新的小说或跑团项目
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">项目名称</Label>
              <Input
                id="projectName"
                placeholder="如：《星辰大海》或《龙与地下城》"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>项目类型</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setNewProject((p) => ({ ...p, type: "novel" }))
                  }
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-smooth ${
                    newProject.type === "novel"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Sparkles className="h-6 w-6 text-blue-500" />
                  <span className="text-sm font-medium">小说创作</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewProject((p) => ({ ...p, type: "trpg" }))
                  }
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-smooth ${
                    newProject.type === "trpg"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Swords className="h-6 w-6 text-orange-500" />
                  <span className="text-sm font-medium">跑团 (TRPG)</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDesc">项目简介（可选）</Label>
              <Textarea
                id="projectDesc"
                rows={3}
                placeholder="简要描述你的故事背景..."
                value={newProject.description}
                onChange={(e) =>
                  setNewProject((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newProject.name.trim() || creating}
            >
              {creating ? "创建中..." : "创建项目"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
