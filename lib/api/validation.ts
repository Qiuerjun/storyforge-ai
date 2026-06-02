// lib/api/validation.ts
// 输入校验工具 - 所有 API 路由共用的校验逻辑

/** 字符串长度限制 */
export const LIMITS = {
  PROJECT_NAME: { min: 1, max: 200 },
  PROJECT_DESCRIPTION: { max: 5000 },
  PROJECT_SYSTEM_PROMPT: { max: 20000 },
  CHARACTER_NAME: { min: 1, max: 100 },
  CHARACTER_FIELD: { max: 10000 },
  CHARACTER_TAGS: { maxArrayLength: 50, maxItemLength: 50 },
  LORE_TITLE: { min: 1, max: 200 },
  LORE_CONTENT: { max: 50000 },
  LORE_KEYWORDS: { maxArrayLength: 50, maxItemLength: 100 },
  MEMORY_CONTENT: { min: 1, max: 2000 },
  MEMORY_TAGS: { maxArrayLength: 30, maxItemLength: 100 },
  MESSAGE_CONTENT: { min: 1, max: 100000 },
  WORLD_STATE_KEY: { min: 1, max: 100 },
  WORLD_STATE_VALUE: { max: 5000 },
  WORLD_STATE_DESCRIPTION: { max: 1000 },
  API_BASE_URL: { max: 2000 },
  API_KEY: { max: 2000 },
  MODEL_NAME: { max: 200 },
  SYSTEM_PROMPT: { max: 20000 },
  IMPORT_PROJECT_NAME: { min: 1, max: 200 },
  IMPORT_FIELD: { max: 100000 },
  IMPORT_ARRAY_MAX_LENGTH: 500,
} as const;

/** 合法的项目类型 */
const VALID_PROJECT_TYPES: ReadonlySet<string> = new Set(["novel", "trpg"]);

/** 合法的消息角色 */
const VALID_MESSAGE_ROLES: ReadonlySet<string> = new Set(["user", "assistant", "system"]);

/** 合法的知识库分类 */
const VALID_LORE_CATEGORIES: ReadonlySet<string> = new Set([
  "general", "geography", "history", "magic",
  "character", "event", "faction", "item", "other",
]);

/** 合法的生成类型 */
const VALID_GENERATE_TYPES: ReadonlySet<string> = new Set(["character", "lore", "project"]);

/**
 * 校验并清理字符串
 * @returns 清理后的字符串，若无效返回 null
 */
export function sanitizeString(
  value: unknown,
  maxLength: number,
  minLength: number = 0
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < minLength) return null;
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

/**
 * 校验可选字符串字段（允许空字符串）
 */
export function sanitizeOptionalString(
  value: unknown,
  maxLength: number
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  if (value.length > maxLength) return undefined;
  return value;
}

/**
 * 校验项目类型
 */
export function isValidProjectType(type: unknown): type is string {
  return typeof type === "string" && VALID_PROJECT_TYPES.has(type);
}

/**
 * 校验消息角色
 */
export function isValidMessageRole(role: unknown): role is string {
  return typeof role === "string" && VALID_MESSAGE_ROLES.has(role);
}

/**
 * 校验知识库分类
 */
export function isValidLoreCategory(category: unknown): category is string {
  return typeof category === "string" && VALID_LORE_CATEGORIES.has(category);
}

/**
 * 校验生成类型
 */
export function isValidGenerateType(type: unknown): type is string {
  return typeof type === "string" && VALID_GENERATE_TYPES.has(type);
}

/**
 * 校验并解析 JSON 数组字段
 * @returns 解析后的数组，若无效返回 null
 */
export function sanitizeJsonArray(
  value: unknown,
  maxArrayLength: number,
  maxItemLength?: number
): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > maxArrayLength) return null;
  if (maxItemLength !== undefined) {
    for (const item of value) {
      if (typeof item !== "string" || item.length > maxItemLength) return null;
    }
  }
  // 确保所有元素都是字符串
  if (!value.every((item) => typeof item === "string")) return null;
  return value;
}

/**
 * 校验重要性值（1-10）
 */
export function sanitizeImportance(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 5;
  return Math.min(10, Math.max(1, Math.round(num)));
}

/**
 * 校验布尔值
 */
export function sanitizeBoolean(value: unknown, defaultVal: boolean): boolean {
  if (typeof value === "boolean") return value;
  return defaultVal;
}

/**
 * 校验分页参数
 */
export function sanitizePagination(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  return {
    limit: Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50), 200),
    offset: Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0),
  };
}

/**
 * 校验温度参数（0-2）
 */
export function sanitizeTemperature(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0.7;
  return Math.min(2, Math.max(0, num));
}

/**
 * 校验 Top-P 参数（0-1）
 */
export function sanitizeTopP(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0.9;
  return Math.min(1, Math.max(0, num));
}

/**
 * 校验 maxTokens 参数
 */
export function sanitizeMaxTokens(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 4096;
  return Math.min(128000, Math.max(256, Math.round(num)));
}

/**
 * 校验 modelConfig 中的通用字段
 */
export function sanitizeModelConfig(config: unknown): {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
} | null {
  if (!config || typeof config !== "object") return null;
  const c = config as Record<string, unknown>;

  const apiBaseUrl = typeof c.apiBaseUrl === "string" ? c.apiBaseUrl.trim() : "";
  if (!apiBaseUrl) return null;

  return {
    apiBaseUrl,
    apiKey: typeof c.apiKey === "string" ? c.apiKey : "",
    modelName: typeof c.modelName === "string" && c.modelName.trim()
      ? c.modelName.trim().slice(0, LIMITS.MODEL_NAME.max)
      : "llama3",
    temperature: sanitizeTemperature(c.temperature),
    topP: sanitizeTopP(c.topP),
    maxTokens: sanitizeMaxTokens(c.maxTokens),
    systemPrompt: typeof c.systemPrompt === "string"
      ? c.systemPrompt.slice(0, LIMITS.SYSTEM_PROMPT.max)
      : "",
  };
}
