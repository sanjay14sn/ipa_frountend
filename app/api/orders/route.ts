import { NextRequest, NextResponse } from "next/server";
import { ORDERS } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");

    if (franchiseId) {
      const orders = ORDERS.filter((o) => o.franchiseId === franchiseId);
      return NextResponse.json({ orders });
    }

    return NextResponse.json({ orders: ORDERS });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
