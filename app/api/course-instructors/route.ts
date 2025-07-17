import { NextRequest, NextResponse } from "next/server";

const BIN_ID = "6878f3aedb4fa954e67c4fe1";
const API_KEY = "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchCIs() {
  const res = await fetch(`${BASE_URL}/latest`, {
    headers: { "X-Master-Key": API_KEY },
    cache: "no-store",
  });
  const data = await res.json();
  return data.record || [];
}

async function saveCIs(cis: any[]) {
  const res = await fetch(BASE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
    },
    body: JSON.stringify(cis),
  });
  return res.ok;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const franchiseId = searchParams.get("franchiseId");
  try {
    let cis = await fetchCIs();
    if (franchiseId) {
      cis = cis.filter((ci: any) => ci.franchiseId === franchiseId);
    }
    return NextResponse.json({
      success: true,
      courseInstructors: cis,
      total: cis.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch course instructors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate required fields (add more as needed)
    if (!body.name || !body.centreName || !body.programName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const cis = await fetchCIs();
    const newInstructor = {
      ...body,
      id: `CI_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      status: "Pending",
      agreementGenerated: false,
      uniqueCiCode: undefined,
      ciFees: body.ciFees || 0,
      dateOfPayment: body.dateOfPayment || "",
      installment: body.installment || 1,
      completedInstallments: body.completedInstallments || 0,
      dateOfJoining: body.dateOfJoining || "",
      ciShare: body.ciShare || 0,
      expiryDateOfAgreement: body.expiryDateOfAgreement || "",
      activeStatus: body.activeStatus || "Inactive",
      trainingLevels: body.trainingLevels || [],
      competitionRegn: body.competitionRegn || "",
    };
    cis.push(newInstructor);
    await saveCIs(cis);
    return NextResponse.json({ success: true, application: newInstructor });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add course instructor" },
      { status: 500 }
    );
  }
}
