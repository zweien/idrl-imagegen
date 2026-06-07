import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });
import { createWorker } from "./image-worker";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
console.log(`[worker] starting with REDIS_URL=${redisUrl}`);

const worker = createWorker(redisUrl);

worker.on("ready", () => {
  console.log("[worker] ready, waiting for jobs...");
});

process.on("SIGINT", async () => {
  console.log("[worker] shutting down...");
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[worker] shutting down...");
  await worker.close();
  process.exit(0);
});
