// app/api/chat/route.ts
// 流式对话 API - 使用 Vercel AI SDK

import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";

/** 最大生成时间（秒） */
export const maxDuration = 120;

/** POST /api/chat - 流式对话 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, projectId, modelConfig } = body;

    if (!messages || !messages.length) {
      return new Response(
        JSON.stringify({ error: "消息不能为空" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 获取模型配置
    const apiBaseUrl = modelConfig?.apiBaseUrl || "http://localhost:11434/v1";
    const apiKey = modelConfig?.apiKey || "ollama";
    const modelName = modelConfig?.modelName || "llama3";
    const temperature = modelConfig?.temperature ?? 0.7;
    const topP = modelConfig?.topP ?? 0.9;

    // 验证模型配置
    if (!apiBaseUrl) {
      return new Response(
        JSON.stringify({ error: "请先在设置中配置 API Base URL" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 创建 OpenAI 兼容客户端（带自定义 fetch 以提供更好的错误信息）
    const openai = createOpenAI({
      baseURL: apiBaseUrl,
      apiKey: apiKey,
      fetch: async (url: string | URL | Request, init?: RequestInit) => {
        const response = await fetch(url, init);
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(
            `AI 服务返回错误 ${response.status}: ${errorText || response.statusText} (请求地址: ${url})`
          );
        }
        return response;
      },
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

    // 流式输出（使用 chat 接口确保兼容性）
    // 不设置 maxOutputTokens，让模型自然生成直到完成（EOS），
    // 避免小说创作等长文本场景下内容被硬截断
    const result = streamText({
      model: openai.chat(modelName),
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      temperature,
      topP,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("对话 API 错误:", error);

    // 直接返回原始错误信息
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({ error: `对话失败: ${errorMessage}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
