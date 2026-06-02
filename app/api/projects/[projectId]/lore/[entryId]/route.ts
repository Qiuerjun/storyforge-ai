// app/api/projects/[projectId]/lore/[entryId]/route.ts
// 单个词条 CRUD - GET / PUT / DELETE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import {
  sanitizeString,
  sanitizeJsonArray,
  isValidLoreCategory,
  LIMITS,
} from "@/lib/api/validation";

/**
 * 验证词条是否属于指定项目
 */
async function getLoreEntryOrError(entryId: string, projectId: string) {
  const entry = await prisma.loreEntry.findUnique({
    where: { id: entryId },
  });
  if (!entry) return { error: notFound("词条不存在") };
  if (entry.projectId !== projectId) return { error: notFound("词条不存在") };
  return { entry };
}

/** GET - 获取词条详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  try {
    const { projectId, entryId } = await params;
    const { entry, error } = await getLoreEntryOrError(entryId, projectId);
    if (error) return error;

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return serverError("获取词条详情失败", error, "LoreEntryAPI");
  }
}

/** PUT - 更新词条 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  try {
    const { projectId, entryId } = await params;
    const { entry, error } = await getLoreEntryOrError(entryId, projectId);
    if (error) return error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (err) {
      return handleJsonError(err);
    }

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = sanitizeString(body.title, LIMITS.LORE_TITLE.max, LIMITS.LORE_TITLE.min);
      if (title === null) return badRequest("词条标题不能为空");
      data.title = title;
    }

    if (body.content !== undefined) {
      data.content = sanitizeString(body.content ?? "", LIMITS.LORE_CONTENT.max) ?? "";
    }

    if (body.keywords !== undefined) {
      if (Array.isArray(body.keywords)) {
        const keywords = sanitizeJsonArray(body.keywords, LIMITS.LORE_KEYWORDS.maxArrayLength, LIMITS.LORE_KEYWORDS.maxItemLength);
        if (keywords === null) return badRequest("关键词格式无效");
        data.keywords = JSON.stringify(keywords);
      } else {
        return badRequest("关键词必须是数组");
      }
    }

    if (body.category !== undefined) {
      if (!isValidLoreCategory(body.category)) return badRequest("无效的分类");
      data.category = body.category;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("没有要更新的字段");
    }

    const updated = await prisma.loreEntry.update({
      where: { id: entryId },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return serverError("更新词条失败", error, "LoreEntryAPI");
  }
}

/** DELETE - 删除词条 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  try {
    const { projectId, entryId } = await params;
    const { error } = await getLoreEntryOrError(entryId, projectId);
    if (error) return error;

    await prisma.loreEntry.delete({ where: { id: entryId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("删除词条失败", error, "LoreEntryAPI");
  }
}
