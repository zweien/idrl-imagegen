# IDRL ImageGen SaaS 原型实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建基于 ComfyUI ERNIE-Image-Turbo 工作流的 AI 生图 SaaS 原型系统

**Architecture:** Next.js 15 全栈应用，API Routes 处理请求，BullMQ + Redis 异步队列管理生图任务，SQLite 存储任务元数据，Worker 进程内嵌调用 ComfyUI API。

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui, BullMQ, Redis, better-sqlite3, Vitest

---

## File Structure

```
idrl-imagegen/
├── src/
│   ├── app/
│   │   ├── layout.tsx                       # 根布局
│   │   ├── page.tsx                         # 主页（生图界面）
│   │   ├── globals.css                      # Tailwind 入口
│   │   ├── history/
│   │   │   └── page.tsx                     # 生成历史页
│   │   └── api/
│   │       ├── generate/
│   │       │   └── route.ts                 # POST 提交生图任务
│   │       ├── tasks/
│   │       │   ├── route.ts                 # GET 分页历史
│   │       │   └── [id]/
│   │       │       └── route.ts             # GET 查询任务状态
│   │       └── images/
│   │           └── [filename]/
│   │               └── route.ts             # GET 返回图片文件
│   ├── components/
│   │   ├── generate-form.tsx                # 提示词输入 + 参数选择
│   │   ├── task-status.tsx                  # 任务状态展示（轮询）
│   │   ├── image-result.tsx                 # 生成结果图片展示
│   │   └── history-list.tsx                 # 历史记录列表
│   ├── lib/
│   │   ├── comfyui.ts                       # ComfyUI HTTP API 客户端
│   │   ├── workflow-builder.ts              # 构建 API 格式工作流 JSON
│   │   ├── queue.ts                         # BullMQ 队列定义
│   │   └── db.ts                            # SQLite 初始化 + helpers
│   └── worker/
│       └── image-worker.ts                  # BullMQ Worker 处理逻辑
├── __tests__/
│   └── workflow-builder.test.ts             # Workflow builder 单元测试
├── storage/
│   └── images/                              # 生成的图片存储
├── docs/
│   └── superpowers/
│       ├── specs/                           # 设计文档
│       └── plans/                           # 实施计划
├── comfyui-server-overview.md               # ComfyUI 服务器信息（已有）
├── image_ernie_image_turbo.json             # 原始工作流模板（已有）
├── instrumentation.ts                       # Next.js 启动时初始化 Worker
├── vitest.config.ts                         # 测试配置
├── next.config.ts                           # Next.js 配置
├── postcss.config.mjs                       # PostCSS 配置
├── tsconfig.json                            # TypeScript 配置
├── .env.local                               # 环境变量
└── package.json
```

---

### Task 1: 项目脚手架 & 依赖安装

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `storage/images/.gitkeep`

- [ ] **Step 1: 初始化 Next.js 项目**

现有目录包含 `comfyui-server-overview.md` 和 `image_ernie_image_turbo.json`，先备份再初始化：

```bash
mkdir -p /tmp/imagegen-backup
cp /home/z/codebase/idrl-imagegen/*.json /home/z/codebase/idrl-imagegen/*.md /tmp/imagegen-backup/
cd /home/z/codebase/idrl-imagegen
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
```

如果提示目录非空，确认覆盖。完成后恢复备份文件：

```bash
cp /tmp/imagegen-backup/*.json /tmp/imagegen-backup/*.md .
```

- [ ] **Step 2: 安装运行时依赖**

```bash
npm install better-sqlite3 bullmq ioredis uuid
```

- [ ] **Step 3: 安装开发依赖**

```bash
npm install -D vitest @types/better-sqlite3 @types/uuid
```

- [ ] **Step 4: 初始化 shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button textarea select switch card skeleton
```

- [ ] **Step 5: 配置 Next.js 支持 native 模块**

修改 `next.config.ts`：

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

- [ ] **Step 6: 配置 Vitest**

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
```

在 `package.json` 的 `scripts` 中添加：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: 创建目录结构**

```bash
mkdir -p storage/images
touch storage/images/.gitkeep
mkdir -p src/components src/lib src/worker __tests__
```

- [ ] **Step 8: 替换默认页面内容**

替换 `src/app/page.tsx`：

