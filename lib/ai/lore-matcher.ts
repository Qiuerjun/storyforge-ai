// lib/ai/lore-matcher.ts
// 知识库触发词匹配 - 当对话中出现关键词时，自动注入相关词条

import { prisma } from "@/lib/prisma";
import type { LoreEntry } from "@/lib/types";

/**
 * 从知识库中检索与给定文本相关的词条
 * 使用简单的关键词匹配（未来可升级为向量检索）
 *
 * @param projectId 项目 ID
 * @param text 要匹配的文本
 * @param maxResults 最大返回数量
 * @returns 匹配的词条列表
 */
export async function matchLoreEntries(
  projectId: string,
  text: string,
  maxResults: number = 5
): Promise<LoreEntry[]> {
  // 获取项目的所有词条
  const entries = await prisma.loreEntry.findMany({
    where: { projectId },
  });

  const textLower = text.toLowerCase();

  // 计算每个词条的匹配分数
  const scored = entries
    .map((entry) => {
      let score = 0;

      // 匹配触发词（keywords）
      try {
        const keywords: string[] = JSON.parse(entry.keywords);
        for (const keyword of keywords) {
          if (textLower.includes(keyword.toLowerCase())) {
            score += 10; // 触发词匹配权重最高
          }
        }
      } catch {
        // keywords 解析失败，跳过
      }

      // 匹配标题
      if (textLower.includes(entry.title.toLowerCase())) {
        score += 5;
      }

      // 匹配内容中的关键词（简单的词频匹配）
      const contentWords = entry.content
        .toLowerCase()
        .split(/[\s,，。、；：！？]+/)
        .filter((w) => w.length > 1);
      for (const word of contentWords) {
        if (textLower.includes(word)) {
          score += 1;
        }
      }

      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((item) => ({
    ...item.entry,
    keywords: JSON.parse(item.entry.keywords || "[]"),
    category: item.entry.category as LoreEntry["category"],
    createdAt: item.entry.createdAt.toISOString(),
    updatedAt: item.entry.updatedAt.toISOString(),
  }));
}

/**
 * 将匹配的词条格式化为可注入 Prompt 的文本
 */
export function formatLoreContext(entries: LoreEntry[]): string {
  if (entries.length === 0) return "";

  const loreText = entries
    .map((e) => {
      const keywords = Array.isArray(e.keywords)
        ? e.keywords.join(", ")
        : "";
      return `【${e.title}】${keywords ? " (关键词: " + keywords + ")" : ""}\n${e.content}`;
    })
    .join("\n\n");

  return `\n\n相关世界观知识：\n${loreText}`;
}
