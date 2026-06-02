// app/api/projects/[projectId]/route.ts
// 单个项目 CRUD - GET / PUT / DELETE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, isValidProjectType, LIMITS } from "@/lib/api/validation";

/** GET /api/projects/:id - 获取项目详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            characters: true,
            loreEntries: true,
            memories: true,
            messages: true,
          },
        },
      },
    });

    if (!project) {
      return notFound("项目不存在");
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return serverError("获取项目详情失败", error, "ProjectAPI");
  }
}

/** PUT /api/projects/:id - 更新项目 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // 验证项目存在
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) {
      return notFound("项目不存在");
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return handleJsonError(error);
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = sanitizeString(body.name, LIMITS.PROJECT_NAME.max, LIMITS.PROJECT_NAME.min);
      if (name === null) {
        return badRequest("项目名称不能为空，且不能超过 " + LIMITS.PROJECT_NAME.max + " 字符");
      }
      data.name = name;
    }

    if (body.type !== undefined) {
      if (!isValidProjectType(body.type)) {
        return badRequest("无效的项目类型");
      }
      data.type = body.type;
    }

    if (body.description !== undefined) {
      data.description = sanitizeString(body.description ?? "", LIMITS.PROJECT_DESCRIPTION.max) ?? "";
    }

    if (body.systemPrompt !== undefined) {
      data.systemPrompt = sanitizeString(body.systemPrompt ?? "", LIMITS.PROJECT_SYSTEM_PROMPT.max) ?? "";
    }

    if (Object.keys(data).length === 0) {
      return badRequest("没有要更新的字段");
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return serverError("更新项目失败", error, "ProjectAPI");
  }
}

/** DELETE /api/projects/:id - 删除项目 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // 验证项目存在
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) {
      return notFound("项目不存在");
    }

    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("删除项目失败", error, "ProjectAPI");
  }
}