```typescript
export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">IDRL ImageGen</h1>
      <p className="mt-2 text-muted-foreground">Loading...</p>
    </main>
  );
}
```

- [ ] **Step 9: 验证项目可运行**

```bash
npm run dev
```

访问 http://localhost:3000，应看到 "IDRL ImageGen" 标题。确认后 Ctrl+C 停止。

- [ ] **Step 10: 提交**

```bash
git init
echo "node_modules/\n.next/\nstorage/data.db\nstorage/images/*.png\n.env.local" > .gitignore
git add .
git commit -m "feat: initialize Next.js project with dependencies"
```

---

### Task 2: 环境配置 & 数据库

**Files:**
- Create: `.env.local`, `src/lib/db.ts`

- [ ] **Step 1: 创建环境变量文件**

创建 `.env.local`：

```
COMFYUI_URL=http://192.168.1.39:8189
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 2: 创建数据库模块**

创建 `src/lib/db.ts`：

```typescript
import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

const STORAGE_DIR = join(process.cwd(), "storage");
const DB_PATH = join(STORAGE_DIR, "data.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  initSchema();
  return db;
}

function initSchema() {
  db!.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      width INTEGER NOT NULL DEFAULT 1264,
      height INTEGER NOT NULL DEFAULT 848,
      enhancement INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'queued',
      image_path TEXT,
      comfyui_prompt_id TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);
}

export interface TaskRow {
  id: string;
  prompt: string;
  width: number;
  height: number;
  enhancement: number;
  status: string;
  image_path: string | null;
  comfyui_prompt_id: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export function insertTask(task: {
  id: string;
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
}): void {
  getDb()
    .prepare(
      "INSERT INTO tasks (id, prompt, width, height, enhancement) VALUES (?, ?, ?, ?, ?)"
    )
    .run(task.id, task.prompt, task.width, task.height, task.enhancement ? 1 : 0);
}

export function updateStatus(
  id: string,
  status: string,
  extra?: { comfyui_prompt_id?: string; image_path?: string; error?: string }
): void {
  if (status === "completed") {
    getDb()
      .prepare(
        "UPDATE tasks SET status = ?, image_path = ?, completed_at = datetime('now') WHERE id = ?"
      )
      .run(status, extra?.image_path ?? null, id);
  } else if (status === "failed") {
    getDb()
      .prepare(
        "UPDATE tasks SET status = ?, error = ?, completed_at = datetime('now') WHERE id = ?"
      )
      .run(status, extra?.error ?? "Unknown error", id);
  } else if (status === "processing" && extra?.comfyui_prompt_id) {
    getDb()
      .prepare("UPDATE tasks SET status = ?, comfyui_prompt_id = ? WHERE id = ?")
      .run(status, extra.comfyui_prompt_id, id);
  } else {
    getDb().prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, id);
  }
}

export function getTask(id: string): TaskRow | undefined {
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
    | TaskRow
    | undefined;
}

