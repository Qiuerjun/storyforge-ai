// app/api/projects/[projectId]/memory/[memoryId]/route.ts
// 单个记忆 CRUD - GET / PUT / DELETE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, sanitizeJsonArray, sanitizeImportance, LIMITS } from "@/lib/api/validation";

/**
 * 验证记忆是否属于指定项目
 */
async function getMemoryOrError(memoryId: string, projectId: string) {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
  });
  if (!memory) return { error: notFound("记忆不存在") };
  if (memory.projectId !== projectId) return { error: notFound("记忆不存在") };
  return { memory };
}

/** GET - 获取记忆详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memoryId: string }> }
) {
  try {
    const { projectId, memoryId } = await params;
    const { memory, error } = await getMemoryOrError(memoryId, projectId);
    if (error) return error;

    return NextResponse.json({ success: true, data: memory });
  } catch (error) {
    return serverError("获取记忆详情失败", error, "MemoryAPI");
  }
}

/** PUT - 更新记忆 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memoryId: string }> }
) {
  try {
    const { projectId, memoryId } = await params;
    const { memory, error } = await getMemoryOrError(memoryId, projectId);
    if (error) return error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (err) {
      return handleJsonError(err);
    }

    const data: Record<string, unknown> = {};

    if (body.content !== undefined) {
      const content = sanitizeString(body.content, LIMITS.MEMORY_CONTENT.max, LIMITS.MEMORY_CONTENT.min);
      if (content === null) return badRequest("记忆内容不能为空");
      data.content = content;
    }

    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        const tags = sanitizeJsonArray(body.tags, LIMITS.MEMORY_TAGS.maxArrayLength, LIMITS.MEMORY_TAGS.maxItemLength);
        if (tags === null) return badRequest("标签格式无效");
        data.tags = JSON.stringify(tags);
      } else {
        return badRequest("标签必须是数组");
      }
    }

    if (body.importance !== undefined) {
      data.importance = sanitizeImportance(body.importance);
    }

    if (Object.keys(data).length === 0) {
      return badRequest("没有要更新的字段");
    }

    const updated = await prisma.memory.update({
      where: { id: memoryId },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return serverError("更新记忆失败", error, "MemoryAPI");
  }
}

/** DELETE - 删除记忆 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memoryId: string }> }
) {
  try {
    const { projectId, memoryId } = await params;
    const { error } = await getMemoryOrError(memoryId, projectId);
    if (error) return error;

    await prisma.memory.delete({ where: { id: memoryId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("删除记忆失败", error, "MemoryAPI");
  }
}
