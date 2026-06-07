import { NextRequest, NextResponse } from "next/server";
import { loadMessages, updateConversation, deleteConversation } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = loadMessages(id);
  return NextResponse.json(messages);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  updateConversation(id, {
    title: body.title,
    lastMessageAt: body.lastMessageAt,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteConversation(id);
  return NextResponse.json({ ok: true });
}
