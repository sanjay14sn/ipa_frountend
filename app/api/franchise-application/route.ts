import { NextRequest, NextResponse } from "next/server";

const BIN_ID = "687a10948de3783286a96c92"; // Updated bin for applications
const API_KEY = "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchApplications() {
  try {
    const res = await fetch(`${BASE_URL}/latest`, {
      headers: { "X-Master-Key": API_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return data.record || [];
  } catch (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
}

async function updateApplications(applications: any[]) {
  try {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY,
      },
      body: JSON.stringify(applications),
    });
    return res.ok;
  } catch (error) {
    console.error("Error updating applications:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");
    const applications = await fetchApplications();

    if (applicationId) {
      const application = applications.find(
        (app: any) => app.id === applicationId
      );
      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ application });
    }

    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const applications = await fetchApplications();

    const newApplication = {
      id: Date.now().toString(),
      ...body,
      status: "pending_approval",
      submittedAt: new Date().toISOString(),
      name: body.name,
      franchiseeName: body.franchiseeName,
      photoImage: body.photoImage,
      franchiseeType: body.franchiseeType,
      programName: body.programName,
      dob: body.dob,
      bloodGroup: body.bloodGroup,
      centreAddress: body.centreAddress,
      centrePincode: body.centrePincode,
      communicationAddress: body.communicationAddress,
      communicationPincode: body.communicationPincode,
      city: body.city,
      phoneNo: body.phoneNo,
      emailId: body.emailId,
      educationalQualification: body.educationalQualification,
      presentOccupation: body.presentOccupation,
      reference: body.reference,
      date: body.date,
      password: undefined,
      confirmPassword: undefined,
    };

    applications.push(newApplication);
    const success = await updateApplications(applications);

    if (success) {
      return NextResponse.json({
        message: "Application submitted successfully",
        applicationId: newApplication.id,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, status, paymentDetails } = body;

    const applications = await fetchApplications();
    const applicationIndex = applications.findIndex(
      (app: any) => app.id === applicationId
    );

    if (applicationIndex === -1) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    applications[applicationIndex] = {
      ...applications[applicationIndex],
      status,
      paymentDetails,
      updatedAt: new Date().toISOString(),
    };

    const success = await updateApplications(applications);

    if (success) {
      return NextResponse.json({ message: "Application updated successfully" });
    } else {
      return NextResponse.json(
        { error: "Failed to update application" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
