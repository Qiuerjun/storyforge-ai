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
import { retrieveRelevantMemories } from "@/lib/ai/memory-retriever";

/** 最大生成时间（秒） */
export const maxDuration = 120;

/** 世界状态提取标记 */
const WS_START = "<<WORLD_STATE_START>>";
const WS_END = "<<WORLD_STATE_END>>";

/**
 * 从 AI 输出中提取世界状态变量并保存到数据库
 * 格式要求: <<WORLD_STATE_START>>key=value|desc<<WORLD_STATE_END>> 可多行
 */
async function extractAndSaveWorldState(
  projectId: string,
  text: string
): Promise<number> {
  const match = text.match(
    new RegExp(
      `${WS_START.replace(/[<>]/g, "\\$&")}([\\s\\S]*?)${WS_END.replace(/[<>]/g, "\\$&")}`
    )
  );
  if (!match) return 0;

  const lines = match[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 解析所有行，构建 upsert 操作
  const ops: Promise<unknown>[] = [];
  for (const line of lines) {
    // 格式: key=value 或 key=value|description
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) continue;

    const key = line.slice(0, eqIdx).trim();
    const rest = line.slice(eqIdx + 1).trim();
    const pipeIdx = rest.indexOf("|");
    const value = pipeIdx >= 0 ? rest.slice(0, pipeIdx).trim() : rest;
    const description =
      pipeIdx >= 0 ? rest.slice(pipeIdx + 1).trim() : "";

    if (!key || !value) continue;

    ops.push(
      prisma.worldState
        .upsert({
          where: { projectId_key: { projectId, key } },
          update: { value, description: description || undefined },
          create: { projectId, key, value, description: description || "" },
        })
        .catch(() => null) // 单条失败不影响其他
    );
  }

  // 并行执行所有 upsert，减少 DB 往返
  await Promise.all(ops);
  return ops.length;
}

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
    const projectId =
      typeof body.projectId === "string" ? body.projectId : undefined;

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

      // 并行读取角色、置顶消息、世界状态（三者互不依赖，减少 DB 串行等待）
      const [characters, pinnedMessages, worldStates] = await Promise.all([
        prisma.character.findMany({ where: { projectId }, take: 10 }),
        prisma.message.findMany({
          where: { projectId, isPinned: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
        prisma.worldState.findMany({ where: { projectId }, take: 20 }),
      ]);

      if (characters.length > 0) {
        const charInfo = characters
          .map(
            (c) =>
              `【${c.name}】${c.personality ? " 性格：" + c.personality : ""}${c.appearance ? " 外貌：" + c.appearance : ""}${c.persona ? " 说话风格：" + c.persona : ""}`
          )
          .join("\n");
        systemPrompt += `\n\n当前角色：\n${charInfo}`;
      }

      if (pinnedMessages.length > 0) {
        const pinned = pinnedMessages
          .map((m) => `[置顶] ${m.content}`)
          .join("\n");
        systemPrompt += `\n\n重要参考信息：\n${pinned}`;
      }

      if (worldStates.length > 0) {
        const states = worldStates
          .map(
            (s) =>
              `${s.key}: ${s.value}${s.description ? " (" + s.description + ")" : ""}`
          )
          .join("\n");
        systemPrompt += `\n\n当前世界状态：\n${states}`;
      }

      // 检索相关记忆并注入
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg?.role === "user") {
        try {
          const memories = await retrieveRelevantMemories(
            projectId,
            lastUserMsg.content,
            5
          );
          if (memories.length > 0) {
            const memText = memories
              .map(
                (m) =>
                  `- ${m.content}${m.tags && m.tags.length > 0 ? " [" + m.tags.join(", ") + "]" : ""}`
              )
              .join("\n");
            systemPrompt += `\n\n已知的重要事实和记忆：\n${memText}`;
          }
        } catch {
          // 记忆检索失败不影响对话
        }
      }

      // 世界状态提取指令 — 始终追加在末尾
      systemPrompt += `

【世界状态追踪指令】
在你的回复末尾，如果故事中出现了值得追踪的世界状态变化（如主线进度、角色状态、关键物品、关系变化等），请用以下格式输出：
${WS_START}
变量名=变量值|简短描述
${WS_END}
可以输出多行，每行一个变量。如果本轮对话没有值得追踪的变化，则不要输出此标记。
示例：
${WS_START}
主线进度=第三章·迷雾森林|主角进入了迷雾森林
金币=85|花费了15金币购买药水
${WS_END}`;
    }

    // 流式输出 — 使用 onFinish 回调异步提取世界状态（不阻塞客户端响应）
    const result = streamText({
      model: openai.chat(modelName),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      temperature,
      topP,
      // onFinish 在流关闭后异步执行，接收已解码的完整文本，不阻塞客户端。
      // 已知限制：客户端中止请求时（用户点停止），onFinish 可能不被触发或收到
      // 截断的文本（缺少 END 标记），此时世界状态提取会静默跳过。这是 Vercel AI SDK
      // 的行为限制——中止流时不保证触发 onFinish。未来可考虑将提取逻辑移至消息保存
      // 端点作为补充，确保中止场景下也能提取世界状态。
      onFinish: async ({ text }) => {
        if (projectId && text) {
          try {
            await extractAndSaveWorldState(projectId, text);
          } catch {
            // 提取失败不影响已返回的对话
          }
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    // 不泄露内部 URL 或配置细节
    return serverError("对话请求失败，请检查模型配置", error, "ChatAPI");
  }
}
