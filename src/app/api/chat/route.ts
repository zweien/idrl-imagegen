import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";

const SYSTEM_PROMPT = `你是一个专业的AI图片生成助手（IDRL ImageGen）。你可以帮助用户生成各种风格的图片。

## 核心能力
- 根据用户的描述生成高质量图片
- 理解各种图片风格、构图、色彩需求
- 支持中文和英文描述

## 工作流程
1. 当用户想要生成图片时，使用 generateImage 工具
2. 默认使用横版(landscape)尺寸，除非用户指定其他尺寸
3. 默认开启提示词增强(enhancement=true)，这会自动优化用户的简短描述
4. 用户可能用各种方式表达生图需求，如"画一个"、"生成"、"创建图片"、"帮我画"等
5. 用户也可能修改之前的要求，如"换个大一点的"、"改成竖版的"

## 对话风格
- 简洁友好，用中文回复
- 当用户请求生图时，直接调用工具，不需要过多解释
- 如果用户的消息不够明确，可以简短询问细节
- 对于非生图的闲聊，正常友好回复即可

## 尺寸选项
- landscape: 横版 (1264×848) — 默认
- portrait: 竖版 (848×1264)
- square: 方形 (1024×1024)
- widescreen: 宽屏 (1920×1080)

## 生图模型
- ernie-turbo: ERNIE Turbo，8步快速出图（默认）
- hidream: HiDream O1，28步高质量出图
- flux-schnell: FLUX Schnell，4步极速出图
- qwen-image: Qwen Image，20步出图
注意：只有 ernie-turbo 支持提示词增强，其他模型不支持。如果用户未指定模型，使用 ernie-turbo。`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const provider = createOpenAI({
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const model = provider.chat(process.env.OPENAI_MODEL || "gpt-4o");

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: {
      generateImage: tool({
        description: "根据文字描述生成图片",
        inputSchema: z.object({
          prompt: z.string().describe("图片内容描述"),
          size: z
            .enum(["landscape", "portrait", "square", "widescreen"])
            .optional()
            .describe("图片尺寸，默认landscape"),
          enhancement: z
            .boolean()
            .optional()
            .describe("是否启用提示词增强，默认true（仅ernie-turbo支持）"),
          model: z
            .enum(["ernie-turbo", "hidream", "flux-schnell", "qwen-image"])
            .optional()
            .describe("生图模型，默认ernie-turbo"),
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
