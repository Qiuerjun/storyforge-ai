// lib/types.ts
// 全局 TypeScript 类型定义

// ============================================================
// 项目相关
// ============================================================

/** 项目类型 */
export type ProjectType = "novel" | "trpg";

/** 项目 */
export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  description: string;
  systemPrompt: string;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 创建项目的输入 */
export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  description?: string;
  systemPrompt?: string;
}

// ============================================================
// 角色相关
// ============================================================

/** 角色 */
export interface Character {
  id: string;
  projectId: string;
  name: string;
  age: string;
  appearance: string;
  personality: string;
  backstory: string;
  hiddenLore: string;
  persona: string;
  avatarUrl: string | null;
  tags: string[]; // JSON 解析后
  createdAt: string;
  updatedAt: string;
}

/** 创建/更新角色的输入 */
export interface CharacterInput {
  name: string;
  age?: string;
  appearance?: string;
  personality?: string;
  backstory?: string;
  hiddenLore?: string;
  persona?: string;
  avatarUrl?: string;
  tags?: string[];
}

// ============================================================
// 知识库相关
// ============================================================

/** 知识库词条分类 */
export type LoreCategory =
  | "general"
  | "geography"
  | "history"
  | "magic"
  | "character"
  | "event"
  | "faction"
  | "item"
  | "other";

/** 知识库词条 */
export interface LoreEntry {
  id: string;
  projectId: string;
  title: string;
  content: string;
  keywords: string[]; // JSON 解析后
  category: LoreCategory;
  createdAt: string;
  updatedAt: string;
}

/** 创建/更新词条的输入 */
export interface LoreEntryInput {
  title: string;
  content?: string;
  keywords?: string[];
  category?: LoreCategory;
}

// ============================================================
// 记忆相关
// ============================================================

/** 核心记忆 */
export interface Memory {
  id: string;
  projectId: string;
  content: string;
  sourceMessageId: string | null;
  tags: string[]; // JSON 解析后
  importance: number; // 1-10
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 消息相关
// ============================================================

/** 消息角色 */
export type MessageRole = "user" | "assistant" | "system";

/** 对话消息 */
export interface Message {
  id: string;
  projectId: string;
  role: MessageRole;
  content: string;
  isPinned: boolean;
  metadata: Record<string, unknown>; // JSON 解析后
  createdAt: string;
}

// ============================================================
// 世界状态相关
// ============================================================

/** 世界状态变量 */
export interface WorldState {
  id: string;
  projectId: string;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

/** 创建/更新世界状态的输入 */
export interface WorldStateInput {
  key: string;
  value: string;
  description?: string;
}

// ============================================================
// API 响应相关
// ============================================================

/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================
// 统计相关
// ============================================================

/** 项目统计数据 */
export interface ProjectStats {
  totalCharacters: number;
  totalLoreEntries: number;
  totalMemories: number;
  totalMessages: number;
  totalWords: number;
}
