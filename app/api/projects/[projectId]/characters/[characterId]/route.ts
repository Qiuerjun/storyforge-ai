// app/api/projects/[projectId]/characters/[characterId]/route.ts
// 单个角色 CRUD - GET / PUT / DELETE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET - 获取角色详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: character });
  } catch (error) {
    console.error("获取角色详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取角色详情失败" },
      { status: 500 }
    );
  }
}

/** PUT - 更新角色 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const body = await request.json();
    const { name, age, appearance, personality, backstory, hiddenLore, persona, tags } = body;

    const character = await prisma.character.update({
      where: { id: characterId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(age !== undefined && { age }),
        ...(appearance !== undefined && { appearance }),
        ...(personality !== undefined && { personality }),
        ...(backstory !== undefined && { backstory }),
        ...(hiddenLore !== undefined && { hiddenLore }),
        ...(persona !== undefined && { persona }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
      },
    });

    return NextResponse.json({ success: true, data: character });
  } catch (error) {
    console.error("更新角色失败:", error);
    return NextResponse.json(
      { success: false, error: "更新角色失败" },
      { status: 500 }
    );
  }
}

/** DELETE - 删除角色 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; characterId: string }> }
) {
  try {
    const { characterId } = await params;

    await prisma.character.delete({
      where: { id: characterId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除角色失败:", error);
    return NextResponse.json(
      { success: false, error: "删除角色失败" },
      { status: 500 }
    );
  }
}
