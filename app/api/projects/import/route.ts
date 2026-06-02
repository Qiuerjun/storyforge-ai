// app/api/projects/import/route.ts
// 项目导入 API - 从 JSON 文件导入项目数据

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError, handleJsonError } from "@/lib/api/errors";
import {
  sanitizeString,
  isValidProjectType,
  isValidMessageRole,
  isValidLoreCategory,
  sanitizeImportance,
  LIMITS,
} from "@/lib/api/validation";

/** 安全解析 JSON 字符串为数组 */
function safeParseJsonArray(value: unknown, fallback: string = "[]"): string {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return value;
      }
    } catch {
      // 不是合法 JSON
    }
  }
  return fallback;
}

/** POST /api/projects/import - 导入项目数据 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return handleJsonError(error);
    }

    // 验证顶层结构
    if (!body.project || typeof body.project !== "object") {
      return badRequest("无效的导入数据：缺少 project 字段");
    }

    const projectData = body.project as Record<string, unknown>;
    const projectName = sanitizeString(
      projectData.name,
      LIMITS.IMPORT_PROJECT_NAME.max,
      LIMITS.IMPORT_PROJECT_NAME.min
    );
    if (projectName === null) {
      return badRequest("无效的导入数据：项目名称无效");
    }

    // 限制导入数组大小
    const maxItems = LIMITS.IMPORT_ARRAY_MAX_LENGTH;
    const characters = Array.isArray(body.characters) ? body.characters.slice(0, maxItems) : [];
    const loreEntries = Array.isArray(body.loreEntries) ? body.loreEntries.slice(0, maxItems) : [];
    const memories = Array.isArray(body.memories) ? body.memories.slice(0, maxItems) : [];
    const messages = Array.isArray(body.messages) ? body.messages.slice(0, maxItems) : [];
    const worldStates = Array.isArray(body.worldStates) ? body.worldStates.slice(0, maxItems) : [];

    // 在事务中执行所有导入操作
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建项目
      const project = await tx.project.create({
        data: {
          name: projectName,
          type: isValidProjectType(projectData.type) ? projectData.type : "novel",
          description: sanitizeString(projectData.description, LIMITS.IMPORT_FIELD.max) ?? "",
          systemPrompt: sanitizeString(projectData.systemPrompt, LIMITS.IMPORT_FIELD.max) ?? "",
        },
      });

      // 2. 导入角色
      for (const char of characters) {
        if (!char || typeof char !== "object") continue;
        const c = char as Record<string, unknown>;
        const charName = sanitizeString(c.name, LIMITS.CHARACTER_NAME.max, LIMITS.CHARACTER_NAME.min);
        if (!charName) continue;

        await tx.character.create({
          data: {
            projectId: project.id,
            name: charName,
            age: sanitizeString(c.age, LIMITS.CHARACTER_FIELD.max) ?? "",
            appearance: sanitizeString(c.appearance, LIMITS.CHARACTER_FIELD.max) ?? "",
            personality: sanitizeString(c.personality, LIMITS.CHARACTER_FIELD.max) ?? "",
            backstory: sanitizeString(c.backstory, LIMITS.CHARACTER_FIELD.max) ?? "",
            hiddenLore: sanitizeString(c.hiddenLore, LIMITS.CHARACTER_FIELD.max) ?? "",
            persona: sanitizeString(c.persona, LIMITS.CHARACTER_FIELD.max) ?? "",
            tags: safeParseJsonArray(c.tags),
          },
        });
      }

      // 3. 导入世界观词条
      for (const entry of loreEntries) {
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;
        const entryTitle = sanitizeString(e.title, LIMITS.LORE_TITLE.max, LIMITS.LORE_TITLE.min);
        if (!entryTitle) continue;

        await tx.loreEntry.create({
          data: {
            projectId: project.id,
            title: entryTitle,
            content: sanitizeString(e.content, LIMITS.LORE_CONTENT.max) ?? "",
            keywords: safeParseJsonArray(e.keywords),
            category: isValidLoreCategory(e.category) ? e.category : "general",
          },
        });
      }

      // 4. 导入记忆
      for (const mem of memories) {
        if (!mem || typeof mem !== "object") continue;
        const m = mem as Record<string, unknown>;
        const memContent = sanitizeString(m.content, LIMITS.MEMORY_CONTENT.max, LIMITS.MEMORY_CONTENT.min);
        if (!memContent) continue;

        await tx.memory.create({
          data: {
            projectId: project.id,
            content: memContent,
            tags: safeParseJsonArray(m.tags),
            importance: sanitizeImportance(m.importance),
          },
        });
      }

      // 5. 导入消息
      for (const msg of messages) {
        if (!msg || typeof msg !== "object") continue;
        const m = msg as Record<string, unknown>;

        if (!isValidMessageRole(m.role)) continue;
        const msgContent = sanitizeString(m.content, LIMITS.MESSAGE_CONTENT.max, LIMITS.MESSAGE_CONTENT.min);
        if (!msgContent) continue;

        const data: Record<string, unknown> = {
          projectId: project.id,
          role: m.role,
          content: msgContent,
          isPinned: typeof m.isPinned === "boolean" ? m.isPinned : false,
        };

        // metadata 必须是合法的 JSON 对象字符串
        if (typeof m.metadata === "string") {
          try {
            const parsed = JSON.parse(m.metadata);
            if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
              data.metadata = m.metadata;
            }
          } catch {
            // 非法 metadata，使用默认值
          }
        }

        // createdAt 必须是合法的日期字符串
        if (typeof m.createdAt === "string") {
          const date = new Date(m.createdAt);
          if (!isNaN(date.getTime())) {
            data.createdAt = date;
          }
        }

        await tx.message.create({ data });
      }

      // 6. 导入世界状态
      for (const state of worldStates) {
        if (!state || typeof state !== "object") continue;
        const s = state as Record<string, unknown>;
        const stateKey = sanitizeString(s.key, LIMITS.WORLD_STATE_KEY.max, LIMITS.WORLD_STATE_KEY.min);
        if (!stateKey) continue;

        await tx.worldState.create({
          data: {
            projectId: project.id,
            key: stateKey,
            value: sanitizeString(s.value ?? "", LIMITS.WORLD_STATE_VALUE.max) ?? "",
            description: sanitizeString(s.description ?? "", LIMITS.WORLD_STATE_DESCRIPTION.max) ?? "",
          },
        });
      }

      return project;
    });

    return NextResponse.json({
      success: true,
      data: { id: result.id, name: result.name },
      message: "项目导入成功",
    });
  } catch (error) {
    return serverError("导入项目失败", error, "ImportAPI");
  }
}
