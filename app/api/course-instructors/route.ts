import { NextRequest, NextResponse } from "next/server";
import { COURSE_INSTRUCTORS } from "@/lib/data";

// GET /api/course-instructors - List course instructors
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const franchiseId = searchParams.get("franchiseId");

  try {
    let courseInstructors = COURSE_INSTRUCTORS;

    // Filter by franchise if franchiseId provided
    if (franchiseId) {
      courseInstructors = COURSE_INSTRUCTORS.filter(
        (ci) => ci.franchiseId === franchiseId
      );
    }

    return NextResponse.json({
      success: true,
      courseInstructors,
      total: courseInstructors.length,
    });
  } catch (error) {
    console.error("Error fetching course instructors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch course instructors" },
      { status: 500 }
    );
  }
}

// POST /api/course-instructors - Create new course instructor application
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form fields
    const applicationData = {
      id: `CI_${Date.now()}`, // Temporary ID
      name: formData.get("name") as string,
      photo: "", // Handle file upload separately in production
      date: new Date().toISOString().split("T")[0], // Application date
      centreName: formData.get("centreName") as string,
      programName: formData.get("programName") as string,
      dob: formData.get("dob") as string,
      bloodGroup: formData.get("bloodGroup") as string,
      address: formData.get("address") as string,
      pincode: formData.get("pincode") as string,
      city: formData.get("city") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      educationalQualification: formData.get(
        "educationalQualification"
      ) as string,
      presentOccupation: formData.get("presentOccupation") as string,
      reference: (formData.get("reference") as string) || "",
      paymentDetails: {
        date: formData.get("paymentDate") as string,
        amount: Number(formData.get("paymentAmount")) || 0,
      },

      // Initial status - pending approval
      status: "Pending" as const,
      uniqueCiCode: undefined, // Will be generated upon approval
      agreementGenerated: false,

      // Franchise connection (get from user session in production)
      franchiseId: "1", // Mock - should come from authenticated user
      franchiseName: "Mumbai Central", // Mock - should come from franchise data

      // CI Management fields (will be filled after approval)
      ciFees: Number(formData.get("paymentAmount")) || 0,
      dateOfPayment: formData.get("paymentDate") as string,
      installment: 1 as const, // Default to first installment
      dateOfJoining: "", // Will be set after approval
      ciShare: 0, // Will be set during approval
      expiryDateOfAgreement: "", // Will be calculated after approval
      activeStatus: "Inactive" as const, // Will be activated after approval

      // Training details (empty initially)
      trainingLevels: [],
      competitionRegn: "",
    };

    // Validate required fields
    const requiredFields = [
      "name",
      "centreName",
      "programName",
      "dob",
      "bloodGroup",
      "address",
      "pincode",
      "city",
      "phone",
      "email",
      "educationalQualification",
      "presentOccupation",
    ];

    for (const field of requiredFields) {
      if (!applicationData[field as keyof typeof applicationData]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // In production, save to database
    // For now, we'll simulate success
    console.log("New Course Instructor Application:", applicationData);

    return NextResponse.json({
      success: true,
      message: "Course Instructor application submitted successfully",
      application: applicationData,
      nextSteps: [
        "Application is pending admin approval",
        "Admin will review and approve/reject",
        "Upon approval, CI Code will be generated",
        "Agreement will be generated after approval",
      ],
    });
  } catch (error) {
    console.error("Error creating course instructor application:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
