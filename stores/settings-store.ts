// stores/settings-store.ts
// 设置状态管理 - 模型配置等

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 模型配置接口 */
export interface ModelConfig {
  /** API 基础 URL（如 http://localhost:11434/v1 或 https://api.openai.com/v1） */
  apiBaseUrl: string;
  /** API Key */
  apiKey: string;
  /** 模型名称（如 gpt-4o, llama3, qwen2） */
  modelName: string;
  /** 温度参数 0-2 */
  temperature: number;
  /** Top-P 参数 0-1 */
  topP: number;
  /** 最大 Token 数 */
  maxTokens: number;
  /** 系统预设 Prompt */
  systemPrompt: string;
}

interface SettingsState {
  /** 模型配置 */
  modelConfig: ModelConfig;
  /** 主题：light | dark | system */
  theme: "light" | "dark" | "system";

  // 操作
  setModelConfig: (config: Partial<ModelConfig>) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

const defaultModelConfig: ModelConfig = {
  apiBaseUrl: "http://localhost:11434/v1",
  apiKey: "",
  modelName: "llama3",
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  systemPrompt:
    "你是一位经验丰富的作家和故事讲述者。你擅长创作生动的叙事、刻画鲜明的角色，并能根据用户的需求进行小说创作或跑团辅助。",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      modelConfig: defaultModelConfig,
      theme: "system",

      setModelConfig: (config) =>
        set((state) => ({
          modelConfig: { ...state.modelConfig, ...config },
        })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "storyforge-settings", // localStorage key
    }
  )
);
