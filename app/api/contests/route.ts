import { NextRequest, NextResponse } from "next/server";

const BIN_ID = "6878f3d809704554f6be982c";
const API_KEY = "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchContests() {
  const res = await fetch(`${BASE_URL}/latest`, {
    headers: { "X-Master-Key": API_KEY },
    cache: "no-store",
  });
  const data = await res.json();
  return data.record || [];
}

export async function GET() {
  try {
    const contests = await fetchContests();
    return NextResponse.json({ contests });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