export function getTasks(
  page: number,
  limit: number
): { tasks: TaskRow[]; total: number } {
  const offset = (page - 1) * limit;
  const total = (getDb().prepare("SELECT COUNT(*) as count FROM tasks").get() as { count: number }).count;
  const tasks = getDb()
    .prepare("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as TaskRow[];
  return { tasks, total };
}
```

- [ ] **Step 3: 验证数据库初始化正常**

```bash
node -e "
const { getDb } = require('./src/lib/db');
// This won't work with TS imports directly, so just verify the file compiles
" 2>/dev/null || echo "Expected - TypeScript file needs build. Checking syntax instead."
npx tsc --noEmit src/lib/db.ts 2>&1 | head -5
```

预期：无类型错误（或仅有 import 解析问题，这在独立检查时正常）。

- [ ] **Step 4: 提交**

```bash
git add .env.local src/lib/db.ts
git commit -m "feat: add environment config and SQLite database module"
```

---

### Task 3: Workflow Builder（TDD）

**Files:**
- Create: `__tests__/workflow-builder.test.ts`
- Create: `src/lib/workflow-builder.ts`

**说明：** ComfyUI 的 `POST /prompt` 端点需要 API 格式（非 UI 格式）。UI 格式工作流包含子图、布局信息等，API 格式是扁平节点列表，链接用 `["node_id", slot_index]` 表示。因此 workflow-builder 直接构建 API 格式，不解析原始 UI JSON。

- [ ] **Step 1: 编写测试**

创建 `__tests__/workflow-builder.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { buildWorkflow, GenerateParams } from "../src/lib/workflow-builder";

describe("buildWorkflow", () => {
  const baseParams: GenerateParams = {
    prompt: "a cute cat",
    width: 1024,
    height: 1024,
    enhancement: false,
  };

  it("should produce base nodes without enhancement", () => {
    const wf = buildWorkflow(baseParams);

    // Core nodes present
    expect(wf["66"]).toBeDefined(); // UNETLoader
    expect(wf["62"]).toBeDefined(); // CLIPLoader
    expect(wf["63"]).toBeDefined(); // VAELoader
    expect(wf["71"]).toBeDefined(); // EmptyFlux2LatentImage
    expect(wf["67"]).toBeDefined(); // CLIPTextEncode
    expect(wf["91"]).toBeDefined(); // ConditioningZeroOut
    expect(wf["70"]).toBeDefined(); // KSampler
    expect(wf["65"]).toBeDefined(); // VAEDecode
    expect(wf["73"]).toBeDefined(); // SaveImage

    // PE nodes NOT present
    expect(wf["98"]).toBeUndefined(); // CLIPLoader PE
    expect(wf["95"]).toBeUndefined(); // TextGenerate
  });

  it("should pass prompt directly to CLIPTextEncode without enhancement", () => {
    const wf = buildWorkflow(baseParams);
    expect(wf["67"].inputs.text).toBe("a cute cat");
  });

  it("should include PE nodes with enhancement enabled", () => {
    const params = { ...baseParams, enhancement: true };
    const wf = buildWorkflow(params);

    expect(wf["98"]).toBeDefined(); // CLIPLoader PE
    expect(wf["95"]).toBeDefined(); // TextGenerate
    expect(wf["67"].inputs.text).toEqual(["95", 0]); // linked to TextGenerate
  });

  it("should set width and height in EmptyFlux2LatentImage", () => {
    const wf = buildWorkflow({ ...baseParams, width: 1920, height: 1080 });
    expect(wf["71"].inputs.width).toBe(1920);
    expect(wf["71"].inputs.height).toBe(1080);
  });

  it("should set custom seed in KSampler", () => {
    const wf = buildWorkflow({ ...baseParams, seed: 42 });
    expect(wf["70"].inputs.seed).toBe(42);
  });

  it("should generate random seed when not provided", () => {
    const wf1 = buildWorkflow(baseParams);
    const wf2 = buildWorkflow(baseParams);
    // Very unlikely to be equal
    expect(wf1["70"].inputs.seed).toBeTypeOf("number");
    expect(wf2["70"].inputs.seed).toBeTypeOf("number");
  });

  it("should set correct KSampler parameters", () => {
    const wf = buildWorkflow(baseParams);
    const ks = wf["70"].inputs;
    expect(ks.steps).toBe(8);
    expect(ks.cfg).toBe(1);
    expect(ks.sampler_name).toBe("euler");
    expect(ks.scheduler).toBe("simple");
    expect(ks.denoise).toBe(1);
  });

  it("should wire node links correctly", () => {
    const wf = buildWorkflow(baseParams);

    // KSampler inputs reference other nodes
    expect(wf["70"].inputs.model).toEqual(["66", 0]);
    expect(wf["70"].inputs.positive).toEqual(["67", 0]);
    expect(wf["70"].inputs.negative).toEqual(["91", 0]);
    expect(wf["70"].inputs.latent_image).toEqual(["71", 0]);

    // VAEDecode inputs
    expect(wf["65"].inputs.samples).toEqual(["70", 0]);
    expect(wf["65"].inputs.vae).toEqual(["63", 0]);

    // SaveImage
    expect(wf["73"].inputs.images).toEqual(["65", 0]);

    // ConditioningZeroOut
    expect(wf["91"].inputs.conditioning).toEqual(["67", 0]);

    // CLIPTextEncode clip
    expect(wf["67"].inputs.clip).toEqual(["62", 0]);
  });

  it("should build PE prompt with prompt/width/height replaced", () => {
    const params = { ...baseParams, enhancement: true, width: 800, height: 600 };
    const wf = buildWorkflow(params);
    const pePrompt = wf["95"].inputs.prompt as string;

    expect(pePrompt).toContain('"prompt": "a cute cat"');
    expect(pePrompt).toContain('"width": 800');
    expect(pePrompt).toContain('"height": 600');
    expect(pePrompt).toContain("SYSTEM_PROMPT");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run __tests__/workflow-builder.test.ts
```

预期：FAIL — `Cannot find module '../src/lib/workflow-builder'`

- [ ] **Step 3: 实现 workflow-builder**

创建 `src/lib/workflow-builder.ts`：

```typescript
import { randomInt } from "crypto";

export interface GenerateParams {
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
  seed?: number;
}

const PE_SYSTEM_PROMPT = `<s>[SYSTEM_PROMPT]你是一个专业的文生图 Prompt 增强助手。你将收到用户的简短图片描述及目标生成分辨率，请据此扩写为一段内容丰富、细节充分的视觉描述，以帮助文生图模型生成高质量的图片。仅输出增强后的描述，不要包含任何解释或前缀。[/SYSTEM_PROMPT][INST]{"prompt": "{prompt}", "width": {width}, "height": {height}}[/INST]`;

function buildPePrompt(params: GenerateParams): string {
  return PE_SYSTEM_PROMPT
    .replace("{prompt}", params.prompt)
    .replace("{width}", String(params.width))
    .replace("{height}", String(params.height));
}

export function buildWorkflow(params: GenerateParams): Record<string, unknown> {
  const seed = params.seed ?? randomInt(1, Number.MAX_SAFE_INTEGER);

  const workflow: Record<string, unknown> = {
    "66": {
      class_type: "UNETLoader",
      inputs: {
        unet_name: "ernie-image-turbo.safetensors",
        weight_dtype: "default",
      },
    },
    "62": {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: "ministral-3-3b.safetensors",
        type: "flux2",
        device: "default",
      },
    },
    "63": {
      class_type: "VAELoader",
      inputs: {
        vae_name: "flux2-vae.safetensors",
      },
    },
    "71": {
      class_type: "EmptyFlux2LatentImage",
      inputs: {
        width: params.width,
        height: params.height,
      },
    },
    "91": {
      class_type: "ConditioningZeroOut",
      inputs: {
        conditioning: ["67", 0],
      },
    },
    "70": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 8,
        cfg: 1,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1,
        model: ["66", 0],
        positive: ["67", 0],
        negative: ["91", 0],
        latent_image: ["71", 0],
      },
    },
    "65": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["70", 0],
        vae: ["63", 0],
      },
    },
    "73": {
      class_type: "SaveImage",
      inputs: {
        images: ["65", 0],
        filename_prefix: "Ernie-Image-Turbo",
      },
    },
  };

  if (params.enhancement) {
    const pePrompt = buildPePrompt(params);
    workflow["98"] = {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: "ernie-image-prompt-enhancer.safetensors",
        type: "flux2",
        device: "default",
      },
    };
    workflow["95"] = {
      class_type: "TextGenerate",
      inputs: {
        clip: ["98", 0],
        prompt: pePrompt,
        max_new_tokens: 2048,
        keep_alive: "on",
        temperature: 0.6,
        top_k: 64,
        top_p: 0.8,
        min_p: 0.05,
        repeat_penalty: 1.05,
        seed: 0,
        num_beams: 0,
        disable_multilingual: false,
        include_reasoning: true,
      },
    };
    workflow["67"] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: ["95", 0],
        clip: ["62", 0],
      },
    };
  } else {
    workflow["67"] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: params.prompt,
        clip: ["62", 0],
      },
    };
  }

  return workflow;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run __tests__/workflow-builder.test.ts
