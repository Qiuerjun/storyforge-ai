// app/api/projects/[projectId]/memory/extract/route.ts
// 记忆提取 API - 从对话中自动提取关键事实

import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { validateExternalUrl } from "@/lib/api/url-security";
import { sanitizeModelConfig, sanitizeImportance } from "@/lib/api/validation";

/** POST - 从最近对话中提取记忆 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return notFound("项目不存在");
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return handleJsonError(error);
    }

    const rawMessageIds = body.messageIds;
    const modelConfig = sanitizeModelConfig(body.modelConfig);

    // 获取模型配置
    const apiBaseUrl = modelConfig?.apiBaseUrl || "";
    const apiKey = modelConfig?.apiKey || "";
    const modelName = modelConfig?.modelName || "llama3";

    if (!apiBaseUrl) {
      return badRequest("请先在设置中配置 API Base URL");
    }

    // SSRF 防护
    const urlCheck = validateExternalUrl(apiBaseUrl);
    if (urlCheck !== true) {
      return badRequest(urlCheck);
    }

    // 获取要分析的消息
    let messages;
    if (Array.isArray(rawMessageIds) && rawMessageIds.length > 0) {
      // 限制最多分析 50 条消息
      const validIds = rawMessageIds
        .filter((id): id is string => typeof id === "string")
        .slice(0, 50);
      messages = await prisma.message.findMany({
        where: { id: { in: validIds }, projectId },
        orderBy: { createdAt: "asc" },
      });
    } else {
      messages = await prisma.message.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      messages.reverse();
    }

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "没有可分析的消息",
      });
    }

    const openai = createOpenAI({
      baseURL: apiBaseUrl,
      apiKey: apiKey || "ollama",
    });

    // 构建对话文本（限制总长度）
    const conversationText = messages
      .map((m) => `[${m.role === "user" ? "用户" : "AI"}] ${m.content.slice(0, 500)}`)
      .join("\n");

    const { text } = await generateText({
      model: openai.chat(modelName),
      prompt: `请从以下对话或故事内容中提取关键信息，作为故事记忆保存。

需要提取的内容包括：
1. 角色的重要行为、决定或状态变化
2. 故事中的关键事件和转折点
3. 地点、物品、关系的变化
4. 重要的设定或背景信息
5. 角色之间的互动和关系发展

要求：
1. 每条记忆应该是独立的、可理解的事实陈述
2. 每条记忆不超过 50 字
3. 如果内容中有值得记录的信息，请务必提取
4. 只有在完全没有有意义的内容时才返回空数组

请以 JSON 数组格式返回，每个元素包含：
- content: 记忆内容（字符串）
- tags: 相关标签（字符串数组）
- importance: 重要性 1-10（数字）

对话/故事内容：
${conversationText}

请直接返回 JSON 数组，不要有其他文字：`,
      temperature: 0.3,
      maxOutputTokens: 1000,
    });

    // 解析 AI 返回的记忆
    let extractedMemories: Array<{
      content: string;
      tags: string[];
      importance: number;
    }> = [];

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          extractedMemories = parsed
            .filter((m: unknown) => {
              if (!m || typeof m !== "object") return false;
              const mem = m as Record<string, unknown>;
              return typeof mem.content === "string" && mem.content.length > 3;
            })
            .map((m: unknown) => {
              const mem = m as Record<string, unknown>;
              return {
                content: String(mem.content).slice(0, 200),
                tags: Array.isArray(mem.tags)
                  ? mem.tags.filter((t: unknown) => typeof t === "string").slice(0, 10)
                  : [],
                importance: sanitizeImportance(mem.importance),
              };
            })
            .slice(0, 20); // 最多 20 条
        }
      }
    } catch {
      // 如果 AI 没有返回标准 JSON，尝试简单提取
      const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("[") && !l.startsWith("]"));
      extractedMemories = lines.slice(0, 5).map((line) => ({
        content: line.replace(/^[-*•]\s*/, "").replace(/^[0-9]+[.、]\s*/, "").trim().slice(0, 200),
        tags: [],
        importance: 5,
      })).filter(m => m.content.length > 5);
    }

    // 保存到数据库
    const savedMemories = [];
    for (const mem of extractedMemories) {
      if (mem.content && mem.content.length > 5) {
        const saved = await prisma.memory.create({
          data: {
            projectId,
            content: mem.content,
            tags: JSON.stringify(mem.tags || []),
            importance: mem.importance,
            sourceMessageId: messages[messages.length - 1]?.id || null,
          },
        });
        savedMemories.push(saved);
      }
    }

    return NextResponse.json({
      success: true,
      data: savedMemories,
      message: `提取了 ${savedMemories.length} 条记忆`,
    });
  } catch (error) {
    return serverError("记忆提取失败，请检查模型配置", error, "MemoryExtractAPI");
  }
}
