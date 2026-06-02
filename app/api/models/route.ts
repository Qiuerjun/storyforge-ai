// app/api/models/route.ts
// 模型列表代理 API - 获取可用模型列表（避免浏览器 CORS 限制）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/errors";
import { validateExternalUrl } from "@/lib/api/url-security";
import { LIMITS } from "@/lib/api/validation";

/** POST /api/models - 获取模型列表 */
export async function POST(request: NextRequest) {
  try {
    const body: Record<string, unknown> = await request.json();
    const apiBaseUrl = typeof body.apiBaseUrl === "string" ? body.apiBaseUrl : "";
    const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;

    if (!apiBaseUrl || typeof apiBaseUrl !== "string") {
      return badRequest("API Base URL 不能为空");
    }

    const baseUrl = apiBaseUrl.replace(/\/+$/, "").slice(0, LIMITS.API_BASE_URL.max);

    // SSRF 防护：验证 URL 安全性
    const urlCheck = validateExternalUrl(baseUrl);
    if (urlCheck !== true) {
      return badRequest(urlCheck);
    }

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
    return serverError("获取模型列表失败", error, "ModelsAPI");
  }
}

/**
 * 尝试通过 OpenAI 兼容接口获取模型列表
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
    if (typeof apiKey === "string" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
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