```

预期：全部 PASS

- [ ] **Step 5: 提交**

```bash
git add __tests__/workflow-builder.test.ts src/lib/workflow-builder.ts
git commit -m "feat: add workflow builder with API-format output and tests"
```

---

### Task 4: ComfyUI API 客户端

**Files:**
- Create: `src/lib/comfyui.ts`

- [ ] **Step 1: 实现 ComfyUI 客户端**

创建 `src/lib/comfyui.ts`：

```typescript
const COMFYUI_URL = process.env.COMFYUI_URL || "http://192.168.1.39:8189";

export interface ComfyUIHistoryOutput {
  images?: Array<{
    filename: string;
    subfolder: string;
    type: string;
  }>;
}

export interface ComfyUIHistoryItem {
  status: {
    status_str: string;
    completed: boolean;
    messages?: string[][];
  };
  outputs: Record<string, ComfyUIHistoryOutput>;
}

export async function submitPrompt(
  workflow: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ComfyUI submit failed (${res.status}): ${error}`);
  }

  const data = (await res.json()) as { prompt_id: string };
  return data.prompt_id;
}

export async function getHistory(
  promptId: string
): Promise<ComfyUIHistoryItem | null> {
  const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, ComfyUIHistoryItem>;
  return data[promptId] || null;
}

export async function pollUntilComplete(
  promptId: string,
  maxWaitMs = 300000
): Promise<ComfyUIHistoryItem> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const history = await getHistory(promptId);

    if (!history) {
      await sleep(2000);
      continue;
    }

    if (history.status.completed) return history;

    if (history.status.status_str === "error") {
      throw new Error(
        `ComfyUI execution error: ${JSON.stringify(history.status.messages)}`
      );
    }

    await sleep(2000);
  }

  throw new Error(`ComfyUI timeout after ${maxWaitMs}ms`);
}

export async function downloadImage(
  filename: string,
  subfolder = "",
  type = "output"
): Promise<Buffer> {
  const params = new URLSearchParams({ filename, subfolder, type });
  const res = await fetch(`${COMFYUI_URL}/view?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 2: 验证文件语法**

```bash
npx tsc --noEmit src/lib/comfyui.ts 2>&1 | head -5
```

预期：无错误。

- [ ] **Step 3: 提交**

```bash
git add src/lib/comfyui.ts
git commit -m "feat: add ComfyUI API client with submit, poll, and download"
```

---

### Task 5: 队列 & Worker

**Files:**
- Create: `src/lib/queue.ts`
- Create: `src/worker/image-worker.ts`

- [ ] **Step 1: 创建队列定义**

创建 `src/lib/queue.ts`：

```typescript
import { Queue } from "bullmq";

export const QUEUE_NAME = "image-generation";

export interface ImageJobData {
  taskId: string;
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
}

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port) || 6379,
    password: parsed.password || undefined,
  };
}

const redisConfig = parseRedisUrl(process.env.REDIS_URL || "redis://localhost:6379");

export const imageQueue = new Queue<ImageJobData>(QUEUE_NAME, {
  connection: redisConfig,
});
```

- [ ] **Step 2: 创建 Worker**

创建 `src/worker/image-worker.ts`：

```typescript
import { Worker, Job } from "bullmq";
import { buildWorkflow } from "../lib/workflow-builder";
import { submitPrompt, pollUntilComplete, downloadImage } from "../lib/comfyui";
import { getDb, updateStatus } from "../lib/db";
import { ImageJobData, QUEUE_NAME } from "../lib/queue";
import { join } from "path";
import { mkdirSync, writeFileSync } from "fs";

const IMAGE_DIR = join(process.cwd(), "storage", "images");

export function createWorker(redisUrl: string): Worker<ImageJobData> {
  mkdirSync(IMAGE_DIR, { recursive: true });

  const parsed = new URL(redisUrl);
  const connection = {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port) || 6379,
    password: parsed.password || undefined,
  };

  const worker = new Worker<ImageJobData>(
    QUEUE_NAME,
    async (job: Job<ImageJobData>) => {
      const { taskId, prompt, width, height, enhancement } = job.data;

      try {
        updateStatus(taskId, "processing");

        const workflow = buildWorkflow({ prompt, width, height, enhancement });
        const comfyuiId = await submitPrompt(workflow);

        updateStatus(taskId, "processing", { comfyui_prompt_id: comfyuiId });

        const history = await pollUntilComplete(comfyuiId);

        // Extract image from SaveImage node (node 73)
        const saveOutput = history.outputs["73"];
        if (!saveOutput?.images?.[0]) {
          throw new Error("No image found in ComfyUI output");
        }

        const { filename, subfolder, type } = saveOutput.images[0];
        const imageBuffer = await downloadImage(filename, subfolder, type);

        const localFilename = `${taskId}.png`;
        writeFileSync(join(IMAGE_DIR, localFilename), imageBuffer);

        updateStatus(taskId, "completed", { image_path: localFilename });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        updateStatus(taskId, "failed", { error: message });
        throw error;
      }
    },
    { connection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job?.id} completed`);
  });

  return worker;
}
```

- [ ] **Step 3: 验证语法**

```bash
npx tsc --noEmit src/lib/queue.ts src/worker/image-worker.ts 2>&1 | head -5
```

- [ ] **Step 4: 提交**

```bash
git add src/lib/queue.ts src/worker/image-worker.ts
git commit -m "feat: add BullMQ queue definition and image generation worker"
```

---

### Task 6: API 路由

**Files:**
- Create: `src/app/api/generate/route.ts`
- Create: `src/app/api/tasks/[id]/route.ts`
- Create: `src/app/api/tasks/route.ts`
- Create: `src/app/api/images/[filename]/route.ts`

- [ ] **Step 1: 创建生成接口**

创建 `src/app/api/generate/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { insertTask } from "@/lib/db";
import { imageQueue } from "@/lib/queue";

