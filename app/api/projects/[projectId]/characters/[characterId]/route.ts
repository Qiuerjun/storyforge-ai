// app/api/projects/[projectId]/characters/[characterId]/route.ts
// 单个角色 CRUD - GET / PUT / DELETE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, sanitizeJsonArray, LIMITS } from "@/lib/api/validation";

/**
 * 验证角色是否属于指定项目
 */
async function getCharacterOrError(characterId: string, projectId: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });
  if (!character) return { error: notFound("角色不存在") };
  if (character.projectId !== projectId) return { error: notFound("角色不存在") };
  return { character };
}

/** GET - 获取角色详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; characterId: string }> }
) {
  try {
    const { projectId, characterId } = await params;
    const { character, error } = await getCharacterOrError(characterId, projectId);
    if (error) return error;

    return NextResponse.json({ success: true, data: character });
  } catch (error) {
    return serverError("获取角色详情失败", error, "CharacterAPI");
  }
}

/** PUT - 更新角色 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; characterId: string }> }
) {
  try {
    const { projectId, characterId } = await params;
    const { character, error } = await getCharacterOrError(characterId, projectId);
    if (error) return error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (err) {
      return handleJsonError(err);
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = sanitizeString(body.name, LIMITS.CHARACTER_NAME.max, LIMITS.CHARACTER_NAME.min);
      if (name === null) return badRequest("角色名称不能为空");
      data.name = name;
    }

    const stringFields = ["age", "appearance", "personality", "backstory", "hiddenLore", "persona"] as const;
    for (const field of stringFields) {
      if (body[field] !== undefined) {
        data[field] = sanitizeString(body[field] ?? "", LIMITS.CHARACTER_FIELD.max) ?? "";
      }
    }

    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        const tags = sanitizeJsonArray(body.tags, LIMITS.CHARACTER_TAGS.maxArrayLength, LIMITS.CHARACTER_TAGS.maxItemLength);
        if (tags === null) return badRequest("标签格式无效");
        data.tags = JSON.stringify(tags);
      } else {
        return badRequest("标签必须是数组");
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequest("没有要更新的字段");
    }

    const updated = await prisma.character.update({
      where: { id: characterId },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return serverError("更新角色失败", error, "CharacterAPI");
  }
}

/** DELETE - 删除角色 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; characterId: string }> }
) {
  try {
    const { projectId, characterId } = await params;
    const { error } = await getCharacterOrError(characterId, projectId);
    if (error) return error;

    await prisma.character.delete({ where: { id: characterId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("删除角色失败", error, "CharacterAPI");
  }
}
