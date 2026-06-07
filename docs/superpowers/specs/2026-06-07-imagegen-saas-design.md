# IDRL ImageGen SaaS 原型设计

## 概述

基于 ComfyUI 构建 AI 生图 SaaS 原型系统。ComfyUI 已部署在 192.168.1.39:8189（RTX 4090 48GB），使用 ERNIE-Image-Turbo 工作流。原型阶段不含用户管理和登录。

## 技术栈

| 层级 | 选型 |
|------|------|
| 前端 | Next.js App Router + Tailwind CSS + shadcn/ui |
| 后端 | Next.js API Routes（全栈） |
| 队列 | BullMQ + Redis |
| 存储 | SQLite (better-sqlite3) + 本地文件系统 |
| 生图引擎 | ComfyUI API (192.168.1.39:8189) |
| 部署 | 先分离开发，后续合并到 GPU 服务器 |

## 架构

```
浏览器 → Next.js (API Routes + UI)
              ↓
         Redis Queue (BullMQ)
              ↓
         Queue Worker (Next.js 进程内)
              ↓
         ComfyUI API (192.168.1.39:8189)
              ↓
         SQLite + 本地文件存储 (./storage/images/)
```

## 核心数据流

1. 用户在页面输入提示词、选择参数（尺寸、是否增强）→ 点击生成
2. 前端调用 `POST /api/generate`，传入 prompt、width、height、enhancement
3. API 生成 UUID 作为 taskId，写入 BullMQ 队列，写入 SQLite（status=queued），立即返回 taskId
4. Worker 从队列取出任务（status→processing），构建 ComfyUI 工作流 JSON，POST 到 ComfyUI `/prompt`
5. Worker 轮询 ComfyUI `/history/{prompt_id}` 直到完成
6. 从 ComfyUI `/view` 下载生成图片，保存到 `./storage/images/`
7. 更新 SQLite（status=completed，image_path，completed_at）
8. 前端每 2 秒轮询 `GET /api/tasks/[taskId]`，状态为 completed 后展示图片

错误处理：任一步骤失败则更新 status=failed，记录 error 信息。

## 项目结构

```
idrl-imagegen/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 主页（生图界面）
│   │   ├── history/page.tsx          # 生成历史页
│   │   ├── api/
│   │   │   ├── generate/route.ts     # POST 提交生图任务
│   │   │   ├── tasks/[id]/route.ts   # GET 查询任务状态
│   │   │   ├── tasks/route.ts        # GET 分页历史
│   │   │   └── images/[filename]/route.ts  # GET 返回图片文件
│   │   └── layout.tsx
│   ├── components/
│   │   ├── generate-form.tsx         # 提示词输入 + 参数选择
│   │   ├── task-status.tsx           # 任务状态展示
│   │   ├── image-result.tsx          # 生成结果图片展示
│   │   └── history-list.tsx          # 历史记录列表
│   ├── lib/
│   │   ├── comfyui.ts               # ComfyUI API 客户端
│   │   ├── workflow-builder.ts       # 根据参数构建工作流 JSON
│   │   ├── queue.ts                  # BullMQ 队列初始化
│   │   └── db.ts                     # SQLite 初始化 + schema
│   └── worker/
│       └── image-worker.ts           # BullMQ Worker
├── storage/
│   └── images/                       # 生成的图片存储
├── workflows/
│   └── ernie-image-turbo.json        # 工作流模板
├── package.json
└── .env.local                        # COMFYUI_URL, REDIS_URL
```

## 数据库

SQLite，单表 `tasks`：

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,              -- UUID
  prompt TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 1264,
  height INTEGER NOT NULL DEFAULT 848,
  enhancement BOOLEAN NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',  -- queued | processing | completed | failed
  image_path TEXT,                  -- 本地存储路径
  comfyui_prompt_id TEXT,           -- ComfyUI 返回的 prompt_id
  error TEXT,                       -- 失败原因
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/generate` | 提交生图任务，body: `{ prompt, width, height, enhancement }`，返回 `{ taskId }` |
| GET | `/api/tasks/[id]` | 查询单个任务状态，completed 时含 imageUrl |
| GET | `/api/tasks` | 分页查询历史，query: `?page=1&limit=20` |
| GET | `/api/images/[filename]` | 返回本地存储的图片文件 |

## UI 设计

### 主页

单栏居中布局：顶部标题 → 提示词多行文本框 → 参数行（尺寸下拉 + 增强开关）→ 生成按钮 → 状态/图片展示区 → 历史记录链接。

### 历史页

网格展示缩略图卡片，每张卡片显示缩略图、截断的 prompt、生成时间。点击查看大图和完整参数。

### 预设尺寸

| 名称 | 宽×高 | 说明 |
|------|--------|------|
| 横版 | 1264×848 | 默认 |
| 竖版 | 848×1264 | 人像/手机壁纸 |
| 方形 | 1024×1024 | 头像/图标 |
| 宽屏 | 1920×1080 | 横幅/封面 |

## 工作流模板处理

`workflow-builder.ts` 读取 `workflows/ernie-image-turbo.json`，替换以下节点：

- 节点 94（PrimitiveStringMultiline）`widgets_values[0]`：替换 prompt
- 节点 71（EmptyFlux2LatentImage）`widgets_values[0]` 和 `[1]`：替换 width、height
- 节点 70（KSampler）`widgets_values[0]`：替换 seed（随机生成）
- 节点 96（PrimitiveBoolean）`widgets_values[0]`：替换 enhancement 布尔值

替换在子图（subgraph）的 definitions.subgraphs[0].nodes 中进行。其他参数保持模板默认值。

## 前端轮询策略

提交后每 2 秒 GET `/api/tasks/[id]`，status 为 completed 或 failed 时停止。后续可升级为 WebSocket。

## 依赖清单

- next
- react, react-dom
- tailwindcss, @tailwindcss/postcss
- shadcn/ui 相关组件
- better-sqlite3
- bullmq, ioredis
- uuid
