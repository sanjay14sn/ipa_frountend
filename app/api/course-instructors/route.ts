import { NextRequest, NextResponse } from "next/server";
import { COURSE_INSTRUCTORS } from "@/lib/data";
import fs from "fs";
import path from "path";

const dataFile = path.resolve(process.cwd(), "lib/data.ts");

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
    let body;
    let isJson = false;
    try {
      body = await request.json();
      isJson = true;
    } catch {
      body = await request.formData();
    }
    let newInstructor;
    if (isJson) {
      // Validate required fields
      if (
        !body.name ||
        !body.centreName ||
        !body.programName ||
        !body.dob ||
        !body.bloodGroup ||
        !body.address ||
        !body.pincode ||
        !body.city ||
        !body.phone ||
        !body.email ||
        !body.educationalQualification ||
        !body.presentOccupation
      ) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }
      newInstructor = {
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
    } else {
      // Legacy formData logic
      newInstructor = {
        id: `CI_${Date.now()}`,
        name: body.get("name") as string,
        photo: "",
        date: new Date().toISOString().split("T")[0],
        centreName: body.get("centreName") as string,
        programName: body.get("programName") as string,
        dob: body.get("dob") as string,
        bloodGroup: body.get("bloodGroup") as string,
        address: body.get("address") as string,
        pincode: body.get("pincode") as string,
        city: body.get("city") as string,
        phone: body.get("phone") as string,
        email: body.get("email") as string,
        educationalQualification: body.get(
          "educationalQualification"
        ) as string,
        presentOccupation: body.get("presentOccupation") as string,
        reference: (body.get("reference") as string) || "",
        paymentDetails: {
          date: body.get("paymentDate") as string,
          amount: Number(body.get("paymentAmount")) || 0,
        },
        status: "Pending",
        uniqueCiCode: undefined,
        agreementGenerated: false,
        franchiseId: "1",
        franchiseName: "Mumbai Central",
        ciFees: Number(body.get("paymentAmount")) || 0,
        dateOfPayment: body.get("paymentDate") as string,
        installment: 1,
        dateOfJoining: "",
        ciShare: 0,
        expiryDateOfAgreement: "",
        activeStatus: "Inactive",
        trainingLevels: [],
        competitionRegn: "",
      };
    }
    let fileContent = fs.readFileSync(dataFile, "utf-8");
    fileContent = fileContent.replace(
      /(export const COURSE_INSTRUCTORS: CourseInstructor\[] = \[)([\s\S]*?)(\];)/,
      (match, start, arr, end) => {
        const arrTrimmed = arr.trim().replace(/\n?$/, "");
        const needsComma = arrTrimmed && !arrTrimmed.endsWith(",");
        const newArr =
          arrTrimmed +
          (needsComma ? "," : "") +
          `\n  ${JSON.stringify(newInstructor, null, 2)}`;
        return `${start}${newArr}\n${end}`;
      }
    );
    fs.writeFileSync(dataFile, fileContent, "utf-8");
    return NextResponse.json({ success: true, application: newInstructor });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add course instructor" },
      { status: 500 }
    );
  }
}
