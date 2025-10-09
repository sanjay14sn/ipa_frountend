import { NextRequest, NextResponse } from "next/server";

// POST /api/course-instructors/approve-training/[id] - Approve training for course instructor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { dateOfTraining, amount, installmentCount, installmentAmount } =
      body;

    // Validate required fields
    if (!dateOfTraining || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "dateOfTraining and amount are required",
        },
        { status: 400 }
      );
    }

    // Validate date format
    const trainingDate = new Date(dateOfTraining);
    if (isNaN(trainingDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid dateOfTraining format",
        },
        { status: 400 }
      );
    }

    // Validate amount is a number
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "amount must be a positive number",
        },
        { status: 400 }
      );
    }

    // If EMI is provided, validate installment fields
    if (installmentCount || installmentAmount) {
      if (!installmentCount || !installmentAmount) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Both installmentCount and installmentAmount are required when EMI is used",
          },
          { status: 400 }
        );
      }

      if (typeof installmentCount !== "number" || installmentCount <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "installmentCount must be a positive number",
          },
          { status: 400 }
        );
      }

      if (typeof installmentAmount !== "number" || installmentAmount <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "installmentAmount must be a positive number",
          },
          { status: 400 }
        );
      }
    }

    const trainingApprovalData = {
      instructorId: id,
      dateOfTraining: trainingDate.toISOString(),
      amount,
      installmentCount: installmentCount || null,
      installmentAmount: installmentAmount || null,
      approvedAt: new Date().toISOString(),
      approvedBy: "admin", // In production, get from authenticated user
    };

    // In production, update database
    // TODO: Update database with training approval data

    return NextResponse.json({
      success: true,
      message: "Training approved successfully",
      data: trainingApprovalData,
    });
  } catch (error) {
    console.error("Error approving training:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve training" },
      { status: 500 }
    );
  }
}
