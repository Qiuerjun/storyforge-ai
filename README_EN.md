# StoryForge AI

> Localized AI Novel & TRPG Assisted Creation Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 Introduction

StoryForge AI is an AI-assisted creation environment designed for novelists and tabletop role-playing game (TRPG) players. It deeply integrates the capabilities of large language models with structured worldview, character, and memory management, addressing the pain points of "easily forgetting settings" and "logical inconsistency" in AI writing.

### Why Choose StoryForge AI?

- **Localized Deployment** - Data is stored entirely locally, supporting local models (Ollama) and cloud APIs
- **Context-Aware** - Automatically injects character settings, worldview, and memories to maintain story coherence
- **Streaming Output** - Real-time display of AI-generated content with Markdown rendering support
- **Flexible Configuration** - Compatible with OpenAI API, Ollama, vLLM, and other model backends

---

## ✨ Core Features

### 📝 Creation Workspace
- Chat-like interaction interface with streaming output and typewriter effect
- Automatically injects project settings, character information, world state, and relevant memories as context
- AI automatically tracks and updates world state variables (main plot progress, key items, relationship changes, etc.)
- Supports pinning important information for long-term memory use
- Quick command system (`/describe`, `/roll`, `/npc`)

### 👥 Character Management
- Define character personality, appearance, backstory, and speaking style
- Support for hidden settings (KP mode) - secret information visible only to AI
- One-click AI character generation with reference to worldview and other characters

### 🌍 Worldview Knowledge Base
- Wiki-style entry management with multiple categories (geography, history, magic, factions, etc.)
- Keyword trigger mechanism - automatically injects relevant entries into conversation context
- One-click AI worldview entry generation

### 🧠 Memory Index
- AI automatically extracts key facts and important events from conversations
- Automatically retrieves relevant memories into conversation context during chat for story coherence
- Support for manual addition and editing of memories
- Graded by importance, managed with tag classification
- Keyword-based relevance retrieval
- Cascade cleanup of associated memories when messages are deleted

### ⚙️ Flexible Configuration
- Support for multiple AI model backends (OpenAI, Ollama, vLLM, etc.)
- Adjustable temperature, Top-P, max token count, and other parameters
- Light/Dark theme switching

### 🏷️ Project Type Management
- Support for Novel and TRPG project types
- Header breadcrumb displays current project type in real-time
- Freely switch project type in settings

### 📦 Data Export/Import
- One-click export of complete project data to JSON file
- Support for importing project data from JSON files
- Convenient for backup, migration, and sharing of projects

---

## 🛠️ Tech Stack

| Category | Technology | Description |
|----------|------------|-------------|
| Framework | Next.js 16 | App Router, Server Components |
| Language | TypeScript 5 | Type Safety |
| Styling | Tailwind CSS v4 | Atomic CSS |
| Components | shadcn/ui style | Radix UI + CVA |
| Database | Prisma 5 + SQLite | Lightweight Local Database |
| AI | Vercel AI SDK | Streaming Output Support |
| State | Zustand | Lightweight State Management |
| Theme | next-themes | Light/Dark/System |
| Markdown | Streamdown | Streaming Markdown Rendering |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17 or higher
- npm 9 or higher
- (Optional) Ollama - for running local models

### Quick Setup

#### 1. Clone the Project

