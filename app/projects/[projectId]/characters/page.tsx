// app/projects/[projectId]/characters/page.tsx
// 角色管理页 - 卡片展示 + CRUD

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Users,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Tag,
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
import { AIGenerateDialog } from "@/components/ai-generate-dialog";

/** 角色类型 */
interface Character {
  id: string;
  name: string;
  age: string;
  appearance: string;
  personality: string;
  backstory: string;
  hiddenLore: string;
  persona: string;
  tags: string;
  createdAt: string;
}

/** 角色表单 */
interface CharacterForm {
  name: string;
  age: string;
  appearance: string;
  personality: string;
  backstory: string;
  hiddenLore: string;
  persona: string;
}

const emptyForm: CharacterForm = {
  name: "",
  age: "",
  appearance: "",
  personality: "",
  backstory: "",
  hiddenLore: "",
  persona: "",
};

export default function CharactersPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CharacterForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showHidden, setShowHidden] = useState<Record<string, boolean>>({});
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  /** 加载角色列表 */
  const loadCharacters = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/characters`);
      const data = await res.json();
      if (data.success) setCharacters(data.data);
    } catch (err) {
      console.error("加载角色失败:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  /** 打开新建弹窗 */
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  /** 处理 AI 生成的结果 */
  const handleAIGenerate = (data: Record<string, unknown>) => {
    setEditingId(null);
    setForm({
      name: (data.name as string) || "",
      age: (data.age as string) || "",
      appearance: (data.appearance as string) || "",
      personality: (data.personality as string) || "",
      backstory: (data.backstory as string) || "",
      hiddenLore: (data.hiddenLore as string) || "",
      persona: (data.persona as string) || "",
    });
    setDialogOpen(true);
  };

  /** 打开编辑弹窗 */
  const openEdit = (char: Character) => {
    setEditingId(char.id);
    setForm({
      name: char.name,
      age: char.age,
      appearance: char.appearance,
      personality: char.personality,
      backstory: char.backstory,
      hiddenLore: char.hiddenLore,
      persona: char.persona,
    });
    setDialogOpen(true);
  };

  /** 保存角色 */
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/projects/${projectId}/characters/${editingId}`
        : `/api/projects/${projectId}/characters`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        loadCharacters();
      }
    } catch (err) {
      console.error("保存角色失败:", err);
    } finally {
      setSaving(false);
    }
  };

  /** 删除角色 */
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个角色吗？")) return;
    try {
      await fetch(`/api/projects/${projectId}/characters/${id}`, {
        method: "DELETE",
      });
      loadCharacters();
    } catch (err) {
      console.error("删除角色失败:", err);
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

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">角色管理</h2>
          <p className="text-muted-foreground mt-1">
            管理故事中的角色，定义他们的性格和背景
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
            新建角色
          </Button>
        </div>
      </div>

      {/* 角色列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : characters.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              title="还没有角色"
              description="创建你的第一个角色，让故事更加生动"
              action={
                <Button onClick={openCreate} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  创建角色
                </Button>
              }
            />
          </div>
        ) : (
          characters.map((char) => (
            <Card
              key={char.id}
              className="hover:shadow-md transition-smooth group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{char.name}</CardTitle>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(char)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(char.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
                {char.age && (
                  <p className="text-sm text-muted-foreground">
                    年龄：{char.age}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {char.personality && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      性格
                    </p>
                    <p className="text-sm line-clamp-2">{char.personality}</p>
                  </div>
                )}
                {char.appearance && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      外貌
                    </p>
                    <p className="text-sm line-clamp-2">{char.appearance}</p>
                  </div>
                )}
                {/* 隐藏设定 */}
                {char.hiddenLore && (
                  <div>
                    <button
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1"
                      onClick={() =>
                        setShowHidden((prev) => ({
                          ...prev,
                          [char.id]: !prev[char.id],
                        }))
                      }
                    >
                      {showHidden[char.id] ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      隐藏设定（仅 AI 可见）
                    </button>
                    {showHidden[char.id] && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 line-clamp-3">
                        {char.hiddenLore}
                      </p>
                    )}
                  </div>
                )}
                {/* 标签 */}
                {parseTags(char.tags).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {parseTags(char.tags).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
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
              {editingId ? "编辑角色" : "新建角色"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="charName">角色名称 *</Label>
                <Input
                  id="charName"
                  placeholder="亚瑟"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charAge">年龄</Label>
                <Input
                  id="charAge"
                  placeholder="25"
                  value={form.age}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, age: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="charAppearance">外貌描述</Label>
              <Textarea
                id="charAppearance"
                rows={2}
                placeholder="高大英俊，金色短发，蓝色眼眸..."
                value={form.appearance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, appearance: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charPersonality">性格描述</Label>
              <Textarea
                id="charPersonality"
                rows={2}
                placeholder="勇敢正义，但有时过于冲动..."
                value={form.personality}
                onChange={(e) =>
                  setForm((f) => ({ ...f, personality: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charBackstory">背景故事</Label>
              <Textarea
                id="charBackstory"
                rows={3}
                placeholder="出生于骑士世家，年幼时..."
                value={form.backstory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, backstory: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charPersona">
                角色专属 Prompt（AI 扮演时的语气和口癖）
              </Label>
              <Textarea
                id="charPersona"
                rows={2}
                placeholder="说话古风文雅，喜欢引用诗句..."
                value={form.persona}
                onChange={(e) =>
                  setForm((f) => ({ ...f, persona: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="charHidden"
                className="flex items-center gap-2"
              >
                <EyeOff className="h-4 w-4" />
                隐藏设定（仅 AI 可见，玩家不可见）
              </Label>
              <Textarea
                id="charHidden"
                rows={2}
                placeholder="实际上是叛军首领的间谍..."
                value={form.hiddenLore}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hiddenLore: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
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
        type="character"
        projectId={projectId}
        onGenerate={handleAIGenerate}
      />
    </div>
  );
}
