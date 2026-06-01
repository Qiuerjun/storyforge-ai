// app/api/projects/[projectId]/world-state/route.ts
// 世界状态 API - GET 列表 / POST 创建 / PUT 批量更新

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    console.error("获取世界状态失败:", error);
    return NextResponse.json(
      { success: false, error: "获取世界状态失败" },
      { status: 500 }
    );
  }
}

/** POST - 创建/更新世界状态 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { key, value, description } = body;

    if (!key || !key.trim()) {
      return NextResponse.json(
        { success: false, error: "状态键不能为空" },
        { status: 400 }
      );
    }

    // 使用 upsert 实现"存在则更新，不存在则创建"
    const state = await prisma.worldState.upsert({
      where: {
        projectId_key: {
          projectId,
          key: key.trim(),
        },
      },
      update: {
        value: value || "",
        description: description || "",
      },
      create: {
        projectId,
        key: key.trim(),
        value: value || "",
        description: description || "",
      },
    });

    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    console.error("更新世界状态失败:", error);
    return NextResponse.json(
      { success: false, error: "更新世界状态失败" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { success: false, error: "缺少 key 参数" },
        { status: 400 }
      );
    }

    await prisma.worldState.delete({
      where: {
        projectId_key: {
          projectId,
          key,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除世界状态失败:", error);
    return NextResponse.json(
      { success: false, error: "删除世界状态失败" },
      { status: 500 }
    );
  }
}
