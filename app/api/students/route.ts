import { NextRequest, NextResponse } from "next/server";
import { STUDENTS } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");

    if (franchiseId) {
      const students = STUDENTS.filter((s) => s.franchiseId === franchiseId);
      return NextResponse.json({ students });
    }

    return NextResponse.json({ students: STUDENTS });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
