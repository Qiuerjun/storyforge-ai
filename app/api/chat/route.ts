// app/api/chat/route.ts
// 流式对话 API - 使用 Vercel AI SDK

import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError, handleJsonError } from "@/lib/api/errors";
import { validateExternalUrl } from "@/lib/api/url-security";
import {
  sanitizeModelConfig,
  isValidMessageRole,
  LIMITS,
} from "@/lib/api/validation";

/** 最大生成时间（秒） */
export const maxDuration = 120;

/** POST /api/chat - 流式对话 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return handleJsonError(error);
    }

    const rawMessages = body.messages;
    const projectId = typeof body.projectId === "string" ? body.projectId : undefined;

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return badRequest("消息不能为空");
    }

    // 校验消息格式
    const messages: Array<{ role: string; content: string }> = [];
    for (const m of rawMessages) {
      if (!m || typeof m !== "object") continue;
      const msg = m as Record<string, unknown>;
      const role = msg.role;
      const content = msg.content;
      if (!isValidMessageRole(role)) continue;
      if (typeof content !== "string" || !content.trim()) continue;
      const validContent = content.slice(0, LIMITS.MESSAGE_CONTENT.max);
      messages.push({ role, content: validContent });
    }

    if (messages.length === 0) {
      return badRequest("没有有效的消息内容");
    }

    // 获取模型配置（优先从请求体，否则使用默认值）
    const modelConfig = sanitizeModelConfig(body.modelConfig);
    const apiBaseUrl = modelConfig?.apiBaseUrl || "";
    const apiKey = modelConfig?.apiKey || "";
    const modelName = modelConfig?.modelName || "llama3";
    const temperature = modelConfig?.temperature ?? 0.7;
    const topP = modelConfig?.topP ?? 0.9;

    if (!apiBaseUrl) {
      return badRequest("请先在设置中配置 API Base URL");
    }

    // SSRF 防护
    const urlCheck = validateExternalUrl(apiBaseUrl);
    if (urlCheck !== true) {
      return badRequest(urlCheck);
    }

    // 创建 OpenAI 兼容客户端
    const openai = createOpenAI({
      baseURL: apiBaseUrl,
      apiKey: apiKey || "ollama",
    });

    // 构建 System Prompt
    let systemPrompt = modelConfig?.systemPrompt || "";

    if (projectId) {
      // 读取项目设定
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (project?.systemPrompt) {
        systemPrompt = project.systemPrompt + "\n\n" + systemPrompt;
      }

      // 读取角色信息
      const characters = await prisma.character.findMany({
        where: { projectId },
        take: 10,
      });

      if (characters.length > 0) {
        const charInfo = characters
          .map(
            (c) =>
              `【${c.name}】${c.personality ? " 性格：" + c.personality : ""}${c.appearance ? " 外貌：" + c.appearance : ""}${c.persona ? " 说话风格：" + c.persona : ""}`
          )
          .join("\n");
        systemPrompt += `\n\n当前角色：\n${charInfo}`;
      }

      // 读取置顶消息作为额外上下文
      const pinnedMessages = await prisma.message.findMany({
        where: { projectId, isPinned: true },
        take: 5,
        orderBy: { createdAt: "desc" },
      });

      if (pinnedMessages.length > 0) {
        const pinned = pinnedMessages
          .map((m) => `[置顶] ${m.content}`)
          .join("\n");
        systemPrompt += `\n\n重要参考信息：\n${pinned}`;
      }

      // 读取世界状态
      const worldStates = await prisma.worldState.findMany({
        where: { projectId },
        take: 20,
      });

      if (worldStates.length > 0) {
        const states = worldStates
          .map((s) => `${s.key}: ${s.value}${s.description ? " (" + s.description + ")" : ""}`)
          .join("\n");
        systemPrompt += `\n\n当前世界状态：\n${states}`;
      }
    }

    // 流式输出
    const result = streamText({
      model: openai.chat(modelName),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      temperature,
      topP,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    // 不泄露内部 URL 或配置细节
    return serverError("对话请求失败，请检查模型配置", error, "ChatAPI");
  }
}
