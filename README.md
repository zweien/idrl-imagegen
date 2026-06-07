# IDRL ImageGen

AI 驱动的图片生成服务，通过对话式交互生成图片，后端对接 ComfyUI 执行多种扩散模型的生图工作流。

## 功能

- **对话式生图** — 用自然语言描述需求，AI 自动优化提示词并生成图片
- **多模型支持** — ERNIE Turbo、FLUX Schnell、HiDream O1、Qwen Image
- **提示词增强** — 可选的一键提示词优化，生成更精细的画面描述
- **对话持久化** — 所有对话和消息存储在服务端 SQLite，跨浏览器/设备保留
- **生成历史** — 浏览所有历史生成记录，查看原始提示词与增强提示词
- **异步任务队列** — BullMQ + Redis 后台处理，支持长时间生成任务

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| AI | Vercel AI SDK 6 (OpenAI 兼容接口) |
| 任务队列 | BullMQ, Redis |
| 数据库 | SQLite (better-sqlite3, WAL 模式) |
| 图片生成 | ComfyUI (通过 API 提交工作流) |

## 架构

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  Browser    │────▶│  Next.js     │────▶│  Redis   │
│  (Chat UI)  │     │  (API Routes)│     │  (Queue) │
└─────────────┘     └──────┬───────┘     └────┬─────┘
                           │                   │
                    ┌──────▼───────┐    ┌──────▼─────┐
                    │   SQLite     │    │   Worker   │
                    │  (Conversations, │    │  (BullMQ)  │
                    │   Tasks)     │    └──────┬─────┘
                    └──────────────┘           │
                                         ┌─────▼──────┐
                                         │  ComfyUI   │
                                         │  (GPU Server)│
                                         └────────────┘
```

两个独立进程：
- **Next.js** — Web 服务，处理 API 和页面渲染
- **Worker** — 从 Redis 队列消费任务，调用 ComfyUI 生成图片

## 前置条件

- Node.js >= 18
- Redis 服务
- ComfyUI 服务（已部署并配置好生图工作流）

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际配置

# 启动 Web 服务
npm run dev

# 另开终端，启动 Worker
npm run worker
```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `COMFYUI_URL` | ComfyUI 服务地址 | `http://192.168.1.39:8189` |
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379` |
| `OPENAI_BASE_URL` | AI API 端点 (OpenAI 兼容) | `http://localhost:3000/v1` |
| `OPENAI_API_KEY` | AI API 密钥 | `sk-...` |
| `OPENAI_MODEL` | 对话使用的模型 | `MiniMax-M2.7` |

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── chat/              # AI 对话 API
│   │   ├── conversations/     # 对话 CRUD API
│   │   ├── enhance-prompt/    # 提示词增强 API
│   │   ├── generate/          # 生图任务提交 API
│   │   └── tasks/             # 任务查询 API
│   ├── history/               # 生成历史页面
│   └── page.tsx               # 首页 (对话界面)
├── components/
│   ├── ai-elements/           # AI 聊天 UI 组件
│   ├── ui/                    # shadcn/ui 基础组件
│   ├── chat-sidebar.tsx       # 对话列表侧边栏
│   ├── generation-confirm.tsx # 生图确认卡片
│   └── generation-message.tsx # 生图状态展示
├── lib/
│   ├── comfyui.ts             # ComfyUI API 客户端
│   ├── conversation-store.ts  # 对话存储 (fetch API)
│   ├── db.ts                  # SQLite 数据库
│   ├── queue.ts               # BullMQ 队列配置
│   ├── types.ts               # 模型配置与类型
│   └── workflow-builder.ts    # 工作流构建器
└── worker/
    ├── image-worker.ts        # 图片生成 Worker
    └── start.ts               # Worker 独立启动入口
```

## 支持的模型

| 模型 | 步数 | 提示词增强 | 说明 |
|------|------|-----------|------|
| ERNIE Turbo | 8 | 支持 | 快速出图 |
| FLUX Schnell | 4 | — | 极速出图 |
| HiDream O1 | 28 | — | 高质量 |
| Qwen Image | 20 | — | 均衡 |

## License

MIT
