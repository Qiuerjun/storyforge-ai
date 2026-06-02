// lib/api/errors.ts
// 统一错误处理 - 安全的错误响应，不泄露内部信息

import { NextResponse } from "next/server";

/** 错误响应格式 */
interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * 返回 400 错误响应
 */
export function badRequest(message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 }
  );
}

/**
 * 返回 404 错误响应
 */
export function notFound(message: string = "资源不存在"): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  );
}

/**
 * 返回 500 错误响应（不泄露内部信息）
 * 在开发环境下可以包含更多细节
 */
export function serverError(
  userMessage: string,
  error?: unknown,
  context?: string
): NextResponse {
  // 在服务端日志中记录完整错误
  if (error) {
    const prefix = context ? `[${context}]` : "";
    if (error instanceof Error) {
      console.error(`${prefix} ${userMessage}:`, error.message, error.stack);
    } else {
      console.error(`${prefix} ${userMessage}:`, error);
    }
  }

  // 只返回用户友好的消息，不泄露内部细节
  return NextResponse.json(
    { success: false, error: userMessage },
    { status: 500 }
  );
}

/**
 * 处理 request.json() 解析失败的情况
 */
export function handleJsonError(error: unknown): NextResponse {
  if (error instanceof SyntaxError) {
    return badRequest("请求体不是有效的 JSON 格式");
  }
  return serverError("请求处理失败", error, "JSON解析");
}
