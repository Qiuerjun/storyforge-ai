// app/api/projects/[projectId]/memory/extract/route.ts
// 记忆提取 API - 从对话中自动提取关键事实

import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  notFound,
  serverError,
  handleJsonError,
} from "@/lib/api/errors";
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
      .map(
        (m) =>
          `[${m.role === "user" ? "用户" : "AI"}] ${m.content.slice(0, 500)}`
      )
      .join("\n");

    // 使用更简洁明确的 prompt，适配本地模型
    const { text } = await generateText({
      model: openai.chat(modelName),
      prompt: `分析下面的对话，提取关键事实。每条事实一行，格式：
[重要性1-10] [标签1,标签2] 事实内容

只提取有信息量的事实，比如：
- 角色做了什么决定或行动
- 发生了什么重要事件
- 获得或失去了什么物品
- 关系发生了什么变化
- 到达了什么新地点

如果没有什么值得记录的事实，只输出：无

对话内容：
${conversationText}

请逐行列出事实：`,
      temperature: 0.2,
      maxOutputTokens: 800,
    });

    // 解析 AI 返回的记忆 — 支持多种格式
    let extractedMemories: Array<{
      content: string;
      tags: string[];
      importance: number;
    }> = [];

    // 策略1: 尝试解析 JSON 数组
    try {
      // 贪婪匹配：确保捕获完整 JSON 数组（含嵌套数组），非贪婪会在内层 ] 处截断
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
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
                  ? mem.tags
                      .filter((t: unknown) => typeof t === "string")
                      .slice(0, 10)
                  : [],
                importance: sanitizeImportance(mem.importance),
              };
            })
            .slice(0, 20);
        }
      }
    } catch {
      // JSON 解析失败，继续尝试其他格式
    }

    // 策略2: 解析 "[importance] [tag1,tag2] content" 格式
    if (extractedMemories.length === 0) {
      const lines = text.split("\n").filter((l) => {
        const t = l.trim();
        // 仅过滤 AI 的精确回复"无"，不误杀以"无"开头的合法中文句子
        return t.length > 5 && t !== "无";
      });

      for (const line of lines) {
        const trimmed = line.replace(/^[-*•]\s*/, "").replace(/^\d+[.、)\]]\s*/, "").trim();
        if (trimmed.length < 5) continue;

        // 尝试匹配 [importance] [tags] content
        const bracketMatch = trimmed.match(
          /^\[(\d{1,2})\]\s*\[([^\]]*)\]\s*(.+)/
        );
        if (bracketMatch) {
          const importance = Math.min(
            10,
            Math.max(1, parseInt(bracketMatch[1]) || 5)
          );
          const tags = bracketMatch[2]
            .split(/[,，、]/)
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .slice(0, 10);
          const content = bracketMatch[3].trim().slice(0, 200);
          if (content.length > 3) {
            extractedMemories.push({ content, tags, importance });
          }
          continue;
        }

        // 没有格式标记的普通文本行
        if (trimmed.length > 5 && trimmed.length < 200) {
          extractedMemories.push({
            content: trimmed.slice(0, 200),
            tags: [],
            importance: 5,
          });
        }
      }
    }

    // 策略3: 如果还是没有结果，用最后一道防线 — 按句号分割
    if (extractedMemories.length === 0) {
      const sentences = text
        .split(/[。！？\n]/)
        .map((s) => s.replace(/^[-*•]\s*/, "").trim())
        .filter((s) => s.length > 8 && s.length < 200 && s !== "无");

      for (const s of sentences.slice(0, 5)) {
        extractedMemories.push({
          content: s.slice(0, 200),
          tags: [],
          importance: 5,
        });
      }
    }

    // 保存到数据库
    const savedMemories = [];
    for (const mem of extractedMemories) {
      if (mem.content && mem.content.length > 3) {
        const saved = await prisma.memory.create({
          data: {
            projectId,
            content: mem.content,
            tags: JSON.stringify(mem.tags || []),
            importance: mem.importance,
            // 不标记 sourceMessageId：批量提取的记忆涵盖多条消息，
            // 无法准确归属到单条消息。标记为 null 避免删除某条消息时
            // 误删/漏删批量提取的记忆。
            sourceMessageId: null,
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
    return serverError(
      "记忆提取失败，请检查模型配置",
      error,
      "MemoryExtractAPI"
    );
  }
}