const SIZE_OPTIONS: Record<string, { width: number; height: number }> = {
  landscape: { width: 1264, height: 848 },
  portrait: { width: 848, height: 1264 },
  square: { width: 1024, height: 1024 },
  widescreen: { width: 1920, height: 1080 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = "landscape", enhancement = true } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const dimensions = SIZE_OPTIONS[size] || SIZE_OPTIONS.landscape;
    const taskId = uuidv4();

    insertTask({
      id: taskId,
      prompt: prompt.trim(),
      width: dimensions.width,
      height: dimensions.height,
      enhancement: !!enhancement,
    });

    await imageQueue.add(
      "generate",
      {
        taskId,
        prompt: prompt.trim(),
        width: dimensions.width,
        height: dimensions.height,
        enhancement: !!enhancement,
      },
      { attempts: 1 }
    );

    return NextResponse.json({ taskId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: 创建任务查询接口**

创建 `src/app/api/tasks/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTask } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = getTask(id);

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: task.id,
    prompt: task.prompt,
    width: task.width,
    height: task.height,
    enhancement: !!task.enhancement,
    status: task.status,
    imageUrl:
      task.status === "completed" && task.image_path
        ? `/api/images/${task.image_path}`
        : null,
    error: task.error,
    createdAt: task.created_at,
    completedAt: task.completed_at,
  });
}
```

- [ ] **Step 3: 创建历史列表接口**

创建 `src/app/api/tasks/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTasks } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

  const result = getTasks(page, limit);

  return NextResponse.json({
    tasks: result.tasks.map((t) => ({
      id: t.id,
      prompt: t.prompt,
      width: t.width,
      height: t.height,
      enhancement: !!t.enhancement,
      status: t.status,
      imageUrl:
        t.status === "completed" && t.image_path
          ? `/api/images/${t.image_path}`
          : null,
      createdAt: t.created_at,
    })),
    total: result.total,
    page,
    limit,
  });
}
```

- [ ] **Step 4: 创建图片服务接口**

创建 `src/app/api/images/[filename]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent path traversal
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (sanitized !== filename) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "storage", "images", sanitized);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = readFileSync(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
```

- [ ] **Step 5: 提交**

```bash
git add src/app/api/
git commit -m "feat: add API routes for generate, tasks, and image serving"
```

---

### Task 7: UI 布局 & 主页

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`（如需调整）

- [ ] **Step 1: 更新根布局**

替换 `src/app/layout.tsx`：

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IDRL ImageGen",
  description: "AI Image Generation Service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="min-h-screen bg-background antialiased">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
            <a href="/" className="text-lg font-bold">
              IDRL ImageGen
            </a>
            <nav className="ml-auto flex gap-4">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                生图
              </a>
              <a
                href="/history"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                历史
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 更新主页骨架**

替换 `src/app/page.tsx`：

```typescript
import { GenerateForm } from "@/components/generate-form";

export default function Home() {
  return <GenerateForm />;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add app layout with navigation and home page shell"
```

---

### Task 8: 生图表单 & 任务状态

**Files:**
- Create: `src/components/generate-form.tsx`
- Create: `src/components/task-status.tsx`
- Create: `src/components/image-result.tsx`

- [ ] **Step 1: 创建生图表单组件**

创建 `src/components/generate-form.tsx`：

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TaskStatus } from "@/components/task-status";

const SIZE_OPTIONS = [
  { value: "landscape", label: "横版 (1264×848)" },
  { value: "portrait", label: "竖版 (848×1264)" },
  { value: "square", label: "方形 (1024×1024)" },
  { value: "widescreen", label: "宽屏 (1920×1080)" },
] as const;

export function GenerateForm() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<string>("landscape");
  const [enhancement, setEnhancement] = useState(true);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || submitting) return;

    setSubmitting(true);
    setTaskId(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size,
          enhancement,
        }),
      });

      const data = await res.json();
      if (data.taskId) {
        setTaskId(data.taskId);
      }
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">提示词</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的图片..."
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">尺寸</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enhancement"
              checked={enhancement}
              onChange={(e) => setEnhancement(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <label htmlFor="enhancement" className="text-sm">
              提示词增强
            </label>
          </div>

          <Button type="submit" disabled={!prompt.trim() || submitting}>
            {submitting ? "提交中..." : "生成图片"}
          </Button>
        </div>
      </form>

      {taskId && <TaskStatus taskId={taskId} />}
    </div>
  );
}
```

- [ ] **Step 2: 创建任务状态组件**

创建 `src/components/task-status.tsx`：

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { ImageResult } from "@/components/image-result";

interface TaskData {
  status: string;
  imageUrl: string | null;
  error: string | null;
}

export function TaskStatus({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<TaskData | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      setTask(data);
    } catch {
      // retry on next interval
    }
  }, [taskId]);

  useEffect(() => {
    fetchStatus();

    if (!task || (task.status !== "completed" && task.status !== "failed")) {
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [taskId, task?.status, fetchStatus]);

  if (!task) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground">查询状态中...</p>
      </div>
    );
  }

  if (task.status === "queued") {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground">排队中...</p>
      </div>
    );
  }

  if (task.status === "processing") {
    return (
      <div className="rounded-lg border p-6 text-center">
        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <p className="text-muted-foreground">正在生成图片...</p>
      </div>
    );
  }

  if (task.status === "failed") {
    return (
      <div className="rounded-lg border border-destructive p-6 text-center">
        <p className="font-medium text-destructive">生成失败</p>
        {task.error && (
          <p className="mt-1 text-sm text-muted-foreground">{task.error}</p>
        )}
      </div>
    );
  }

  if (task.status === "completed" && task.imageUrl) {
    return <ImageResult imageUrl={task.imageUrl} />;
  }

  return null;
}
```

- [ ] **Step 3: 创建图片展示组件**

创建 `src/components/image-result.tsx`：

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImageResult({ imageUrl }: { imageUrl: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        {!loaded && (
          <div className="flex h-64 items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">加载图片...</p>
          </div>
        )}
        <img
          src={imageUrl}
          alt="Generated image"
          className={`w-full ${loaded ? "block" : "hidden"}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={imageUrl} download>
            下载图片
          </a>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 验证页面可访问**

```bash
npm run dev
```

访问 http://localhost:3000，应看到表单界面（提示词输入框、尺寸选择、增强复选框、生成按钮）。

- [ ] **Step 5: 提交**

```bash
git add src/components/generate-form.tsx src/components/task-status.tsx src/components/image-result.tsx
git commit -m "feat: add generate form, task status polling, and image result components"
```

---

### Task 9: 历史页面

**Files:**
- Create: `src/components/history-list.tsx`
- Create: `src/app/history/page.tsx`

- [ ] **Step 1: 创建历史列表组件**

创建 `src/components/history-list.tsx`：

```typescript
"use client";

import { useEffect, useState } from "react";

interface HistoryItem {
  id: string;
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
  status: string;
  imageUrl: string | null;
  createdAt: string;
}

export function HistoryList() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  async function fetchHistory(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?page=${p}&limit=${limit}`);
      const data = await res.json();
      setItems(data.tasks || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return <p className="text-center text-muted-foreground">加载中...</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        还没有生成记录，去<a href="/" className="underline">生图</a>吧
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="cursor-pointer overflow-hidden rounded-lg border"
            onClick={() => setSelected(item)}
          >
            {item.status === "completed" && item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.prompt}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-muted">
                <span className="text-xs text-muted-foreground">
                  {item.status === "failed" ? "失败" : "处理中"}
                </span>
              </div>
            )}
            <div className="p-2">
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.prompt}
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-1 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.imageUrl && (
              <img
                src={selected.imageUrl}
                alt={selected.prompt}
                className="w-full rounded"
              />
            )}
            <div className="mt-3 space-y-1 text-sm">
              <p><strong>提示词：</strong>{selected.prompt}</p>
              <p><strong>尺寸：</strong>{selected.width}×{selected.height}</p>
              <p><strong>增强：</strong>{selected.enhancement ? "是" : "否"}</p>
              <p><strong>时间：</strong>{selected.createdAt}</p>
            </div>
            <div className="mt-3 flex gap-2">
              {selected.imageUrl && (
                <a
                  href={selected.imageUrl}
                  download
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background"
                >
                  下载
                </a>
              )}
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建历史页面**

