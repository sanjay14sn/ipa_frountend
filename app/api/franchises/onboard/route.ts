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

async function updateFranchises(franchises: any[]) {
  try {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY,
      },
      body: JSON.stringify(franchises),
    });
    return res.ok;
  } catch (error) {
    console.error("Error updating franchises:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      franchiseId,
      agreementAccepted,
      paymentCompleted,
      onboardingCompleted,
    } = body;

    if (!franchiseId) {
      return NextResponse.json(
        { error: "Franchise ID is required" },
        { status: 400 }
      );
    }

    const franchises = await fetchFranchises();
    const franchiseIndex = franchises.findIndex(
      (franchise: any) => franchise.id === franchiseId
    );

    if (franchiseIndex === -1) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      );
    }

    // Update franchise onboarding status
    franchises[franchiseIndex] = {
      ...franchises[franchiseIndex],
      agreementAccepted,
      paymentCompleted,
      onboardingCompleted,
      onboardingCompletedAt: onboardingCompleted
        ? new Date().toISOString()
        : null,
      updatedAt: new Date().toISOString(),
    };

    const success = await updateFranchises(franchises);

    if (success) {
      return NextResponse.json({
        message: "Franchise onboarding completed successfully",
        franchise: franchises[franchiseIndex],
      });
    } else {
      return NextResponse.json(
        { error: "Failed to update franchise status" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error completing franchise onboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
