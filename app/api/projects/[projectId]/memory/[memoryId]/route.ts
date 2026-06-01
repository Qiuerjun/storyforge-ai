// app/api/projects/[projectId]/memory/[memoryId]/route.ts
// 单个记忆 CRUD - GET / PUT / DELETE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET - 获取记忆详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memoryId: string }> }
) {
  try {
    const { memoryId } = await params;

    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
    });

    if (!memory) {
      return NextResponse.json(
        { success: false, error: "记忆不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: memory });
  } catch (error) {
    console.error("获取记忆详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取记忆详情失败" },
      { status: 500 }
    );
  }
}

/** PUT - 更新记忆 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memoryId: string }> }
) {
  try {
    const { memoryId } = await params;
    const body = await request.json();
    const { content, tags, importance } = body;

    const memory = await prisma.memory.update({
      where: { id: memoryId },
      data: {
        ...(content !== undefined && { content: content.trim() }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(importance !== undefined && { importance }),
      },
    });

    return NextResponse.json({ success: true, data: memory });
  } catch (error) {
    console.error("更新记忆失败:", error);
    return NextResponse.json(
      { success: false, error: "更新记忆失败" },
      { status: 500 }
    );
  }
}

/** DELETE - 删除记忆 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memoryId: string }> }
) {
  try {
    const { memoryId } = await params;

    await prisma.memory.delete({
      where: { id: memoryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除记忆失败:", error);
    return NextResponse.json(
      { success: false, error: "删除记忆失败" },
      { status: 500 }
    );
  }
}
