import { NextResponse } from "next/server";
import { loadSession, deleteSession } from "./storage";

export async function GET(request) {
  const sid = request.cookies.get("vocab_sid")?.value;
  if (!sid) return NextResponse.json({ session: null });
  const data = loadSession(sid);
  return NextResponse.json({ session: data });
}

export async function DELETE(request) {
  const sid = request.cookies.get("vocab_sid")?.value;
  const type = new URL(request.url).searchParams.get("type");
  if (sid) deleteSession(sid, type);
  const res = NextResponse.json({ ok: true });
  if (!type) res.cookies.delete("vocab_sid");
  return res;
}
