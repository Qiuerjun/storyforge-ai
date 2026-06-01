// app/api/projects/[projectId]/memory/route.ts
// 记忆 CRUD API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET - 获取记忆列表 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

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
    console.error("获取记忆列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取记忆列表失败" },
      { status: 500 }
    );
  }
}

/** POST - 创建新记忆 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { content, sourceMessageId, tags, importance } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "记忆内容不能为空" },
        { status: 400 }
      );
    }

    const memory = await prisma.memory.create({
      data: {
        projectId,
        content: content.trim(),
        sourceMessageId: sourceMessageId || null,
        tags: JSON.stringify(tags || []),
        importance: importance || 5,
      },
    });

    return NextResponse.json(
      { success: true, data: memory },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建记忆失败:", error);
    return NextResponse.json(
      { success: false, error: "创建记忆失败" },
      { status: 500 }
    );
  }
}