创建 `src/app/history/page.tsx`：

```typescript
import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">生成历史</h1>
      <HistoryList />
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/history-list.tsx src/app/history/page.tsx
git commit -m "feat: add history page with grid view, detail modal, and pagination"
```

---

### Task 10: Worker 启动 & 集成

**Files:**
- Create: `instrumentation.ts`

- [ ] **Step 1: 创建 instrumentation 文件**

在项目根目录创建 `instrumentation.ts`（与 `src/` 同级）：

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { createWorker } = await import("./src/worker/image-worker");
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    createWorker(redisUrl);
    console.log("Image generation worker started");
  }
}
```

- [ ] **Step 2: 启动 Redis**

确保 Redis 正在运行。如果没有：

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

或者如果已安装 Redis：

```bash
redis-server --daemonize yes
```

验证 Redis 运行：

```bash
redis-cli ping
```

预期：`PONG`

- [ ] **Step 3: 验证 ComfyUI 可达**

```bash
curl -s http://192.168.1.39:8189/system_stats | head -20
```

预期：返回 ComfyUI 系统信息 JSON。

- [ ] **Step 4: 启动应用并测试端到端流程**

```bash
npm run dev
```

测试流程：
1. 访问 http://localhost:3000
2. 输入提示词（如 "一只可爱的小猫坐在窗台上"）
3. 选择尺寸，保持提示词增强开启
4. 点击 "生成图片"
5. 观察状态从 "排队中" → "正在生成图片" → 显示图片
6. 点击 "下载图片" 验证图片可下载
7. 点击导航 "历史" 验证记录出现

- [ ] **Step 5: 验证 history 页面**

访问 http://localhost:3000/history，确认刚才生成的图片在列表中显示，点击可查看大图和详细信息。

- [ ] **Step 6: 提交**

```bash
git add instrumentation.ts
git commit -m "feat: add worker startup via Next.js instrumentation"
```

---

## Self-Review

**1. Spec 覆盖率：**
- 文本生图（基础）→ Task 3-6（workflow builder + API + worker）
- 提示词增强开关 → Task 3（workflow builder enhancement 参数）+ Task 8（UI checkbox）
- 尺寸选择 → Task 6（SIZE_OPTIONS）+ Task 8（UI select）
- 生成历史 → Task 6（tasks API）+ Task 9（历史页面）
- 任务状态轮询 → Task 8（TaskStatus 组件，2秒轮询）
- 所有覆盖，无遗漏。

**2. 占位符扫描：** 无 TBD、TODO、"add validation"、"implement later"、"similar to Task N"。所有步骤包含完整代码。

**3. 类型一致性：** `ImageJobData` 在 queue.ts 定义，在 worker.ts 中作为 `Job<ImageJobData>` 使用，在 generate/route.ts 中传入相同字段。`TaskRow` 在 db.ts 定义，所有引用一致。`GenerateParams` 在 workflow-builder.ts 定义和导出。

**4. TextGenerate 节点参数说明：** Task 3 中 TextGenerate 节点的参数名（如 `max_new_tokens`、`keep_alive` 等）基于 widgets_values 推断。如果运行时 ComfyUI 报参数名错误，需查询 `GET http://192.168.1.39:8189/object_info/TextGenerate` 获取准确字段名并修改 `workflow-builder.ts`。
