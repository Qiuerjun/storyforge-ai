# StoryForge AI

> 本地化 AI 小说与跑团辅助创作平台
>
> [English Version](README_EN.md)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 简介

StoryForge AI 是一个专为小说家和跑团（TRPG）玩家打造的 AI 辅助创作环境。它将大语言模型的能力与结构化的世界观、角色、记忆管理深度结合，解决 AI 写作中"容易遗忘设定"和"逻辑不连贯"的痛点。

### 为什么选择 StoryForge AI？

- **本地化部署** - 数据完全在本地，支持本地模型（Ollama）和云端 API
- **上下文感知** - 自动注入角色设定、世界观、记忆，保持故事连贯性
- **流式输出** - 实时显示 AI 生成内容，支持 Markdown 渲染
- **灵活配置** - 兼容 OpenAI API、Ollama、vLLM 等多种模型后端

---

## ✨ 核心功能

### 📝 创作空间
- 类似聊天的交互界面，支持流式输出和打字机效果
- 自动注入项目设定、角色信息、世界状态作为上下文
- 支持置顶重要信息，作为长期记忆使用
- 快捷指令系统（`/describe`、`/roll`、`/npc`）

### 👥 角色管理
- 定义角色性格、外貌、背景、说话风格
- 支持隐藏设定（KP 模式），仅 AI 可见的秘密信息
- AI 一键生成角色，支持参考世界观和其他角色

### 🌍 世界观知识库
- Wiki 式词条管理，支持多种分类（地理、历史、魔法、阵营等）
- 关键词触发机制，自动注入相关词条到对话上下文
- AI 一键生成世界观词条

### 🧠 记忆索引
- AI 自动从对话中提取关键事实和重要事件
- 支持手动添加和编辑记忆
- 按重要性分级，标签分类管理
- 基于关键词的相关性检索

### ⚙️ 灵活配置
- 支持多种 AI 模型后端（OpenAI、Ollama、vLLM 等）
- 可调节温度、Top-P、最大 Token 数等参数
- 浅色/深色主题切换

### 🏷️ 项目类型管理
- 支持小说和跑团（TRPG）两种项目类型
- Header 面包屑实时显示当前项目类型
- 项目设置中可自由切换类型

### 📦 数据导出导入
- 一键导出项目完整数据为 JSON 文件
- 支持从 JSON 文件导入项目数据
- 方便备份、迁移和分享项目

---

## 🛠️ 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 16 | App Router, Server Components |
| 语言 | TypeScript 5 | 类型安全 |
| 样式 | Tailwind CSS v4 | 原子化 CSS |
| 组件 | shadcn/ui 风格 | Radix UI + CVA |
| 数据库 | Prisma 5 + SQLite | 轻量级本地数据库 |
| AI | Vercel AI SDK | 流式输出支持 |
| 状态 | Zustand | 轻量级状态管理 |
| 主题 | next-themes | 浅色/深色/跟随系统 |
| Markdown | Streamdown | 流式 Markdown 渲染 |

---

## 🚀 快速开始

### 前置要求

- Node.js 18.17 或更高版本
- npm 9 或更高版本
- （可选）Ollama - 用于本地模型运行

### 快速启动

#### 1. 克隆项目

