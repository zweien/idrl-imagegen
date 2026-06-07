export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { createWorker } = await import("./src/worker/image-worker");
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    createWorker(redisUrl);
    console.log("Image generation worker started");
  }
}
