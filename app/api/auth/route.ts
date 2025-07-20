import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createFranchiseUser } from "@/lib/auth";

// Function to fetch franchises data
async function fetchFranchises() {
  const BIN_ID = "6878f3ff09704554f6be9850";
  const API_KEY =
    "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
  const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  try {
    const res = await fetch(`${BASE_URL}/latest`, {
      headers: { "X-Master-Key": API_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return data.record || [];
  } catch (error) {
    console.error("Error fetching franchises:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // First try static users (admin and demo franchise)
    const user = await authenticateUser(email, password);

    if (user) {
      return NextResponse.json({ user });
    }

    // If not found in static users, check dynamically created franchises
    const franchises = await fetchFranchises();
    const matchingFranchise = franchises.find(
      (f: any) => f.loginEmail === email && f.loginPassword === password
    );

    if (matchingFranchise) {
      const franchiseUser = createFranchiseUser(matchingFranchise);
      return NextResponse.json({ user: franchiseUser });
    }

    // No matching user found
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
