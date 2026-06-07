import { NextRequest, NextResponse } from "next/server";
import { buildEnhanceOnlyWorkflow } from "@/lib/workflow-builder";
import { submitPrompt, pollUntilComplete } from "@/lib/comfyui";
import { SIZE_OPTIONS, MODELS, DEFAULT_MODEL, type SizeKey } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = "landscape", model = DEFAULT_MODEL } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const modelConfig = MODELS[model];
    if (!modelConfig || !modelConfig.supportsEnhancement) {
      return NextResponse.json({ enhancedPrompt: prompt.trim() });
    }

    const dimensions = SIZE_OPTIONS[(size as SizeKey) || "landscape"] || SIZE_OPTIONS.landscape;

    const workflow = buildEnhanceOnlyWorkflow({
      prompt: prompt.trim(),
      width: dimensions.width,
      height: dimensions.height,
    });

    const comfyuiId = await submitPrompt(workflow);
    const history = await pollUntilComplete(comfyuiId, 60000);

    const enhanceNodeId = modelConfig.enhanceOutputNodeId || "103";
    const previewOutput = history.outputs[enhanceNodeId];
    const enhancedPrompt = previewOutput?.text
      ? Array.isArray(previewOutput.text)
        ? previewOutput.text[0]
        : String(previewOutput.text)
      : null;

    if (!enhancedPrompt) {
      return NextResponse.json(
        { error: "增强提示词生成失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ enhancedPrompt });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
