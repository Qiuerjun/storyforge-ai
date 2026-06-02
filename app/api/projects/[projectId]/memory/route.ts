// app/api/projects/[projectId]/memory/route.ts
// 记忆 CRUD API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, sanitizeJsonArray, sanitizeImportance, sanitizePagination, LIMITS } from "@/lib/api/validation";

/** GET - 获取记忆列表 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { limit, offset } = sanitizePagination(new URL(request.url).searchParams);

    const memories = await prisma.memory.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.memory.count({
      where: { projectId },
    });

    return NextResponse.json({
      success: true,
      data: { items: memories, total },
    });
  } catch (error) {
    return serverError("获取记忆列表失败", error, "MemoriesAPI");
  }
}

/** POST - 创建新记忆 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // 验证项目存在
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return notFound("项目不存在");
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return handleJsonError(error);
    }

    const content = sanitizeString(body.content, LIMITS.MEMORY_CONTENT.max, LIMITS.MEMORY_CONTENT.min);
    if (content === null) {
      return badRequest("记忆内容不能为空，且不能超过 " + LIMITS.MEMORY_CONTENT.max + " 字符");
    }

    const sourceMessageId = typeof body.sourceMessageId === "string" ? body.sourceMessageId : null;
    const importance = sanitizeImportance(body.importance);

    const tags = Array.isArray(body.tags)
      ? sanitizeJsonArray(body.tags, LIMITS.MEMORY_TAGS.maxArrayLength, LIMITS.MEMORY_TAGS.maxItemLength)
      : null;

    // 如果提供了 sourceMessageId，验证它属于同一项目
    if (sourceMessageId) {
      const sourceMsg = await prisma.message.findUnique({
        where: { id: sourceMessageId },
      });
      if (!sourceMsg || sourceMsg.projectId !== projectId) {
        return badRequest("来源消息不存在或不属于当前项目");
      }
    }

    const memory = await prisma.memory.create({
      data: {
        projectId,
        content,
        sourceMessageId,
        tags: JSON.stringify(tags || []),
        importance,
      },
    });

    return NextResponse.json(
      { success: true, data: memory },
      { status: 201 }
    );
  } catch (error) {
    return serverError("创建记忆失败", error, "MemoriesAPI");
  }
}