```bash
git clone https://github.com/Qiuerjun/storyforge-ai.git
cd storyforge-ai
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Initialize Database

```bash
npm run db:push
npm run db:generate
```

#### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 to access the application.

### 5. Configure AI Model

Configure model parameters in the application's "Settings" page:

#### Ollama (Local Runtime, Recommended)

```
API Base URL: http://localhost:11434/v1
API Key: ollama
Model: llama3 / qwen2 / deepseek-coder etc.
```

#### OpenAI

```
API Base URL: https://api.openai.com/v1
API Key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
Model: gpt-4o / gpt-4o-mini / gpt-3.5-turbo
```

#### Other Compatible APIs

Supports any OpenAI-compatible interface, such as vLLM, LocalAI, LiteLLM, etc.

---

## 📁 Project Structure

```
storyforge-ai/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── ai/generate/          # AI Content Generation
│   │   ├── chat/                 # Streaming Chat
│   │   └── projects/             # Project CRUD
│   ├── projects/[projectId]/     # Project Subpages
│   │   ├── workspace/            # Creation Workspace
│   │   ├── characters/           # Character Management
│   │   ├── lore/                 # Worldview Knowledge Base
│   │   ├── memory/               # Memory Index
│   │   └── settings/             # Project Settings
│   ├── layout.tsx                # Root Layout
│   └── globals.css               # Global Styles
├── components/                   # React Components
│   ├── ui/                       # Base UI Components
│   ├── layout/                   # Layout Components
│   └── ai-generate-dialog.tsx    # AI Generation Dialog
├── lib/                          # Utility Functions
│   ├── ai/                       # AI Related Logic
│   │   ├── context-builder.ts    # Context Assembly
│   │   ├── lore-matcher.ts       # Knowledge Base Matching
│   │   └── memory-retriever.ts   # Memory Retrieval
│   ├── api/                      # API Security & Validation
│   │   ├── validation.ts         # Input Validation Utilities
│   │   ├── errors.ts             # Unified Error Responses
│   │   └── url-security.ts       # SSRF Protection
│   ├── prisma.ts                 # Prisma Client
│   └── utils.ts                  # Utility Functions
├── stores/                       # Zustand State
│   └── settings-store.ts         # Settings State
├── hooks/                        # Custom Hooks
│   └── use-toast.ts              # Toast Notification
├── prisma/                       # Database
│   └── schema.prisma             # Data Model
├── public/                       # Static Assets
└── package.json                  # Project Configuration
```

---

## 📊 Data Models

### Project
| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary Key |
| name | String | Project Name |
| type | String | Type (novel/trpg) |
| description | String | Project Description |
| systemPrompt | String | System Prompt |

### Character
| Field | Type | Description |
|-------|------|-------------|
| name | String | Character Name |
| personality | String | Personality Description |
| appearance | String | Appearance Description |
| backstory | String | Backstory |
| hiddenLore | String | Hidden Setting (AI-only) |
| persona | String | Speaking Style |

### LoreEntry
| Field | Type | Description |
|-------|------|-------------|
| title | String | Entry Title |
| content | String | Entry Content |
| keywords | String | Trigger Keywords (JSON Array) |
| category | String | Category |

### Memory
| Field | Type | Description |
|-------|------|-------------|
| content | String | Memory Content |
| tags | String | Tags (JSON Array) |
| importance | Int | Importance 1-10 |
| sourceMessageId | String | Source Message ID |

### WorldState
| Field | Type | Description |
|-------|------|-------------|
| key | String | State Key (e.g. "Main Progress", "Gold") |
| value | String | State Value |
| description | String | Description |

### Message
| Field | Type | Description |
|-------|------|-------------|
| role | String | Role (user/assistant/system) |
| content | String | Message Content |
| isPinned | Boolean | Is Pinned |

---

## 🔧 Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Development Server |
| `npm run build` | Build Production Version |
| `npm run start` | Start Production Server |
| `npm run lint` | Run ESLint Check |
| `npm run typecheck` | Run TypeScript Type Check |
| `npm run db:push` | Push Database Schema Changes |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:studio` | Open Prisma Studio (Database Visualization) |
| `npm run db:seed` | Seed Test Data |

---

## ❓ FAQ

### Port 3000 is Occupied

When starting, you see `EADDRINUSE` or `Port 3000 is already in use`:

```bash
# Windows - Find the process occupying the port
netstat -ano | findstr :3000

# Terminate the process (replace XXXX with the actual PID)
taskkill /F /PID XXXX
```

```bash
# macOS / Linux
lsof -i :3000
kill -9 XXXX
```

### Database Related Errors

When starting, you see Prisma or database errors:

```bash
# Push database schema again
npm run db:push

# Regenerate Prisma client
npm run db:generate

# If still failing, delete the database file and reinitialize
# Windows
del prisma\storyforge.db
# macOS / Linux
rm prisma/storyforge.db

npm run db:push
npm run db:generate
```

### AI Request Failed / Connection Timeout

When testing connection or chatting in settings page, you see errors:

1. **Check if model service is running** - If using Ollama, confirm `ollama serve` is started
2. **Check API Base URL** - Ollama default is `http://localhost:11434/v1`, note the `/v1` suffix
3. **Check API Key** - Ollama can use any value (e.g., `ollama`), OpenAI requires a valid key
4. **Check Model Name** - Confirm the model is downloaded, Ollama can use `ollama list` to view installed models
5. **Check Network Proxy** - If using cloud APIs, confirm proxy settings don't block requests

### Dependency Installation Failed

`npm install` fails:

```bash
# Clear cache and retry
npm cache clean --force
npm install

# If node_modules is corrupted, delete and reinstall
# Windows
rmdir /s /q node_modules
# macOS / Linux
rm -rf node_modules

npm install
```

### Build Failed

`npm run build` fails:

```bash
# Clear Next.js cache and retry
# Windows
rmdir /s /q .next
# macOS / Linux
rm -rf .next

npm run build
```

### Page Blank Screen or Style Issues

- Confirm Node.js version >= 18.17 (`node --version`)
- Try hard refreshing browser (`Ctrl + Shift + R`)
- Clear browser cache and reaccess

---

## 🔌 API Documentation

### Streaming Chat

