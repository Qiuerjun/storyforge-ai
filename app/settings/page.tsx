// app/settings/page.tsx
// 全局设置页 - 模型配置、主题切换

"use client";

import React, { useState, useEffect } from "react";
import { Save, RotateCcw, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settings-store";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { modelConfig, setModelConfig } = useSettingsStore();
  const { setCurrentProjectId } = useAppStore();
  const { theme, setTheme } = useTheme();

  // 进入设置页时清除项目 ID
  useEffect(() => {
    setCurrentProjectId(null);
  }, [setCurrentProjectId]);
  const [saved, setSaved] = useState(false);

  // 本地表单状态
  const [form, setForm] = useState({ ...modelConfig });

  // 模型列表相关状态
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelsFetched, setModelsFetched] = useState(false);

  /** 更新表单字段 */
  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /** 获取模型列表 */
  const handleFetchModels = async () => {
    if (!form.apiBaseUrl.trim()) {
      toast({
        title: "请先填写 API Base URL",
        variant: "destructive",
      });
      return;
    }

    setFetchingModels(true);
    setAvailableModels([]);
    setModelsFetched(false);

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiBaseUrl: form.apiBaseUrl,
          apiKey: form.apiKey,
        }),
      });
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        setAvailableModels(data.data);
        setModelsFetched(true);
        toast({
          title: "获取成功",
          description: `找到 ${data.data.length} 个可用模型`,
          variant: "success",
        });
      } else {
        toast({
          title: "未找到模型",
          description: data.error || "请检查 API 地址和 Key 是否正确",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "获取失败",
        description: "无法连接到 API 服务器",
        variant: "destructive",
      });
    } finally {
      setFetchingModels(false);
    }
  };

  /** 从下拉列表选择模型 */
  const handleSelectModel = (modelName: string) => {
    updateField("modelName", modelName);
  };

  /** 保存设置 */
  const handleSave = () => {
    setModelConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /** 重置为默认值 */
  const handleReset = () => {
    const defaults = {
      apiBaseUrl: "http://localhost:11434/v1",
      apiKey: "",
      modelName: "llama3",
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 4096,
      systemPrompt:
        "你是一位经验丰富的作家和故事讲述者。你擅长创作生动的叙事、刻画鲜明的角色，并能根据用户的需求进行小说创作或跑团辅助。",
    };
    setForm(defaults);
    setModelConfig(defaults);
    setAvailableModels([]);
    setModelsFetched(false);
  };

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">设置</h2>
        <p className="text-muted-foreground mt-1">
          配置 AI 模型连接和应用偏好
        </p>
      </div>

      {/* 模型配置 */}
      <Card>
        <CardHeader>
          <CardTitle>AI 模型配置</CardTitle>
          <CardDescription>
            配置 OpenAI 兼容 API 的连接参数（支持 Ollama、vLLM、OpenAI 等）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Base URL */}
          <div className="space-y-2">
            <Label htmlFor="apiBaseUrl">API Base URL</Label>
            <Input
              id="apiBaseUrl"
              placeholder="http://localhost:11434/v1"
              value={form.apiBaseUrl}
              onChange={(e) => {
                updateField("apiBaseUrl", e.target.value);
                if (modelsFetched) {
                  setModelsFetched(false);
                  setAvailableModels([]);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Ollama 默认：http://localhost:11434/v1 | OpenAI：https://api.openai.com/v1
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-...（Ollama 可留空）"
              value={form.apiKey}
              onChange={(e) => updateField("apiKey", e.target.value)}
            />
          </div>

          {/* 模型名称 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="modelName">模型名称</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                disabled={fetchingModels || !form.apiBaseUrl.trim()}
                className="gap-1.5 h-7 text-xs"
              >
                {fetchingModels ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {fetchingModels ? "获取中..." : "获取模型列表"}
              </Button>
            </div>

            {modelsFetched && availableModels.length > 0 && (
              <Select value={form.modelName} onValueChange={handleSelectModel}>
                <SelectTrigger>
                  <SelectValue placeholder="从列表中选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input
              id="modelName"
              placeholder="llama3 / gpt-4o / qwen2"
              value={form.modelName}
              onChange={(e) => updateField("modelName", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {modelsFetched
                ? "可从上方下拉列表选择，也可手动输入自定义模型名称"
                : "点击「获取模型列表」自动获取可用模型，或直接手动输入"}
            </p>
          </div>

          <Separator />

          {/* 高级参数 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">
                Temperature：{form.temperature}
              </Label>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={form.temperature}
                onChange={(e) =>
                  updateField("temperature", parseFloat(e.target.value))
                }
                className="accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                越低越确定，越高越有创意
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topP">Top-P：{form.topP}</Label>
              <Input
                id="topP"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.topP}
                onChange={(e) =>
                  updateField("topP", parseFloat(e.target.value))
                }
                className="accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                核采样阈值，控制多样性
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">最大 Token 数</Label>
              <Input
                id="maxTokens"
                type="number"
                min="256"
                max="128000"
                value={form.maxTokens}
                onChange={(e) =>
                  updateField("maxTokens", parseInt(e.target.value) || 4096)
                }
              />
            </div>
          </div>

          <Separator />

          {/* 系统预设 Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">系统预设 Prompt</Label>
            <Textarea
              id="systemPrompt"
              rows={4}
              placeholder="定义 AI 的默认行为和风格..."
              value={form.systemPrompt}
              onChange={(e) => updateField("systemPrompt", e.target.value)}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} className="gap-2">
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存设置
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              恢复默认
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 主题设置 */}
      <Card>
        <CardHeader>
          <CardTitle>外观设置</CardTitle>
          <CardDescription>选择你喜欢的主题风格</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-smooth ${
                  theme === t
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-2xl">
                  {t === "light" ? "☀️" : t === "dark" ? "🌙" : "💻"}
                </span>
                <span className="text-sm font-medium">
                  {t === "light" ? "浅色" : t === "dark" ? "深色" : "跟随系统"}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
