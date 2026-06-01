// app/api/models/route.ts
// 模型列表代理 API - 获取可用模型列表（避免浏览器 CORS 限制）

import { NextRequest, NextResponse } from "next/server";

/** POST /api/models - 获取模型列表 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiBaseUrl, apiKey } = body;

    if (!apiBaseUrl) {
      return NextResponse.json(
        { success: false, error: "API Base URL 不能为空" },
        { status: 400 }
      );
    }

    // 规范化 URL（去除末尾斜杠）
    const baseUrl = apiBaseUrl.replace(/\/+$/, "");

    // 尝试 OpenAI 兼容接口: GET /models
    const models = await fetchOpenAICompatibleModels(baseUrl, apiKey);

    if (models.length > 0) {
      return NextResponse.json({ success: true, data: models });
    }

    // 如果 OpenAI 兼容接口没有返回模型，尝试 Ollama 原生接口
    const ollamaModels = await fetchOllamaModels(baseUrl);
    if (ollamaModels.length > 0) {
      return NextResponse.json({ success: true, data: ollamaModels });
    }

    return NextResponse.json(
      { success: false, error: "未找到可用模型，请检查 API 地址是否正确" },
      { status: 404 }
    );
  } catch (error) {
    console.error("获取模型列表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: `获取模型列表失败: ${error instanceof Error ? error.message : "未知错误"}`,
      },
      { status: 500 }
    );
  }
}

/**
 * 尝试通过 OpenAI 兼容接口获取模型列表
 * 接口: GET {baseUrl}/models
 */
async function fetchOpenAICompatibleModels(
  baseUrl: string,
  apiKey?: string
): Promise<string[]> {
  try {
    const url = `${baseUrl}/models`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000), // 10 秒超时
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    // OpenAI 格式: { data: [{ id: "model-name" }] }
    if (data.data && Array.isArray(data.data)) {
      return data.data
        .map((m: { id?: string }) => m.id)
        .filter((id: string | undefined): id is string => !!id)
        .sort();
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * 尝试通过 Ollama 原生接口获取模型列表
 * 接口: GET {baseUrl}/api/tags
 * 注意: baseUrl 可能以 /v1 结尾，需要去掉
 */
async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    // 去掉可能的 /v1 后缀
    const ollamaBase = baseUrl.replace(/\/v1\/?$/, "");
    const url = `${ollamaBase}/api/tags`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    // Ollama 格式: { models: [{ name: "model-name" }] }
    if (data.models && Array.isArray(data.models)) {
      return data.models
        .map((m: { name?: string }) => m.name)
        .filter((name: string | undefined): name is string => !!name)
        .sort();
    }

    return [];
  } catch {
    return [];
  }
}
