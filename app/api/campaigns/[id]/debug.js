import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  return NextResponse.json({
    message: "Dynamic route IS executing",
    id: params.id,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });
}
