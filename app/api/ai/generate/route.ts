// app/api/ai/generate/route.ts
// AI 内容生成 API - 用于角色、世界观、项目信息的自动生成

import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { validateExternalUrl } from "@/lib/api/url-security";
import {
  sanitizeModelConfig,
  sanitizeString,
  isValidGenerateType,
  LIMITS,
} from "@/lib/api/validation";

/** 最大生成时间（秒） */
export const maxDuration = 120;

/** POST /api/ai/generate - AI 生成内容 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return handleJsonError(error);
    }

    const type = body.type;
    const projectId = body.projectId;
    const prompt = body.prompt;
    const options = body.options as Record<string, unknown> | undefined;

    if (!isValidGenerateType(type)) {
      return badRequest("无效的生成类型，必须是 character、lore 或 project");
    }

    if (typeof projectId !== "string" || !projectId.trim()) {
      return badRequest("缺少项目 ID");
    }

    // 获取模型配置
    const modelConfig = sanitizeModelConfig(body.modelConfig);
    const apiBaseUrl = modelConfig?.apiBaseUrl || "";
    const apiKey = modelConfig?.apiKey || "";
    const modelName = modelConfig?.modelName || "llama3";
    const temperature = modelConfig?.temperature ?? 0.8;
    const maxTokens = modelConfig?.maxTokens ?? 2000;

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

    // 获取项目信息
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return notFound("项目不存在");
    }

    // 根据类型组装 prompt
    let systemPrompt = "";
    let userPrompt = "";

    const safePrompt = typeof prompt === "string"
      ? prompt.slice(0, 5000)
      : undefined;

    switch (type) {
      case "character":
        ({ systemPrompt, userPrompt } = await buildCharacterPrompt(
          projectId,
          project,
          safePrompt,
          options
        ));
        break;
      case "lore":
        ({ systemPrompt, userPrompt } = await buildLorePrompt(
          projectId,
          project,
          safePrompt
        ));
        break;
      case "project":
        ({ systemPrompt, userPrompt } = buildProjectPrompt(project, safePrompt));
        break;
    }

    // 调用 AI 生成
    const { text } = await generateText({
      model: openai.chat(modelName),
      system: systemPrompt,
      prompt: userPrompt,
      temperature,
      maxOutputTokens: maxTokens,
    });

    // 解析返回的 JSON
    const result = parseGeneratedJSON(text, type);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return serverError("AI 生成失败，请检查模型配置", error, "AIGenerateAPI");
  }
}

/** 组装角色生成 prompt */
async function buildCharacterPrompt(
  projectId: string,
  project: { name: string; type: string; description: string; systemPrompt: string },
  userPrompt?: string,
  options?: Record<string, unknown>
) {
  let context = "";

  context += `项目名称：${project.name}\n`;
  context += `项目类型：${project.type === "trpg" ? "跑团(TRPG)" : "小说"}\n`;
  if (project.description) context += `项目描述：${project.description}\n`;
  if (project.systemPrompt) context += `项目设定：${project.systemPrompt}\n`;

  if (options?.useWorldContext) {
    const loreEntries = await prisma.loreEntry.findMany({
      where: { projectId },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });
    if (loreEntries.length > 0) {
      context += `\n世界观设定：\n`;
      for (const entry of loreEntries) {
        context += `- 【${entry.title}】${entry.content ? ": " + entry.content.slice(0, 200) : ""}\n`;
      }
    }
  }

  if (options?.useOtherCharacters) {
    const characters = await prisma.character.findMany({
      where: { projectId },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });
    if (characters.length > 0) {
      context += `\n已有角色：\n`;
      for (const char of characters) {
        context += `- 【${char.name}】`;
        if (char.personality) context += ` 性格：${char.personality}`;
        if (char.backstory) context += ` 背景：${char.backstory.slice(0, 100)}`;
        context += "\n";
      }
    }
  }

  const systemPrompt = `你是一位专业的角色设计师，擅长为小说和跑团创作生动、有深度的角色。
你需要根据用户的要求生成角色信息。

请严格按以下 JSON 格式返回，不要有其他文字：
{
  "name": "角色名称",
  "age": "年龄",
  "appearance": "外貌描述",
  "personality": "性格描述",
  "backstory": "背景故事",
  "hiddenLore": "隐藏设定（仅AI可见的秘密）",
  "persona": "说话风格和口癖"
}

要求：
- 角色要有独特性和记忆点
- 性格要复杂立体，避免单一标签
- 背景故事要有起伏和冲突
- hiddenLore 要包含角色的秘密或不为人知的一面
- persona 要具体到语气、用词习惯`;

  const userContent = userPrompt
    ? `请根据以下提示生成一个角色：\n\n${userPrompt}\n\n参考信息：\n${context}`
    : `请为以下项目生成一个有特色的角色：\n\n${context}`;

  return { systemPrompt, userPrompt: userContent };
}

