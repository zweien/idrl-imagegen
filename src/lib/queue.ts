import { Queue } from "bullmq";

export const QUEUE_NAME = "image-generation";

export interface ImageJobData {
  taskId: string;
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
  model: string;
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
