// app/projects/[projectId]/settings/page.tsx
// 项目设置页

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Save, Trash2, Sparkles, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AIGenerateDialog } from "@/components/ai-generate-dialog";

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState({
    name: "",
    type: "novel",
    description: "",
    systemPrompt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setProject({
          name: data.data.name,
          type: data.data.type,
          description: data.data.description,
          systemPrompt: data.data.systemPrompt,
        });
      }
    } catch (err) {
      console.error("加载项目失败:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  /** 导出项目 */
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export`);
      if (!res.ok) {
        throw new Error("导出失败");
      }

      // 获取文件名
      const contentDisposition = res.headers.get("Content-Disposition");
      const fileNameRegex = /filename\*=UTF-8''(.+?)(?:;|$)/;
      const fileNameMatch = contentDisposition?.match(fileNameRegex);
      const fileName = fileNameMatch
        ? decodeURIComponent(fileNameMatch[1])
        : `project_${new Date().toISOString().slice(0, 10)}.json`;

      // 下载文件
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "导出成功",
        description: "项目数据已下载",
        variant: "success",
      });
    } catch {
      toast({
        title: "导出失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  /** 处理 AI 生成的结果 */
  const handleAIGenerate = (data: Record<string, unknown>) => {
    setProject((p) => ({
      ...p,
      description: (data.description as string) || p.description,
      systemPrompt: (data.systemPrompt as string) || p.systemPrompt,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "保存成功", variant: "success" });
      }
    } catch (err) {
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">项目设置</h2>
        <p className="text-muted-foreground mt-1">
          配置项目的基本信息和 AI 行为
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setAiDialogOpen(true)}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI 生成项目信息
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {exporting ? "导出中..." : "导出项目"}
        </Button>
        <p className="text-sm text-muted-foreground">
          使用 AI 自动生成项目描述和系统提示词
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>项目的名称和描述</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projName">项目名称</Label>
            <Input
              id="projName"
              value={project.name}
              onChange={(e) =>
                setProject((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projDesc">项目描述</Label>
            <Textarea
              id="projDesc"
              rows={3}
              value={project.description}
              onChange={(e) =>
                setProject((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 行为设定</CardTitle>
          <CardDescription>
            定义此项目的专属 System Prompt，AI 在创作时会遵循这些设定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projPrompt">项目 System Prompt</Label>
            <Textarea
              id="projPrompt"
              rows={6}
              placeholder="这是一个发生在中世纪奇幻世界的故事...&#10;主要角色有...&#10;故事的核心冲突是..."
              value={project.systemPrompt}
              onChange={(e) =>
                setProject((p) => ({ ...p, systemPrompt: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              这段文字会在每次对话时作为 AI 的背景知识注入
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "保存中..." : "保存设置"}
        </Button>
      </div>

      {/* AI 生成对话框 */}
      <AIGenerateDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        type="project"
        projectId={projectId}
        onGenerate={handleAIGenerate}
      />
    </div>
  );
}
