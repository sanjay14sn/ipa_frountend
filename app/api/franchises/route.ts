import { NextRequest, NextResponse } from "next/server";

const BIN_ID = "6878f3ff09704554f6be9850";
const API_KEY = "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchFranchises() {
  const res = await fetch(`${BASE_URL}/latest`, {
    headers: { "X-Master-Key": API_KEY },
    cache: "no-store",
  });
  const data = await res.json();
  return data.record || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");
    const franchises = await fetchFranchises();
    if (franchiseId) {
      const franchise = franchises.find((f: any) => f.id === franchiseId);
      if (!franchise) {
        return NextResponse.json(
          { error: "Franchise not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ franchise });
    }
    return NextResponse.json({ franchises });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
