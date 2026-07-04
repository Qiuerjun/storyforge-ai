// lib/ai/memory-retriever.ts
// 记忆检索 - 根据当前对话内容检索相关记忆

import { prisma } from "@/lib/prisma";
import type { Memory } from "@/lib/types";

/**
 * 从记忆库中检索与给定文本相关的记忆
 * 使用关键词匹配 + 重要性排序
 *
 * @param projectId 项目 ID
 * @param text 要匹配的文本
 * @param maxResults 最大返回数量
 * @returns 匹配的记忆列表
 */
export async function retrieveRelevantMemories(
  projectId: string,
  text: string,
  maxResults: number = 10
): Promise<Memory[]> {
  // 获取项目的记忆，按重要性和时间排序
  const memories = await prisma.memory.findMany({
    where: { projectId },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    take: 100, // 先取较多，再筛选
  });

  const textLower = text.toLowerCase();

  // 计算匹配分数
  const scored = memories
    .map((memory) => {
      let score = 0;

      // 匹配标签
      try {
        const tags: string[] = JSON.parse(memory.tags);
        for (const tag of tags) {
          if (textLower.includes(tag.toLowerCase())) {
            score += 5;
          }
        }
      } catch {
        // tags 解析失败
      }

      // 匹配记忆内容中的词
      const contentWords = memory.content
        .toLowerCase()
        .split(/[\s,，。、；：！？]+/)
        .filter((w) => w.length > 1);
      for (const word of contentWords) {
        if (textLower.includes(word)) {
          score += 1;
        }
      }

      // 加上重要性权重
      score += memory.importance * 0.5;

      return { memory, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((item) => {
    // 防御性解析：评分阶段已有 try-catch，但此处是最终映射，必须独立保护
    let tags: string[] = [];
    try {
      tags = JSON.parse(item.memory.tags || "[]");
    } catch {
      // tags JSON 损坏时降级为空数组，不影响记忆内容返回
    }
    return {
      ...item.memory,
      tags,
      createdAt: item.memory.createdAt.toISOString(),
      updatedAt: item.memory.updatedAt.toISOString(),
    };
  });
}

/**
 * 获取最近的记忆（不做过滤，按时间倒序）
 */
export async function getRecentMemories(
  projectId: string,
  limit: number = 20
): Promise<Memory[]> {
  const memories = await prisma.memory.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return memories.map((m) => {
    // 防御性解析：与 retrieveRelevantMemories 保持一致，tags JSON 损坏时降级为空数组
    let tags: string[] = [];
    try {
      tags = JSON.parse(m.tags || "[]");
    } catch {
      // tags JSON 损坏时不阻断记忆返回
    }
    return {
      ...m,
      tags,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  });
}

/**
 * 将记忆格式化为可注入 Prompt 的文本
 */
export function formatMemoryContext(memories: Memory[]): string {
  if (memories.length === 0) return "";

  const memoryText = memories
    .map((m) => {
      const tags = Array.isArray(m.tags) ? m.tags.join(", ") : "";
      return `- ${m.content}${tags ? " [" + tags + "]" : ""}`;
    })
    .join("\n");

  return `\n\n已知的重要事实和记忆：\n${memoryText}`;
}
