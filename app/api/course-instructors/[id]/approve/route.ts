import { NextRequest, NextResponse } from "next/server";

// POST /api/course-instructors/[id]/approve - Approve course instructor and generate CI code
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      ciShare = 40,
      dateOfJoining,
      agreementDuration = 24, // months
    } = body;

    // Generate unique CI Code
    const uniqueCiCode = generateCiCode();

    // Calculate agreement expiry date
    const joiningDate = new Date(dateOfJoining);
    const expiryDate = new Date(joiningDate);
    expiryDate.setMonth(expiryDate.getMonth() + agreementDuration);

    const approvalData = {
      status: "Approved",
      uniqueCiCode,
      agreementGenerated: true,
      dateOfJoining,
      ciShare,
      expiryDateOfAgreement: expiryDate.toISOString().split("T")[0],
      activeStatus: "Active",
      approvedAt: new Date().toISOString(),
      approvedBy: "admin", // In production, get from authenticated user
    };

    // In production, update database
    // TODO: Update database with approval data

    return NextResponse.json({
      success: true,
      message: "Course Instructor approved successfully",
      data: approvalData,
      uniqueCiCode,
      nextSteps: [
        "CI Code generated and assigned",
        "Agreement document will be generated",
        "Course Instructor can now be assigned training levels",
        "Course Instructor is now active and connected to franchise",
      ],
    });
  } catch (error) {
    console.error("Error approving course instructor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve course instructor" },
      { status: 500 }
    );
  }
}

// POST /api/course-instructors/[id]/reject - Reject course instructor application
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { reason = "Application does not meet requirements" } = body;

    const rejectionData = {
      status: "Rejected",
      rejectedAt: new Date().toISOString(),
      rejectedBy: "admin", // In production, get from authenticated user
      rejectionReason: reason,
    };

    // In production, update database
    // TODO: Update database with rejection data

    return NextResponse.json({
      success: true,
      message: "Course Instructor application rejected",
      data: rejectionData,
    });
  } catch (error) {
    console.error("Error rejecting course instructor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reject course instructor" },
      { status: 500 }
    );
  }
}

// Helper function to generate unique CI Code
function generateCiCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CI${timestamp}${random}`;
}
