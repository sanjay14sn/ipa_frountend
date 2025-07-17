import { NextRequest, NextResponse } from "next/server";
import { CONTESTS } from "@/lib/data";

export async function GET() {
  try {
    return NextResponse.json({ contests: CONTESTS });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
