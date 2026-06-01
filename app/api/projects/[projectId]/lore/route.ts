// app/api/projects/[projectId]/lore/route.ts
// 知识库词条 CRUD API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET - 获取知识库词条列表 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: Record<string, string> = { projectId };
    if (category) where.category = category;

    const entries = await prisma.loreEntry.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error("获取知识库列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取知识库列表失败" },
      { status: 500 }
    );
  }
}

/** POST - 创建新词条 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { title, content, keywords, category } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "词条标题不能为空" },
        { status: 400 }
      );
    }

    const entry = await prisma.loreEntry.create({
      data: {
        projectId,
        title: title.trim(),
        content: content || "",
        keywords: JSON.stringify(keywords || []),
        category: category || "general",
      },
    });

    return NextResponse.json(
      { success: true, data: entry },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建词条失败:", error);
    return NextResponse.json(
      { success: false, error: "创建词条失败" },
      { status: 500 }
    );
  }
}
