// app/api/projects/route.ts
// 项目 CRUD API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError, handleJsonError } from "@/lib/api/errors";
import { sanitizeString, isValidProjectType, LIMITS } from "@/lib/api/validation";

/** GET /api/projects - 获取项目列表 */
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
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

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    return serverError("获取项目列表失败", error, "ProjectsAPI");
  }
}

/** POST /api/projects - 创建新项目 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return handleJsonError(error);
    }

    const name = sanitizeString(body.name, LIMITS.PROJECT_NAME.max, LIMITS.PROJECT_NAME.min);
    if (name === null) {
      return badRequest("项目名称不能为空，且不能超过 " + LIMITS.PROJECT_NAME.max + " 字符");
    }

    const type = isValidProjectType(body.type) ? body.type : "novel";
    const description = sanitizeString(body.description ?? "", LIMITS.PROJECT_DESCRIPTION.max) ?? "";
    const systemPrompt = sanitizeString(body.systemPrompt ?? "", LIMITS.PROJECT_SYSTEM_PROMPT.max) ?? "";

    const project = await prisma.project.create({
      data: { name, type, description, systemPrompt },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    return serverError("创建项目失败", error, "ProjectsAPI");
  }
}