```bash
git clone https://github.com/Qiuerjun/storyforge-ai.git
cd storyforge-ai
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 初始化数据库

```bash
npm run db:push
npm run db:generate
```

#### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 即可访问。

### 5. 配置 AI 模型

在应用的「设置」页面中配置模型参数：

#### Ollama（本地运行，推荐）

```
API Base URL: http://localhost:11434/v1
API Key: ollama
Model: llama3 / qwen2 / deepseek-coder 等
```

#### OpenAI

```
API Base URL: https://api.openai.com/v1
API Key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
Model: gpt-4o / gpt-4o-mini / gpt-3.5-turbo
```

#### 其他兼容 API

支持任何 OpenAI 兼容接口，如 vLLM、LocalAI、LiteLLM 等。

---

## 📁 项目结构

```
storyforge-ai/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── ai/generate/          # AI 内容生成
│   │   ├── chat/                 # 流式对话
│   │   └── projects/             # 项目 CRUD
│   ├── projects/[projectId]/     # 项目子页面
│   │   ├── workspace/            # 创作空间
│   │   ├── characters/           # 角色管理
│   │   ├── lore/                 # 世界观知识库
│   │   ├── memory/               # 记忆索引
│   │   └── settings/             # 项目设置
│   ├── layout.tsx                # 根布局
│   └── globals.css               # 全局样式
├── components/                   # React 组件
│   ├── ui/                       # 基础 UI 组件
│   ├── layout/                   # 布局组件
│   └── ai-generate-dialog.tsx    # AI 生成对话框
├── lib/                          # 工具函数
│   ├── ai/                       # AI 相关逻辑
│   │   ├── context-builder.ts    # 上下文组装
│   │   ├── lore-matcher.ts       # 知识库匹配
│   │   └── memory-retriever.ts   # 记忆检索
│   ├── api/                      # API 安全与校验
│   │   ├── validation.ts         # 输入校验工具
│   │   ├── errors.ts             # 统一错误响应
│   │   └── url-security.ts       # SSRF 防护
│   ├── prisma.ts                 # Prisma 客户端
│   └── utils.ts                  # 工具函数
├── stores/                       # Zustand 状态
│   └── settings-store.ts         # 设置状态
├── hooks/                        # 自定义 Hooks
│   └── use-toast.ts              # Toast 通知
├── prisma/                       # 数据库
│   └── schema.prisma             # 数据模型
├── public/                       # 静态资源
└── package.json                  # 项目配置
```

---

## 📊 数据模型

### Project（项目）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| name | String | 项目名称 |
| type | String | 类型（novel/trpg） |
| description | String | 项目描述 |
| systemPrompt | String | 系统提示词 |

### Character（角色）
| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 角色名称 |
| personality | String | 性格描述 |
| appearance | String | 外貌描述 |
| backstory | String | 背景故事 |
| hiddenLore | String | 隐藏设定（仅 AI 可见） |
| persona | String | 说话风格 |

### LoreEntry（世界观词条）
| 字段 | 类型 | 说明 |
|------|------|------|
| title | String | 词条标题 |
| content | String | 词条内容 |
| keywords | String | 触发关键词（JSON 数组） |
| category | String | 分类 |

### Memory（记忆）
| 字段 | 类型 | 说明 |
|------|------|------|
| content | String | 记忆内容 |
| tags | String | 标签（JSON 数组） |
| importance | Int | 重要性 1-10 |
| sourceMessageId | String | 来源消息 ID |

### Message（消息）
| 字段 | 类型 | 说明 |
|------|------|------|
| role | String | 角色（user/assistant/system） |
| content | String | 消息内容 |
| isPinned | Boolean | 是否置顶 |

---

## 🔧 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |
| `npm run db:push` | 推送数据库 Schema 变更 |
| `npm run db:generate` | 生成 Prisma 客户端 |
| `npm run db:studio` | 打开 Prisma Studio（数据库可视化） |
| `npm run db:seed` | 填充测试数据 |

---

## ❓ 常见问题

### 端口 3000 被占用

启动时提示 `EADDRINUSE` 或 `Port 3000 is already in use`：

```bash
# Windows - 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程（将 XXXX 替换为实际的 PID）
taskkill /F /PID XXXX
```

```bash
# macOS / Linux
lsof -i :3000
kill -9 XXXX
```

### 数据库相关错误

启动时报 Prisma 或数据库错误：

```bash
# 重新推送数据库 Schema
npm run db:push

# 重新生成 Prisma 客户端
npm run db:generate

# 如果仍然失败，删除数据库文件后重新初始化
# Windows
del prisma\storyforge.db
# macOS / Linux
rm prisma/storyforge.db

npm run db:push
npm run db:generate
```

### AI 请求失败 / 连接超时

在设置页面测试连接或对话时报错：

1. **检查模型服务是否运行** — 如果使用 Ollama，确认 `ollama serve` 已启动
2. **检查 API Base URL** — Ollama 默认为 `http://localhost:11434/v1`，注意 `/v1` 后缀
3. **检查 API Key** — Ollama 可填任意值（如 `ollama`），OpenAI 需填写有效的 Key
4. **检查模型名称** — 确认模型已下载，Ollama 可通过 `ollama list` 查看已安装模型
5. **检查网络代理** — 如果使用云端 API，确认代理设置不会阻断请求

### 依赖安装失败

`npm install` 报错：

```bash
# 清除缓存后重试
npm cache clean --force
npm install

# 如果 node_modules 损坏，删除后重新安装
# Windows
rmdir /s /q node_modules
# macOS / Linux
rm -rf node_modules

npm install
```

### 构建失败

`npm run build` 报错：

```bash
# 清除 Next.js 缓存后重试
# Windows
rmdir /s /q .next
# macOS / Linux
rm -rf .next

npm run build
```

