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
