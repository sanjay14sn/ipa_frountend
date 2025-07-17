import { NextRequest, NextResponse } from "next/server";
import { FRANCHISES } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");

    if (franchiseId) {
      const franchise = FRANCHISES.find((f) => f.id === franchiseId);
      if (!franchise) {
        return NextResponse.json(
          { error: "Franchise not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ franchise });
    }

    return NextResponse.json({ franchises: FRANCHISES });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
