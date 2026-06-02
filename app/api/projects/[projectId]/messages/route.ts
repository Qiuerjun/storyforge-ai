// app/api/projects/[projectId]/messages/route.ts
// 对话消息 API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, isValidMessageRole, sanitizeBoolean, sanitizePagination, LIMITS } from "@/lib/api/validation";

/** GET - 获取对话历史 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { limit, offset } = sanitizePagination(new URL(request.url).searchParams);

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
    return serverError("获取对话历史失败", error, "MessagesAPI");
  }
}

/** POST - 创建新消息 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // 验证项目存在
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return notFound("项目不存在");
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return handleJsonError(error);
    }

    const role = body.role;
    const content = body.content;

    if (!isValidMessageRole(role)) {
      return badRequest("无效的消息角色，必须是 user、assistant 或 system");
    }

    const validContent = sanitizeString(content, LIMITS.MESSAGE_CONTENT.max, LIMITS.MESSAGE_CONTENT.min);
    if (validContent === null) {
      return badRequest("消息内容不能为空，且不能超过 " + LIMITS.MESSAGE_CONTENT.max + " 字符");
    }

    const isPinned = sanitizeBoolean(body.isPinned, false);

    // metadata 只接受合法的 JSON 对象
    let metadataStr = "{}";
    if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
      try {
        metadataStr = JSON.stringify(body.metadata);
      } catch {
        metadataStr = "{}";
      }
    }

    const message = await prisma.message.create({
      data: {
        projectId,
        role,
        content: validContent,
        isPinned,
        metadata: metadataStr,
      },
    });

    return NextResponse.json(
      { success: true, data: message },
      { status: 201 }
    );
  } catch (error) {
    return serverError("创建消息失败", error, "MessagesAPI");
  }
}
