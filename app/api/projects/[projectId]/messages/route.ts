// app/api/projects/[projectId]/messages/route.ts
// 对话消息 API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET - 获取对话历史 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const messages = await prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.message.count({
      where: { projectId },
    });

    return NextResponse.json({
      success: true,
      data: { items: messages, total },
    });
  } catch (error) {
    console.error("获取对话历史失败:", error);
    return NextResponse.json(
      { success: false, error: "获取对话历史失败" },
      { status: 500 }
    );
  }
}

/** POST - 创建新消息 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { role, content, isPinned, metadata } = body;

    if (!role || !content) {
      return NextResponse.json(
        { success: false, error: "消息角色和内容不能为空" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        projectId,
        role,
        content,
        isPinned: isPinned || false,
        metadata: JSON.stringify(metadata || {}),
      },
    });

    return NextResponse.json(
      { success: true, data: message },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建消息失败:", error);
    return NextResponse.json(
      { success: false, error: "创建消息失败" },
      { status: 500 }
    );
  }
}
