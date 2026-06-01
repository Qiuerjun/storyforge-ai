// lib/ai/context-builder.ts
// 上下文组装器 - 将项目设定、角色、知识库、记忆组装成最终的 System Prompt

import { prisma } from "@/lib/prisma";
import { matchLoreEntries, formatLoreContext } from "./lore-matcher";
import { retrieveRelevantMemories, formatMemoryContext } from "./memory-retriever";

/** 上下文组装选项 */
export interface ContextBuildOptions {
  /** 是否包含角色信息 */
  includeCharacters?: boolean;
  /** 是否包含知识库 */
  includeLore?: boolean;
  /** 是否包含记忆 */
  includeMemories?: boolean;
  /** 是否包含世界状态 */
  includeWorldState?: boolean;
  /** 是否包含置顶消息 */
  includePinnedMessages?: boolean;
  /** 用户最新消息（用于匹配知识库和记忆） */
  userMessage?: string;
}

/**
 * 为指定项目构建完整的 System Prompt
 */
export async function buildSystemPrompt(
  projectId: string,
  globalSystemPrompt: string = "",
  options: ContextBuildOptions = {}
): Promise<string> {
  const {
    includeCharacters = true,
    includeLore = true,
    includeMemories = true,
    includeWorldState = true,
    includePinnedMessages = true,
    userMessage,
  } = options;

  // 获取项目信息
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return globalSystemPrompt;
  }

  let prompt = "";

  // 1. 项目级 System Prompt
  if (project.systemPrompt) {
    prompt += project.systemPrompt + "\n";
  }

  // 2. 全局 System Prompt
  if (globalSystemPrompt) {
    prompt += "\n" + globalSystemPrompt + "\n";
  }

  // 3. 角色信息
  if (includeCharacters) {
    const characters = await prisma.character.findMany({
      where: { projectId },
      take: 15,
    });

    if (characters.length > 0) {
      prompt += "\n\n=== 角色信息 ===\n";
      for (const char of characters) {
        prompt += `\n【${char.name}】`;
        if (char.age) prompt += ` 年龄:${char.age}`;
        if (char.appearance) prompt += `\n  外貌: ${char.appearance}`;
        if (char.personality) prompt += `\n  性格: ${char.personality}`;
        if (char.backstory) prompt += `\n  背景: ${char.backstory}`;
        if (char.persona) prompt += `\n  说话风格: ${char.persona}`;
        // hiddenLore 仅对 AI 可见
        if (char.hiddenLore) prompt += `\n  [隐藏设定] ${char.hiddenLore}`;
        prompt += "\n";
      }
    }
  }

  // 4. 知识库（基于用户消息匹配）
  if (includeLore && userMessage) {
    const matchedLore = await matchLoreEntries(projectId, userMessage, 5);
    prompt += formatLoreContext(matchedLore);
  }

  // 5. 相关记忆
  if (includeMemories && userMessage) {
    const relevantMemories = await retrieveRelevantMemories(
      projectId,
      userMessage,
      10
    );
    prompt += formatMemoryContext(relevantMemories);
  }

  // 6. 世界状态
  if (includeWorldState) {
    const worldStates = await prisma.worldState.findMany({
      where: { projectId },
    });

    if (worldStates.length > 0) {
      prompt += "\n\n=== 当前世界状态 ===\n";
      for (const state of worldStates) {
        prompt += `- ${state.key}: ${state.value}`;
        if (state.description) prompt += ` (${state.description})`;
        prompt += "\n";
      }
    }
  }

  // 7. 置顶消息
  if (includePinnedMessages) {
    const pinned = await prisma.message.findMany({
      where: { projectId, isPinned: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    if (pinned.length > 0) {
      prompt += "\n\n=== 重要参考信息 ===\n";
      for (const msg of pinned) {
        prompt += `- ${msg.content}\n`;
      }
    }
  }

  return prompt.trim();
}
