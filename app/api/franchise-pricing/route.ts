import { NextRequest, NextResponse } from "next/server";
import { FranchisePricingConfig, getDefaultPricingConfig } from "@/lib/pricing";

const BIN_ID = "687a12345678901234567890"; // You'll need to create a new JSONBin for pricing configs
const API_KEY = "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchPricingConfigs(): Promise<FranchisePricingConfig[]> {
  try {
    const res = await fetch(`${BASE_URL}/latest`, {
      headers: { "X-Master-Key": API_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return data.record || [];
  } catch (error) {
    console.error("Error fetching pricing configs:", error);
    return [];
  }
}

async function savePricingConfigs(
  configs: FranchisePricingConfig[]
): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY,
      },
      body: JSON.stringify(configs),
    });
    return res.ok;
  } catch (error) {
    console.error("Error saving pricing configs:", error);
    return false;
  }
}

// GET - Fetch pricing configs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");

    const configs = await fetchPricingConfigs();

    if (franchiseId) {
      // Return specific franchise pricing config
      let config = configs.find((c) => c.franchiseId === franchiseId);

      // If no config exists, create default one
      if (!config) {
        // Fetch franchise name
        const franchiseRes = await fetch(
          `${
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
          }/api/franchises?franchiseId=${franchiseId}`,
          {
            headers: { "X-Master-Key": API_KEY },
          }
        );
        let franchiseName = "Unknown Franchise";
        if (franchiseRes.ok) {
          const franchiseData = await franchiseRes.json();
          franchiseName = franchiseData.franchise?.name || franchiseName;
        }

        config = getDefaultPricingConfig(franchiseId, franchiseName);
        configs.push(config);
        await savePricingConfigs(configs);
      }

      return NextResponse.json({ config });
    }

    // Return all configs
    return NextResponse.json({ configs });
  } catch (error) {
    console.error("Error in GET /api/franchise-pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create or update pricing config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { franchiseId, ...configData } = body;

    if (!franchiseId) {
      return NextResponse.json(
        { error: "Franchise ID is required" },
        { status: 400 }
      );
    }

    const configs = await fetchPricingConfigs();
    const existingIndex = configs.findIndex(
      (c) => c.franchiseId === franchiseId
    );

    const updatedConfig: FranchisePricingConfig = {
      franchiseId,
      ...configData,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing config
      configs[existingIndex] = {
        ...configs[existingIndex],
        ...updatedConfig,
      };
    } else {
      // Create new config
      configs.push({
        ...updatedConfig,
        createdAt: new Date().toISOString(),
      });
    }

    const success = await savePricingConfigs(configs);

    if (success) {
      return NextResponse.json({
        message: "Pricing configuration saved successfully",
        config:
          configs[existingIndex >= 0 ? existingIndex : configs.length - 1],
      });
    } else {
      return NextResponse.json(
        { error: "Failed to save pricing configuration" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/franchise-pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete pricing config
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");

    if (!franchiseId) {
      return NextResponse.json(
        { error: "Franchise ID is required" },
        { status: 400 }
      );
    }

    const configs = await fetchPricingConfigs();
    const filteredConfigs = configs.filter(
      (c) => c.franchiseId !== franchiseId
    );

    if (filteredConfigs.length === configs.length) {
      return NextResponse.json(
        { error: "Pricing configuration not found" },
        { status: 404 }
      );
    }

    const success = await savePricingConfigs(filteredConfigs);

    if (success) {
      return NextResponse.json({
        message: "Pricing configuration deleted successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to delete pricing configuration" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in DELETE /api/franchise-pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