/** 组装世界观生成 prompt */
async function buildLorePrompt(
  projectId: string,
  project: { name: string; type: string; description: string; systemPrompt: string },
  userPrompt?: string
) {
  let context = "";

  context += `项目名称：${project.name}\n`;
  context += `项目类型：${project.type === "trpg" ? "跑团(TRPG)" : "小说"}\n`;
  if (project.description) context += `项目描述：${project.description}\n`;
  if (project.systemPrompt) context += `项目设定：${project.systemPrompt}\n`;

  const existingLore = await prisma.loreEntry.findMany({
    where: { projectId },
    take: 10,
    orderBy: { updatedAt: "desc" },
  });
  if (existingLore.length > 0) {
    context += `\n已有世界观词条：\n`;
    for (const entry of existingLore) {
      context += `- ${entry.title}（${entry.category}）\n`;
    }
  }

  const systemPrompt = `你是一位专业的小说世界观设计师，擅长构建丰富、有内在逻辑的世界观设定。
你需要根据用户的要求生成世界观词条。

请严格按以下 JSON 格式返回，不要有其他文字：
{
  "title": "词条标题",
  "content": "词条内容（详细的描述，支持 Markdown 格式）",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "category": "分类"
}

可选分类：general（通用）、geography（地理）、history（历史）、magic（魔法/科技）、character（人物）、event（事件）、faction（阵营）、item（物品）

要求：
- 内容要详实，有具体细节
- 关键词要能准确触发该词条
- 要与已有世界观保持一致性和连贯性
- 要有内在逻辑，避免矛盾`;

  const userContent = userPrompt
    ? `请根据以下提示生成世界观词条：\n\n${userPrompt}\n\n参考信息：\n${context}`
    : `请为以下项目生成一个世界观词条：\n\n${context}`;

  return { systemPrompt, userPrompt: userContent };
}

/** 组装项目信息生成 prompt */
function buildProjectPrompt(
  project: { name: string; type: string; description: string; systemPrompt: string },
  userPrompt?: string
) {
  const systemPrompt = `你是一位专业的小说和游戏策划，擅长为创作项目撰写描述和设定。
你需要根据用户的要求生成项目的基本描述或系统提示词。

请严格按以下 JSON 格式返回，不要有其他文字：
{
  "description": "项目描述（简洁有力，200字以内）",
  "systemPrompt": "系统提示词（详细的 AI 行为设定，用于指导 AI 在此项目中的创作方向和风格）"
}

要求：
- description 要概括项目的核心卖点和背景
- systemPrompt 要详细定义 AI 的角色、创作风格、注意事项
- 要考虑项目类型（小说/TRPG）的特点`;

  const userContent = userPrompt
    ? `请根据以下提示生成项目信息：\n\n提示：${userPrompt}\n\n项目名称：${project.name}\n项目类型：${project.type === "trpg" ? "跑团(TRPG)" : "小说"}`
    : `请为以下项目生成描述和系统提示词：\n\n项目名称：${project.name}\n项目类型：${project.type === "trpg" ? "跑团(TRPG)" : "小说"}${project.description ? "\n已有描述：" + project.description : ""}`;

  return { systemPrompt, userPrompt: userContent };
}

/** 解析 AI 返回的 JSON */
function parseGeneratedJSON(
  text: string,
  type: string
): Record<string, unknown> {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // JSON 解析失败
  }

  switch (type) {
    case "character":
      return { name: "未命名角色", backstory: text };
    case "lore":
      return { title: "未命名词条", content: text, keywords: [], category: "general" };
    case "project":
      return { description: text, systemPrompt: "" };
    default:
      return { raw: text };
  }
}
