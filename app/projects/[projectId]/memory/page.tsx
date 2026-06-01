// app/projects/[projectId]/memory/page.tsx
// 记忆索引页 - 时间轴展示 + 手动管理

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Brain,
  Trash2,
  Edit3,
  Tag,
  Clock,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/stores/settings-store";

/** 记忆类型 */
interface Memory {
  id: string;
  content: string;
  tags: string;
  importance: number;
  createdAt: string;
}

export default function MemoryPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { modelConfig } = useSettingsStore();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ content: "", tags: "", importance: 5 });
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  /** 加载记忆列表 */
  const loadMemories = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/memory?limit=100`);
      const data = await res.json();
      if (data.success) setMemories(data.data.items);
    } catch (err) {
      console.error("加载记忆失败:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  /** 自动提取记忆 */
  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/memory/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelConfig }),
      });
      const data = await res.json();
      if (data.success) {
        loadMemories();
        toast({
          title: "记忆提取完成",
          description: data.message || `提取了 ${data.data?.length || 0} 条记忆`,
          variant: "success",
        });
      } else {
        toast({
          title: "提取失败",
          description: data.error || "请检查模型配置是否正确",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "提取失败",
        description: "请检查模型配置是否正确",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  /** 打开新建弹窗 */
  const openCreate = () => {
    setEditingId(null);
    setForm({ content: "", tags: "", importance: 5 });
    setDialogOpen(true);
  };

  /** 打开编辑弹窗 */
  const openEdit = (mem: Memory) => {
    setEditingId(mem.id);
    setForm({
      content: mem.content,
      tags: mem.tags,
      importance: mem.importance,
    });
    setDialogOpen(true);
  };

  /** 保存记忆 */
  const handleSave = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      const tagsArray = form.tags
        .split(/[,，、]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const url = editingId
        ? `/api/projects/${projectId}/memory/${editingId}`
        : `/api/projects/${projectId}/memory`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: form.content,
          tags: tagsArray,
          importance: form.importance,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        loadMemories();
      }
    } catch (err) {
      console.error("保存记忆失败:", err);
    } finally {
      setSaving(false);
    }
  };

  /** 删除记忆 */
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条记忆吗？")) return;
    try {
      await fetch(`/api/projects/${projectId}/memory/${id}`, {
        method: "DELETE",
      });
      loadMemories();
    } catch (err) {
      console.error("删除记忆失败:", err);
    }
  };

  /** 解析标签 */
  const parseTags = (tagsStr: string): string[] => {
    try {
      return JSON.parse(tagsStr);
    } catch {
      return [];
    }
  };

  /** 重要性颜色 */
  const getImportanceColor = (imp: number) => {
    if (imp >= 8) return "text-red-500";
    if (imp >= 5) return "text-orange-500";
    return "text-muted-foreground";
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">记忆索引</h2>
          <p className="text-muted-foreground mt-1">
            AI 自动提取的关键事实，也可手动管理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExtract}
            disabled={extracting}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {extracting ? "提取中..." : "自动提取"}
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Brain className="h-4 w-4" />
            手动添加
          </Button>
        </div>
      </div>

      {/* 记忆列表 */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : memories.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="还没有记忆"
            description="AI 会在对话后自动提取关键事实，也可以手动添加"
            action={
              <div className="flex gap-2">
                <Button
                  onClick={handleExtract}
                  variant="outline"
                  className="gap-2"
                  disabled={extracting}
                >
                  <Sparkles className="h-4 w-4" />
                  自动提取
                </Button>
                <Button onClick={openCreate} variant="outline" className="gap-2">
                  <Brain className="h-4 w-4" />
                  手动添加
                </Button>
              </div>
            }
          />
        ) : (
          // 时间轴样式
          <div className="relative pl-8">
            {/* 时间轴线 */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

            {memories.map((mem) => (
              <div key={mem.id} className="relative mb-4 group">
                {/* 时间轴节点 */}
                <div
                  className={`absolute left-[-20px] top-4 w-3 h-3 rounded-full border-2 border-background ${getImportanceColor(mem.importance) === "text-red-500" ? "bg-red-500" : getImportanceColor(mem.importance) === "text-orange-500" ? "bg-orange-500" : "bg-muted-foreground/50"}`}
                />

                <Card className="hover:shadow-sm transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm">{mem.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(mem.createdAt)}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <Star
                              className={`h-3 w-3 ${getImportanceColor(mem.importance)}`}
                            />
                            重要性 {mem.importance}/10
                          </span>
                          {parseTags(mem.tags).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {parseTags(mem.tags)
                                .slice(0, 3)
                                .map((tag, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="text-xs py-0"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(mem)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete(mem.id)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "编辑记忆" : "添加记忆"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="memContent">记忆内容 *</Label>
              <Textarea
                id="memContent"
                rows={3}
                placeholder="亚瑟在决斗中折断了圣剑..."
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memTags">标签（逗号分隔）</Label>
              <Input
                id="memTags"
                placeholder="亚瑟, 圣剑, 战斗"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memImportance">
                重要性：{form.importance}/10
              </Label>
              <Input
                id="memImportance"
                type="range"
                min="1"
                max="10"
                value={form.importance}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    importance: parseInt(e.target.value),
                  }))
                }
                className="accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>低</span>
                <span>高</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.content.trim() || saving}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
