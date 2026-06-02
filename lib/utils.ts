// lib/utils.ts
// 通用工具函数

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind CSS 类名（clsx + tailwind-merge）
 * 用于条件性地组合类名，避免冲突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化数字（如：1234 → "1,234"）
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("zh-CN").format(num);
}

/**
 * 格式化日期为相对时间（如："3 分钟前"）
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - target.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return target.toLocaleDateString("zh-CN");
}

/**
 * 生成随机 ID（用于临时标识）
 * 注意：不适用于安全场景，仅用于前端临时标识
 */
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 9);
}

/**
 * 截断文本到指定长度
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * 从 JSON 字符串安全解析数组
 */
export function parseJsonArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 将数组序列化为 JSON 字符串
 */
export function stringifyArray<T>(arr: T[]): string {
  return JSON.stringify(arr);
}