### 页面白屏或样式异常

- 确认 Node.js 版本 ≥ 18.17（`node --version`）
- 尝试硬刷新浏览器（`Ctrl + Shift + R`）
- 清除浏览器缓存后重新访问

---

## 🔌 API 文档

### 流式对话

```
POST /api/chat
```

**请求体：**
```json
{
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "projectId": "项目ID",
  "modelConfig": {
    "apiBaseUrl": "http://localhost:11434/v1",
    "apiKey": "ollama",
    "modelName": "llama3",
    "temperature": 0.7,
    "maxTokens": 4096
  }
}
```

**响应：** 流式文本响应（text/plain）

---

### AI 内容生成

```
POST /api/ai/generate
```

**请求体：**
```json
{
  "type": "character | lore | project",
  "projectId": "项目ID",
  "prompt": "可选的用户提示",
  "modelConfig": { ... },
  "options": {
    "useWorldContext": true,
    "useOtherCharacters": false
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### 记忆提取

```
POST /api/projects/:projectId/memory/extract
```

**请求体：**
```json
{
  "modelConfig": { ... },
  "messageIds": ["可选的消息ID数组"]
}
```

**响应：**
```json
{
  "success": true,
  "data": [...],
  "message": "提取了 N 条记忆"
}
```

---

### 项目导出

```
GET /api/projects/:projectId/export
```

**响应：** JSON 文件下载，包含项目所有数据

**导出数据格式：**
```json
{
  "version": "1.0",
  "exportedAt": "2025-06-01T00:00:00Z",
  "project": {
    "name": "项目名称",
    "type": "novel",
    "description": "项目描述",
    "systemPrompt": "系统提示词"
  },
  "characters": [...],
  "loreEntries": [...],
  "memories": [...],
  "messages": [...],
  "worldStates": [...]
}
```

---

### 项目导入

```
POST /api/projects/import
```

**请求体：** 与导出格式相同的 JSON 数据

**响应：**
```json
{
  "success": true,
  "data": { "id": "新项目ID", "name": "项目名称" },
  "message": "项目导入成功"
}
```

---

## 🎨 主题定制

项目使用 CSS 变量定义主题颜色，可在 `app/globals.css` 中修改：

```css
:root {
  --primary: oklch(0.45 0.15 260);      /* 主色调 */
  --background: oklch(0.99 0.002 240);   /* 背景色 */
  --foreground: oklch(0.15 0.02 260);    /* 前景色 */
  /* ... 更多变量 */
}
```

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 开发规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks
- 样式使用 Tailwind CSS 工具类

---

## 📝 更新日志

### v0.3.0 (2026-06-02)

- 🔒 安全加固：SSRF 防护（限制服务端出站请求目标）
- 🔒 安全加固：IDOR 防护（所有子资源操作验证项目归属）
- 🔒 安全加固：全接口输入校验（字符串长度、枚举值、数组格式、数值范围）
- 🔒 安全加固：导入字段白名单 + 类型检查 + 大小限制
- 🔒 安全加固：错误响应不再泄露内部 URL 和配置细节
- 🔒 安全加固：导出不再包含消息 metadata
- 🐘 新增 `lib/api/` 安全工具库（validation / errors / url-security）
- 🐘 新增 `npm run typecheck` 命令
- 🐘 新增 `.env.example` 环境变量示例
- 🐎 `generateId()` 改用 `crypto.randomUUID()`

### v0.2.0 (2026-06-01)

- ✨ Header 面包屑显示项目类型标签（小说/跑团）
- ✨ 项目设置中支持自由切换项目类型
- ✨ 类型更改后 Header 标签实时刷新

### v0.1.0 (2025-06-01)

- 🎉 初始发布
- ✨ 创作空间流式对话
- ✨ 角色管理 + AI 生成
- ✨ 世界观知识库 + AI 生成
- ✨ 记忆索引 + 自动提取
- ✨ 项目设置 + AI 生成
- ✨ 浅色/深色主题
- ✨ Markdown 流式渲染（Streamdown）
- ✨ 项目导出导入功能

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

---

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI 流式输出
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件设计
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Prisma](https://www.prisma.io/) - 数据库 ORM
- [Streamdown](https://github.com/vercel/streamdown) - Markdown 流式渲染

---

## 📧 联系方式

如有问题或建议，欢迎提交 [Issue](https://github.com/Qiuerjun/storyforge-ai/issues)。
