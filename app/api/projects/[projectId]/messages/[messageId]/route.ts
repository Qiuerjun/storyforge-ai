// app/api/projects/[projectId]/messages/[messageId]/route.ts
// 单个消息 CRUD - PUT 更新 / DELETE 删除

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, sanitizeBoolean, LIMITS } from "@/lib/api/validation";

/**
 * 验证消息是否属于指定项目
 */
async function getMessageOrError(messageId: string, projectId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });
  if (!message) return { error: notFound("消息不存在") };
  if (message.projectId !== projectId) return { error: notFound("消息不存在") };
  return { message };
}

/** PUT - 更新消息内容 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; messageId: string }> }
) {
  try {
    const { projectId, messageId } = await params;
    const { message, error } = await getMessageOrError(messageId, projectId);
    if (error) return error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (err) {
      return handleJsonError(err);
    }

    const data: Record<string, unknown> = {};

    if (body.content !== undefined) {
      const content = sanitizeString(body.content, LIMITS.MESSAGE_CONTENT.max, LIMITS.MESSAGE_CONTENT.min);
      if (content === null) return badRequest("消息内容不能为空");
      data.content = content;
    }

    if (body.isPinned !== undefined) {
      data.isPinned = sanitizeBoolean(body.isPinned, false);
    }

    if (Object.keys(data).length === 0) {
      return badRequest("没有要更新的字段");
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return serverError("更新消息失败", error, "MessageAPI");
  }
}

/** DELETE - 删除消息（幂等：记录不存在也返回成功） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; messageId: string }> }
) {
  try {
    const { projectId, messageId } = await params;

    // 验证消息属于项目（但允许幂等删除）
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    // 消息不存在也返回成功（幂等）
    if (!message) {
      return NextResponse.json({ success: true });
    }

    // 消息不属于该项目
    if (message.projectId !== projectId) {
      return notFound("消息不存在");
    }

    await prisma.message.delete({ where: { id: messageId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("删除消息失败", error, "MessageAPI");
  }
}
