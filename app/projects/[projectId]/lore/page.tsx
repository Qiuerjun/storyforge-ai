// app/projects/[projectId]/lore/page.tsx
// 知识库管理页 - Wiki 式词条管理

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Globe,
  Edit3,
  Trash2,
  Search,
  Tag,
  Filter,
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/use-debounce";
import { AIGenerateDialog } from "@/components/ai-generate-dialog";

/** 词条类型 */
interface LoreEntry {
  id: string;
  title: string;
  content: string;
  keywords: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

/** 词条表单 */
interface LoreForm {
  title: string;
  content: string;
  keywords: string;
  category: string;
}

const emptyForm: LoreForm = {
  title: "",
  content: "",
  keywords: "",
  category: "general",
};

/** 分类选项 */
const categories = [
  { value: "general", label: "通用" },
  { value: "geography", label: "地理" },
  { value: "history", label: "历史" },
  { value: "magic", label: "魔法/科技" },
  { value: "character", label: "人物" },
  { value: "event", label: "事件" },
  { value: "faction", label: "阵营" },
  { value: "item", label: "物品" },
];

export default function LorePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [entries, setEntries] = useState<LoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LoreForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  /** 加载词条列表 */
  const loadEntries = useCallback(async () => {
    try {
      const url = filterCategory
        ? `/api/projects/${projectId}/lore?category=${filterCategory}`
        : `/api/projects/${projectId}/lore`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setEntries(data.data);
    } catch (err) {
      console.error("加载知识库失败:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, filterCategory]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  /** 过滤词条 */
  const filteredEntries = entries.filter(
    (e) =>
      !debouncedSearch ||
      e.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      e.content.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  /** 打开新建弹窗 */
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  /** 处理 AI 生成的结果 */
  const handleAIGenerate = (data: Record<string, unknown>) => {
    setEditingId(null);
    const keywords = Array.isArray(data.keywords)
      ? (data.keywords as string[]).join(", ")
      : (data.keywords as string) || "";
    setForm({
      title: (data.title as string) || "",
      content: (data.content as string) || "",
      keywords,
      category: (data.category as string) || "general",
    });
    setDialogOpen(true);
  };

  /** 打开编辑弹窗 */
  const openEdit = (entry: LoreEntry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      content: entry.content,
      keywords: entry.keywords,
      category: entry.category,
    });
    setDialogOpen(true);
  };

  /** 保存词条 */
  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      // 将逗号分隔的关键词转为 JSON 数组
      const keywordsArray = form.keywords
        .split(/[,，、]/)
        .map((k) => k.trim())
        .filter(Boolean);

      const url = editingId
        ? `/api/projects/${projectId}/lore/${editingId}`
        : `/api/projects/${projectId}/lore`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          keywords: keywordsArray,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        loadEntries();
      }
    } catch (err) {
      console.error("保存词条失败:", err);
    } finally {
      setSaving(false);
    }
  };

  /** 删除词条 */
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个词条吗？")) return;
    try {
      await fetch(`/api/projects/${projectId}/lore/${id}`, {
        method: "DELETE",
      });
      loadEntries();
    } catch (err) {
      console.error("删除词条失败:", err);
    }
  };

  /** 解析关键词 */
  const parseKeywords = (kw: string): string[] => {
    try {
      return JSON.parse(kw);
    } catch {
      return [];
    }
  };

  /** 获取分类标签颜色 */
  const getCategoryColor = (cat: string) => {
    const map: Record<string, string> = {
      general: "bg-gray-500",
      geography: "bg-green-500",
      history: "bg-amber-500",
      magic: "bg-purple-500",
      character: "bg-blue-500",
      event: "bg-red-500",
      faction: "bg-orange-500",
      item: "bg-cyan-500",
    };
    return map[cat] || "bg-gray-500";
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">世界观 & 知识库</h2>
          <p className="text-muted-foreground mt-1">
            管理世界观设定，AI 会在对话中自动引用相关词条
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAiDialogOpen(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI 生成
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            新建词条
          </Button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索词条..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 词条列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : filteredEntries.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Globe}
              title={searchQuery ? "没有找到匹配的词条" : "还没有词条"}
              description={
                searchQuery
                  ? "尝试其他关键词搜索"
                  : "创建世界观词条，AI 会在对话中自动引用"
              }
              action={
                !searchQuery && (
                  <Button
                    onClick={openCreate}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    创建词条
                  </Button>
                )
              }
            />
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <Card
              key={entry.id}
              className="hover:shadow-md transition-smooth group cursor-pointer"
              onClick={() => openEdit(entry)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${getCategoryColor(entry.category)}`}
                    />
                    <CardTitle className="text-base">{entry.title}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                <Badge variant="outline" className="w-fit text-xs">
                  {categories.find((c) => c.value === entry.category)?.label ||
                    entry.category}
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                {entry.content && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {entry.content}
                  </p>
                )}
                {parseKeywords(entry.keywords).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {parseKeywords(entry.keywords)
                      .slice(0, 5)
                      .map((kw, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs"
                        >
                          <Tag className="h-2 w-2 mr-1" />
                          {kw}
                        </Badge>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "编辑词条" : "新建词条"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loreTitle">词条标题 *</Label>
                <Input
                  id="loreTitle"
                  placeholder="凛冬城"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loreCategory">分类</Label>
                <select
                  id="loreCategory"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loreContent">词条内容</Label>
              <Textarea
                id="loreContent"
                rows={6}
                placeholder="描述这个世界观元素的详细信息...（支持 Markdown）"
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loreKeywords">
                触发关键词（逗号分隔，对话中出现时自动注入）
              </Label>
              <Input
                id="loreKeywords"
                placeholder="凛冬, 北境, 长城, 史塔克"
                value={form.keywords}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keywords: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                当用户消息包含这些关键词时，AI 会自动参考此词条
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.title.trim() || saving}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 生成对话框 */}
      <AIGenerateDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        type="lore"
        projectId={projectId}
        onGenerate={handleAIGenerate}
      />
    </div>
  );
}
