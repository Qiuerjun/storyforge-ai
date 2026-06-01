// app/api/projects/import/route.ts
// 项目导入 API - 从 JSON 文件导入项目数据

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 导入数据接口 */
interface ImportData {
  version?: string;
  project: {
    name: string;
    type?: string;
    description?: string;
    systemPrompt?: string;
  };
  characters?: Array<{
    name: string;
    age?: string;
    appearance?: string;
    personality?: string;
    backstory?: string;
    hiddenLore?: string;
    persona?: string;
    tags?: string;
  }>;
  loreEntries?: Array<{
    title: string;
    content?: string;
    keywords?: string;
    category?: string;
  }>;
  memories?: Array<{
    content: string;
    tags?: string;
    importance?: number;
  }>;
  messages?: Array<{
    role: string;
    content: string;
    isPinned?: boolean;
    metadata?: string;
    createdAt?: string;
  }>;
  worldStates?: Array<{
    key: string;
    value: string;
    description?: string;
  }>;
}

/** POST /api/projects/import - 导入项目数据 */
export async function POST(request: NextRequest) {
  try {
    const body: ImportData = await request.json();

    // 验证数据格式
    if (!body.project?.name) {
      return NextResponse.json(
        { success: false, error: "无效的导入数据：缺少项目名称" },
        { status: 400 }
      );
    }

    // 在事务中执行所有导入操作
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建项目
      const project = await tx.project.create({
        data: {
          name: body.project.name,
          type: body.project.type || "novel",
          description: body.project.description || "",
          systemPrompt: body.project.systemPrompt || "",
        },
      });

      // 2. 导入角色
      if (body.characters?.length) {
        for (const char of body.characters) {
          await tx.character.create({
            data: {
              projectId: project.id,
              name: char.name,
              ...(char.age && { age: char.age }),
              ...(char.appearance && { appearance: char.appearance }),
              ...(char.personality && { personality: char.personality }),
              ...(char.backstory && { backstory: char.backstory }),
              ...(char.hiddenLore && { hiddenLore: char.hiddenLore }),
              ...(char.persona && { persona: char.persona }),
              tags: char.tags || "[]",
            },
          });
        }
      }

      // 3. 导入世界观词条
      if (body.loreEntries?.length) {
        for (const entry of body.loreEntries) {
          await tx.loreEntry.create({
            data: {
              projectId: project.id,
              title: entry.title,
              ...(entry.content && { content: entry.content }),
              keywords: entry.keywords || "[]",
              category: entry.category || "general",
            },
          });
        }
      }

      // 4. 导入记忆
      if (body.memories?.length) {
        for (const mem of body.memories) {
          await tx.memory.create({
            data: {
              projectId: project.id,
              content: mem.content,
              tags: mem.tags || "[]",
              importance: Math.min(10, Math.max(1, mem.importance || 5)),
            },
          });
        }
      }

      // 5. 导入消息
      if (body.messages?.length) {
        for (const msg of body.messages) {
          await tx.message.create({
            data: {
              projectId: project.id,
              role: msg.role,
              content: msg.content,
              isPinned: msg.isPinned || false,
              ...(msg.metadata && { metadata: msg.metadata }),
              ...(msg.createdAt && { createdAt: new Date(msg.createdAt) }),
            },
          });
        }
      }

      // 6. 导入世界状态
      if (body.worldStates?.length) {
        for (const state of body.worldStates) {
          await tx.worldState.create({
            data: {
              projectId: project.id,
              key: state.key,
              value: state.value,
              ...(state.description && { description: state.description }),
            },
          });
        }
      }

      return project;
    });

    return NextResponse.json({
      success: true,
      data: { id: result.id, name: result.name },
      message: "项目导入成功",
    });
  } catch (error) {
    console.error("导入项目失败:", error);
    return NextResponse.json(
      { success: false, error: "导入项目失败" },
      { status: 500 }
    );
  }
}
