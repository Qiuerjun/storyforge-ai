// app/api/projects/[projectId]/characters/route.ts
// 角色 CRUD API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, sanitizeJsonArray, LIMITS } from "@/lib/api/validation";

/** GET - 获取项目下的角色列表 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const characters = await prisma.character.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: characters });
  } catch (error) {
    return serverError("获取角色列表失败", error, "CharactersAPI");
  }
}

/** POST - 创建新角色 */
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

    const name = sanitizeString(body.name, LIMITS.CHARACTER_NAME.max, LIMITS.CHARACTER_NAME.min);
    if (name === null) {
      return badRequest("角色名称不能为空，且不能超过 " + LIMITS.CHARACTER_NAME.max + " 字符");
    }

    const tags = Array.isArray(body.tags)
      ? sanitizeJsonArray(body.tags, LIMITS.CHARACTER_TAGS.maxArrayLength, LIMITS.CHARACTER_TAGS.maxItemLength)
      : null;

    const character = await prisma.character.create({
      data: {
        projectId,
        name,
        age: sanitizeString(body.age ?? "", LIMITS.CHARACTER_FIELD.max) ?? "",
        appearance: sanitizeString(body.appearance ?? "", LIMITS.CHARACTER_FIELD.max) ?? "",
        personality: sanitizeString(body.personality ?? "", LIMITS.CHARACTER_FIELD.max) ?? "",
        backstory: sanitizeString(body.backstory ?? "", LIMITS.CHARACTER_FIELD.max) ?? "",
        hiddenLore: sanitizeString(body.hiddenLore ?? "", LIMITS.CHARACTER_FIELD.max) ?? "",
        persona: sanitizeString(body.persona ?? "", LIMITS.CHARACTER_FIELD.max) ?? "",
        tags: JSON.stringify(tags || []),
      },
    });

    return NextResponse.json(
      { success: true, data: character },
      { status: 201 }
    );
  } catch (error) {
    return serverError("创建角色失败", error, "CharactersAPI");
  }
}
