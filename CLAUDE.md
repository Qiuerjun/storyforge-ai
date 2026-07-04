# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # 开发服务器 (webpack mode)
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run typecheck    # TypeScript 类型检查 (tsc --noEmit)
npm run db:push      # 推送 Prisma schema 变更到 SQLite
npm run db:generate  # 生成 Prisma Client
npm run db:studio    # 打开 Prisma Studio 数据库管理界面
```

修改 `prisma/schema.prisma` 后必须运行 `npm run db:generate` 再 `npm run db:push`。

## Architecture

**StoryForge AI** 是一个本地化 AI 小说与跑团（TRPG）辅助创作平台。用户创建项目后，在聊天界面中与 AI 对话续写故事，系统自动提取记忆和世界状态变量。

### 核心数据流

```
用户输入 → /api/chat → streamText (Vercel AI SDK)
  ├─ 构建 system prompt（项目设定 + 角色 + 置顶消息 + 世界状态 + 记忆）
  ├─ LLM 流式返回 → 客户端 Streamdown 渲染
  ├─ onFinish → extractAndSaveWorldState（提取世界状态到 DB）
  └─ 客户端 → stripWorldStateMarkers → 保存干净消息到 DB
```

### 关键模块

- **`app/api/chat/route.ts`** — 流式对话核心。构建 system prompt、调用 LLM、onFinish 中异步提取世界状态。`extractAndSaveWorldState()` 解析 `<<WORLD_STATE_START>>...<<WORLD_STATE_END>>` 标记。
- **`lib/ai/memory-retriever.ts`** — 记忆检索。`retrieveRelevantMemories()` 从 DB 取记忆后做关键词匹配打分。`tags` 字段是 JSON 字符串，解析时必须 try-catch。
- **`lib/ai/context-builder.ts`** — 系统 prompt 构建工具（当前未被 chat/route.ts 使用，chat 路由内联实现了相同逻辑）。
- **`app/projects/[projectId]/workspace/page.tsx`** — 创作空间前端。流式接收、光标注入（MutationObserver）、世界状态标记剥离、消息 CRUD。
- **`app/api/projects/[projectId]/memory/extract/route.ts`** — 记忆提取 API。支持三级解析策略（JSON → 括号格式 → 句号分割），适配不同 LLM 输出。

### 数据模型 (Prisma + SQLite)

- **Project** → hasMany: Character, LoreEntry, Memory, Message, WorldState
- **Memory** — `tags` 存储为 JSON 字符串（非数组），读取时需 `JSON.parse`
- **WorldState** — `(projectId, key)` 唯一约束，用于 upsert
- **Message** — `isPinned` 控制是否注入 system prompt；`sourceMessageId` 在 Memory 上为可选外键（无 DB 级联）
- 所有子表通过 `onDelete: Cascade` 关联 Project

### API 路由约定

- 所有子资源 API 验证项目归属（IDOR 防护）：先查记录，再比对 `projectId`
- 错误响应使用 `lib/api/errors.ts` 的 `badRequest`/`notFound`/`serverError`，不泄露内部细节
- 输入校验使用 `lib/api/validation.ts` 的 `sanitizeString`/`sanitizeModelConfig` 等
- 消息删除为幂等操作：记录不存在也返回成功

### 前端状态管理

- **Zustand**: `stores/settings-store.ts`（模型配置）、`stores/app-store.ts`（全局状态）
- 消息列表使用 React state，乐观更新（先 UI 后 API）
- 流式输出通过 `ReadableStream` reader 逐 chunk 读取，`TextDecoder` 解码（需在结束时 `decoder.decode()` 刷新多字节缓冲）

### 世界状态标记协议

服务端在 system prompt 中指示 LLM 在回复末尾输出：
```
<<WORLD_STATE_START>>
变量名=变量值|简短描述
<<WORLD_STATE_END>>
```
客户端 `stripWorldStateMarkers()` 在 state 更新时剥离这些标记，确保用户看不到。标记常量在 `chat/route.ts`（WS_START/WS_END）和 `workspace/page.tsx`（WS_MARKER_RE）中分别定义，修改时需同步。

## Tech Stack

- Next.js 16 (App Router) + TypeScript (strict mode)
- Tailwind CSS v4 + shadcn/ui 风格组件 (`components/ui/`)
- Prisma 6 + SQLite (`prisma/storyforge.db`)
- Vercel AI SDK (`ai` package) — `streamText` / `generateText`
- Zustand 状态管理
- Streamdown 组件渲染流式 Markdown
