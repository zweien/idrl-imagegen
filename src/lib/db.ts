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
