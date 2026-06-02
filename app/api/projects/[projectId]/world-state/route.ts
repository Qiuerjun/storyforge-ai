// app/api/projects/[projectId]/world-state/route.ts
// 世界状态 API - GET 列表 / POST 创建 / DELETE 删除

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, LIMITS } from "@/lib/api/validation";

/** GET - 获取世界状态列表 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const states = await prisma.worldState.findMany({
      where: { projectId },
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ success: true, data: states });
  } catch (error) {
    return serverError("获取世界状态失败", error, "WorldStateAPI");
  }
}

/** POST - 创建/更新世界状态 */
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

    const key = sanitizeString(body.key, LIMITS.WORLD_STATE_KEY.max, LIMITS.WORLD_STATE_KEY.min);
    if (key === null) {
      return badRequest("状态键不能为空，且不能超过 " + LIMITS.WORLD_STATE_KEY.max + " 字符");
    }

    const value = sanitizeString(body.value ?? "", LIMITS.WORLD_STATE_VALUE.max) ?? "";
    const description = sanitizeString(body.description ?? "", LIMITS.WORLD_STATE_DESCRIPTION.max) ?? "";

    // 使用 upsert 实现"存在则更新，不存在则创建"
    const state = await prisma.worldState.upsert({
      where: {
        projectId_key: {
          projectId,
          key,
        },
      },
      update: { value, description },
      create: { projectId, key, value, description },
    });

    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    return serverError("更新世界状态失败", error, "WorldStateAPI");
  }
}

/** DELETE - 删除世界状态 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return badRequest("缺少 key 参数");
    }

    // 验证世界状态存在且属于该项目
    const existing = await prisma.worldState.findUnique({
      where: {
        projectId_key: { projectId, key },
      },
    });

    if (!existing) {
      return notFound("世界状态不存在");
    }

    await prisma.worldState.delete({
      where: {
        projectId_key: { projectId, key },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("删除世界状态失败", error, "WorldStateAPI");
  }
}
