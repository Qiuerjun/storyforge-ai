// app/api/projects/[projectId]/messages/[messageId]/route.ts
// 单个消息 CRUD - PUT 更新 / DELETE 删除

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** PUT - 更新消息内容 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const body = await request.json();
    const { content, isPinned } = body;

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (isPinned !== undefined) updateData.isPinned = isPinned;

    const message = await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("更新消息失败:", error);
    return NextResponse.json(
      { success: false, error: "更新消息失败" },
      { status: 500 }
    );
  }
}

/** DELETE - 删除消息 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; messageId: string }> }
) {
  try {
    const { messageId } = await params;

    await prisma.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除消息失败:", error);
    return NextResponse.json(
      { success: false, error: "删除消息失败" },
      { status: 500 }
    );
  }
}
