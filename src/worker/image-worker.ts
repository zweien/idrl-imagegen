import { Worker, Job } from "bullmq";
import { buildWorkflowForModel } from "../lib/workflow-builder";
import { submitPrompt, pollUntilComplete, downloadImage } from "../lib/comfyui";
import { getDb, updateStatus } from "../lib/db";
import { ImageJobData, QUEUE_NAME } from "../lib/queue";
import { MODELS, DEFAULT_MODEL } from "../lib/types";
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
      const { taskId, prompt, width, height, enhancement, model = DEFAULT_MODEL } = job.data;

      console.log(`[worker] processing job ${job.id}, taskId=${taskId}, model=${model}, size=${width}x${height}`);

      try {
        updateStatus(taskId, "processing");

        const { workflow, outputNodeId } = buildWorkflowForModel(model, { prompt, width, height, enhancement });
        const comfyuiId = await submitPrompt(workflow);

        updateStatus(taskId, "processing", { comfyui_prompt_id: comfyuiId });

        const history = await pollUntilComplete(comfyuiId);

        const saveOutput = history.outputs[outputNodeId];
        if (!saveOutput?.images?.[0]) {
          throw new Error("No image found in ComfyUI output");
        }

        const { filename, subfolder, type } = saveOutput.images[0];
        const imageBuffer = await downloadImage(filename, subfolder, type);

        const localFilename = `${taskId}.png`;
        writeFileSync(join(IMAGE_DIR, localFilename), imageBuffer);

        const enhancedPrompt = extractEnhancedPrompt(history.outputs, enhancement, model);

        updateStatus(taskId, "completed", { image_path: localFilename, enhanced_prompt: enhancedPrompt });
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

function extractEnhancedPrompt(
  outputs: Record<string, any>,
  enhancement: boolean,
  model: string
): string | null {
  if (!enhancement) return null;
  const modelConfig = MODELS[model];
  const nodeId = modelConfig?.enhanceOutputNodeId || "103";
  const previewOutput = outputs[nodeId];
  if (previewOutput?.text) {
    return Array.isArray(previewOutput.text)
      ? previewOutput.text[0]
      : String(previewOutput.text);
  }
  return null;
}
