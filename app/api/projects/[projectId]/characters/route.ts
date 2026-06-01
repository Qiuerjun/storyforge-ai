// app/api/projects/[projectId]/characters/route.ts
// 角色 CRUD API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    console.error("获取角色列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取角色列表失败" },
      { status: 500 }
    );
  }
}

/** POST - 创建新角色 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { name, age, appearance, personality, backstory, hiddenLore, persona, tags } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "角色名称不能为空" },
        { status: 400 }
      );
    }

    const character = await prisma.character.create({
      data: {
        projectId,
        name: name.trim(),
        age: age || "",
        appearance: appearance || "",
        personality: personality || "",
        backstory: backstory || "",
        hiddenLore: hiddenLore || "",
        persona: persona || "",
        tags: JSON.stringify(tags || []),
      },
    });

    return NextResponse.json(
      { success: true, data: character },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建角色失败:", error);
    return NextResponse.json(
      { success: false, error: "创建角色失败" },
      { status: 500 }
    );
  }
}
