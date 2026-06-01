<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# StoryForge AI 项目指南

## 项目概述
本地化 AI 小说与跑团辅助创作平台，使用 Next.js 14+ App Router 构建。

## 技术栈
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4 + shadcn/ui 风格组件
- Prisma 6 + SQLite
- Zustand 状态管理
- Vercel AI SDK 流式对话
- next-themes 主题切换

## 项目结构
- `app/` - 页面路由 (App Router)
- `components/ui/` - shadcn/ui 风格基础组件
- `components/layout/` - 布局组件 (sidebar, header)
- `lib/` - 工具函数和 Prisma 客户端
- `stores/` - Zustand 状态管理
- `hooks/` - 自定义 React Hooks
- `prisma/` - 数据库模型定义

## 常用命令
- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run db:push` - 推送数据库变更
- `npm run db:generate` - 生成 Prisma 客户端
- `npm run db:studio` - 打开 Prisma Studio
