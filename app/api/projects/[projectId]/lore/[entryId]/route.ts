// app/api/projects/[projectId]/lore/[entryId]/route.ts
// 单个词条 CRUD - GET / PUT / DELETE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET - 获取词条详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  try {
    const { entryId } = await params;

    const entry = await prisma.loreEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: "词条不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error("获取词条详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取词条详情失败" },
      { status: 500 }
    );
  }
}

/** PUT - 更新词条 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const body = await request.json();
    const { title, content, keywords, category } = body;

    const entry = await prisma.loreEntry.update({
      where: { id: entryId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content }),
        ...(keywords !== undefined && { keywords: JSON.stringify(keywords) }),
        ...(category !== undefined && { category }),
      },
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error("更新词条失败:", error);
    return NextResponse.json(
      { success: false, error: "更新词条失败" },
      { status: 500 }
    );
  }
}

/** DELETE - 删除词条 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  try {
    const { entryId } = await params;

    await prisma.loreEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除词条失败:", error);
    return NextResponse.json(
      { success: false, error: "删除词条失败" },
      { status: 500 }
    );
  }
}
