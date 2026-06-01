// components/ai-generate-dialog.tsx
// AI 内容生成对话框 - 通用组件，用于角色、世界观、项目信息的 AI 生成

"use client";

import React, { useState, useRef } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/stores/settings-store";

/** 生成类型 */
export type GenerateType = "character" | "lore" | "project";

/** 生成选项 */
export interface GenerateOptions {
  useWorldContext?: boolean;
  useOtherCharacters?: boolean;
}

/** 组件 Props */
interface AIGenerateDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onOpenChange: (open: boolean) => void;
  /** 生成类型 */
  type: GenerateType;
  /** 项目 ID */
  projectId: string;
  /** 生成成功回调 - 返回生成的数据 */
  onGenerate: (data: Record<string, unknown>) => void;
}

/** 生成类型的中文名称 */
const typeLabels: Record<GenerateType, string> = {
  character: "角色",
  lore: "世界观词条",
  project: "项目信息",
};

export function AIGenerateDialog({
  open,
  onOpenChange,
  type,
  projectId,
  onGenerate,
}: AIGenerateDialogProps) {
  const { modelConfig } = useSettingsStore();

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [options, setOptions] = useState<GenerateOptions>({
    useWorldContext: true,
    useOtherCharacters: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  /** 取消生成 */
  const handleCancel = () => {
    if (generating) {
      setShowCancelConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  /** 确认取消生成 */
  const confirmCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGenerating(false);
    setShowCancelConfirm(false);
    toast({
      title: "已取消生成",
      description: "AI 生成已取消",
    });
  };

  /** 执行生成 */
  const handleGenerate = async () => {
    setGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          projectId,
          prompt: prompt.trim() || undefined,
          modelConfig,
          options: type === "character" ? options : undefined,
        }),
        signal: abortController.signal,
      });

      const data = await res.json();

      if (data.success) {
        onGenerate(data.data);
        onOpenChange(false);
        setPrompt("");
        toast({
          title: "生成成功",
          description: `${typeLabels[type]}内容已生成`,
          variant: "success",
        });
      } else {
        toast({
          title: "生成失败",
          description: data.error || "请检查模型配置",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // 用户取消，不显示错误提示
      } else {
        toast({
          title: "生成失败",
          description: "无法连接到 AI 服务，请检查模型配置",
          variant: "destructive",
        });
      }
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleCancel(); else onOpenChange(true); }}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => { if (generating) { e.preventDefault(); handleCancel(); } }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 生成{typeLabels[type]}
          </DialogTitle>
          <DialogDescription>
            {type === "character"
              ? "描述你想要的角色特点，AI 将为你生成完整的角色信息"
              : type === "lore"
                ? "描述你想要的世界观元素，AI 将为你生成详细的词条"
                : "描述你的项目构想，AI 将为你生成项目描述和系统提示词"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 自定义提示词 */}
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">
              提示词（可选）
            </Label>
            <Textarea
              id="ai-prompt"
              rows={3}
              placeholder={
                type === "character"
                  ? "如：一个来自北方的精灵弓箭手，性格冷酷但内心善良..."
                  : type === "lore"
                    ? "如：一座漂浮在云端的神秘城市，拥有古老的魔法学院..."
                    : "如：一个赛博朋克风格的侦探故事，主角是一名退役的黑客..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground">
              不填写则根据项目现有信息自动发挥
            </p>
          </div>

          {/* 角色生成选项 */}
          {type === "character" && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">生成选项</p>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="opt-world" className="text-sm">
                    根据世界观和基本信息生成
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    AI 将参考项目的世界观设定和描述来生成角色
                  </p>
                </div>
                <Switch
                  id="opt-world"
                  checked={options.useWorldContext}
                  onCheckedChange={(checked) =>
                    setOptions((o) => ({ ...o, useWorldContext: checked }))
                  }
                  disabled={generating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="opt-chars" className="text-sm">
                    和其他角色相关后生成
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    AI 将参考已有角色的信息来生成有关联的新角色
                  </p>
                </div>
                <Switch
                  id="opt-chars"
                  checked={options.useOtherCharacters}
                  onCheckedChange={(checked) =>
                    setOptions((o) => ({ ...o, useOtherCharacters: checked }))
                  }
                  disabled={generating}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            {generating ? "取消生成" : "取消"}
          </Button>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                开始生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* 取消确认对话框 */}
    <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>确认取消生成</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          确定要取消当前的 AI 生成吗？取消后将不会获得生成结果。
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
            继续生成
          </Button>
          <Button variant="destructive" onClick={confirmCancel}>
            确认取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
