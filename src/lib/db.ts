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
      enhanced_prompt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);
  try {
    db!.exec("ALTER TABLE tasks ADD COLUMN enhanced_prompt TEXT");
  } catch {
    // Column already exists
  }
  try {
    db!.exec("ALTER TABLE tasks ADD COLUMN model TEXT NOT NULL DEFAULT 'ernie-turbo'");
  } catch {
    // Column already exists
  }

  db!.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db!.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);
  db!.exec("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)");
}

export interface TaskRow {
  id: string;
  prompt: string;
  width: number;
  height: number;
  enhancement: number;
  model: string;
  status: string;
  image_path: string | null;
  comfyui_prompt_id: string | null;
  error: string | null;
  enhanced_prompt: string | null;
  created_at: string;
  completed_at: string | null;
}

export function insertTask(task: {
  id: string;
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
  model: string;
  enhancedPrompt?: string;
}): void {
  getDb()
    .prepare(
      "INSERT INTO tasks (id, prompt, width, height, enhancement, model, enhanced_prompt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(task.id, task.prompt, task.width, task.height, task.enhancement ? 1 : 0, task.model, task.enhancedPrompt ?? null);
}

export function updateStatus(
  id: string,
  status: string,
  extra?: { comfyui_prompt_id?: string; image_path?: string; enhanced_prompt?: string | null; error?: string }
): void {
  if (status === "completed") {
    getDb()
      .prepare(
        "UPDATE tasks SET status = ?, image_path = ?, enhanced_prompt = COALESCE(?, enhanced_prompt), completed_at = datetime('now') WHERE id = ?"
      )
      .run(status, extra?.image_path ?? null, extra?.enhanced_prompt ?? null, id);
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

// --- Conversations ---

export interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string;
}

export function getConversations(): ConversationRow[] {
  return getDb()
    .prepare("SELECT * FROM conversations ORDER BY last_message_at DESC")
    .all() as ConversationRow[];
}

export function createConversation(id: string): ConversationRow {
  getDb()
    .prepare("INSERT INTO conversations (id) VALUES (?)")
    .run(id);
  return getDb().prepare("SELECT * FROM conversations WHERE id = ?").get(id) as ConversationRow;
}

export function updateConversation(
  id: string,
  updates: { title?: string; lastMessageAt?: string }
): void {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (updates.title !== undefined) { sets.push("title = ?"); vals.push(updates.title); }
  if (updates.lastMessageAt !== undefined) { sets.push("last_message_at = ?"); vals.push(updates.lastMessageAt); }
  if (sets.length === 0) return;
  vals.push(id);
  getDb().prepare(`UPDATE conversations SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function deleteConversation(id: string): void {
  getDb().prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
  getDb().prepare("DELETE FROM conversations WHERE id = ?").run(id);
}

export function saveMessages(conversationId: string, messages: Array<{ id: string; role: string; [key: string]: unknown }>): void {
  const del = getDb().prepare("DELETE FROM messages WHERE conversation_id = ?");
  const ins = getDb().prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)");
  const upd = getDb().prepare("UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?");

  const tx = getDb().transaction(() => {
    del.run(conversationId);
    for (const msg of messages) {
      ins.run(msg.id, conversationId, msg.role, JSON.stringify(msg));
    }
    upd.run(conversationId);
  });
  tx();
}

export function loadMessages(conversationId: string): Array<Record<string, unknown>> {
  const rows = getDb()
    .prepare("SELECT content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as Array<{ content: string }>;
  return rows.map((r) => JSON.parse(r.content));
}
