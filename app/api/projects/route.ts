// app/api/projects/route.ts
// 项目 CRUD API - GET 列表 / POST 创建

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    console.error("获取项目列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取项目列表失败" },
      { status: 500 }
    );
  }
}

/** POST /api/projects - 创建新项目 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, description, systemPrompt } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "项目名称不能为空" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        type: type || "novel",
        description: description || "",
        systemPrompt: systemPrompt || "",
      },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error("创建项目失败:", error);
    return NextResponse.json(
      { success: false, error: "创建项目失败" },
      { status: 500 }
    );
  }
}
