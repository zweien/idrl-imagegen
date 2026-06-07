import { NextRequest, NextResponse } from "next/server";
import { loadMessages, saveMessages } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = loadMessages(id);
  return NextResponse.json(messages);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await request.json();
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
  }
  saveMessages(id, messages);
  return NextResponse.json({ ok: true });
}
