import { NextRequest, NextResponse } from "next/server";
import { getConversations, createConversation } from "@/lib/db";

export async function GET() {
  const convs = getConversations();
  return NextResponse.json(
    convs.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.created_at,
      lastMessageAt: c.last_message_at,
    }))
  );
}

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const conv = createConversation(id);
  return NextResponse.json({
    id: conv.id,
    title: conv.title,
    createdAt: conv.created_at,
    lastMessageAt: conv.last_message_at,
  });
}
