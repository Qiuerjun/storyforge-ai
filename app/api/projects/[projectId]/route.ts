// app/api/projects/[projectId]/route.ts
// 单个项目 CRUD - GET / PUT / DELETE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error("获取项目详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取项目详情失败" },
      { status: 500 }
    );
  }
}

/** PUT /api/projects/:id - 更新项目 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { name, type, description, systemPrompt } = body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(systemPrompt !== undefined && { systemPrompt }),
      },
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error("更新项目失败:", error);
    return NextResponse.json(
      { success: false, error: "更新项目失败" },
      { status: 500 }
    );
  }
}

/** DELETE /api/projects/:id - 删除项目 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除项目失败:", error);
    return NextResponse.json(
      { success: false, error: "删除项目失败" },
      { status: 500 }
    );
  }
}