```
POST /api/chat
```

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "projectId": "Project ID",
  "modelConfig": {
    "apiBaseUrl": "http://localhost:11434/v1",
    "apiKey": "ollama",
    "modelName": "llama3",
    "temperature": 0.7,
    "maxTokens": 4096
  }
}
```

**Response:** Streaming text response (text/plain)

---

### AI Content Generation

```
POST /api/ai/generate
```

**Request Body:**
```json
{
  "type": "character | lore | project",
  "projectId": "Project ID",
  "prompt": "Optional user prompt",
  "modelConfig": { ... },
  "options": {
    "useWorldContext": true,
    "useOtherCharacters": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### Memory Extraction

```
POST /api/projects/:projectId/memory/extract
```

**Request Body:**
```json
{
  "modelConfig": { ... },
  "messageIds": ["Optional message ID array"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "message": "Extracted N memories"
}
```

---

### Project Export

```
GET /api/projects/:projectId/export
```

**Response:** JSON file download containing all project data

**Export Data Format:**
```json
{
  "version": "1.0",
  "exportedAt": "2025-06-01T00:00:00Z",
  "project": {
    "name": "Project Name",
    "type": "novel",
    "description": "Project Description",
    "systemPrompt": "System Prompt"
  },
  "characters": [...],
  "loreEntries": [...],
  "memories": [...],
  "messages": [...],
  "worldStates": [...]
}
```

---

### Project Import

```
POST /api/projects/import
```

**Request Body:** JSON data in the same format as export

**Response:**
```json
{
  "success": true,
  "data": { "id": "New Project ID", "name": "Project Name" },
  "message": "Project imported successfully"
}
```

---

## 🎨 Theme Customization

The project uses CSS variables to define theme colors, which can be modified in `app/globals.css`:

```css
:root {
  --primary: oklch(0.45 0.15 260);      /* Primary Color */
  --background: oklch(0.99 0.002 240);   /* Background Color */
  --foreground: oklch(0.15 0.02 260);    /* Foreground Color */
  /* ... more variables */
}
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push the branch: `git push origin feature/amazing-feature`
5. Submit a Pull Request

### Development Guidelines

- Write code in TypeScript
- Follow ESLint rules
- Use functional components + Hooks for components
- Use Tailwind CSS utility classes for styling

---

## 📝 Changelog

### v0.4.0 (2026-06-02)

- ✨ World State Auto-Extraction: AI automatically tracks and updates world state variables during conversation (main plot progress, key items, relationship changes, etc.)
- ✨ Memory Injection into Chat Context: Automatically retrieves relevant memories during conversation to maintain story coherence
- ✨ Memory Extraction Robustness: Rewritten extraction prompt with three-tier parsing strategy, better local model compatibility
- 🐛 Message Deletion Cascade Cleanup: Deleting messages now automatically cleans up associated memories
- 🐛 World State Markers Hidden from Users: Internal extraction markers are stripped from UI and storage
- 🐛 Fix streaming cursor injection infinite loop (MutationObserver self-trigger)
- 🐛 Fix multi-byte character (CJK) truncation at end of streaming output
- 🐛 Fix world state markers leaking into edit box, pinned messages, and conversation context
- 🐛 Fix edge cases in memory extraction JSON parsing and Chinese text filtering
- 🐎 Parallelize chat API database queries to reduce response latency
- 🐎 Parallelize world state writes to improve extraction performance

### v0.3.0 (2026-06-02)

- 🔒 Security: SSRF protection (restrict server-side outbound request targets)
- 🔒 Security: IDOR protection (all sub-resource operations verify project ownership)
- 🔒 Security: Input validation on all endpoints (string length, enums, arrays, numeric ranges)
- 🔒 Security: Import field whitelisting + type checking + size limits
- 🔒 Security: Error responses no longer leak internal URLs or config details
- 🔒 Security: Export no longer includes message metadata
- 🐘 Added `lib/api/` security utility library (validation / errors / url-security)
- 🐘 Added `npm run typecheck` command
- 🐘 Added `.env.example` environment variable template
- 🐎 `generateId()` now uses `crypto.randomUUID()`

### v0.2.0 (2026-06-01)

- ✨ Header breadcrumb displays project type badge (Novel/TRPG)
- ✨ Support switching project type in settings page
- ✨ Header type badge refreshes immediately after type change

### v0.1.0 (2025-06-01)

- 🎉 Initial Release
- ✨ Creation Workspace Streaming Chat
- ✨ Character Management + AI Generation
- ✨ Worldview Knowledge Base + AI Generation
- ✨ Memory Index + Auto Extraction
- ✨ Project Settings + AI Generation
- ✨ Light/Dark Theme
- ✨ Markdown Streaming Rendering (Streamdown)
- ✨ Project Export/Import Feature

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React Framework
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI Streaming Output
- [shadcn/ui](https://ui.shadcn.com/) - UI Component Design
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Streamdown](https://github.com/vercel/streamdown) - Markdown Streaming Rendering

---

## 📧 Contact

If you have any questions or suggestions, feel free to submit an [Issue](https://github.com/Qiuerjun/storyforge-ai/issues).
