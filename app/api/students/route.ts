import { NextRequest, NextResponse } from "next/server";

const BIN_ID = "6878f36109704554f6be97e9";
const API_KEY = "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Generate roll number based on franchise and year
function generateRollNumber(franchiseId: string, studentCount: number): string {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const franchiseCode = franchiseId.substring(0, 3).toUpperCase();
  const sequence = (studentCount + 1).toString().padStart(3, "0");
  return `${franchiseCode}${currentYear}${sequence}`;
}

async function fetchStudents() {
  try {
    const res = await fetch(`${BASE_URL}/latest`, {
      headers: { "X-Master-Key": API_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return data.record || [];
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
}

async function saveStudents(students: any[]) {
  try {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY,
      },
      body: JSON.stringify(students),
    });
    return res.ok;
  } catch (error) {
    console.error("Error saving students:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");
    const studentId = searchParams.get("studentId");

    const students = await fetchStudents();

    if (studentId) {
      const student = students.find((s: any) => s.id === studentId);
      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ student });
    }

    if (franchiseId) {
      const franchiseStudents = students.filter(
        (s: any) => s.franchiseId === franchiseId
      );
      return NextResponse.json({ students: franchiseStudents });
    }

    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form data
    const studentData = {
      // Basic Information
      registrationType: formData.get("registrationType")?.toString() || "new",
      studentName: formData.get("studentName")?.toString() || "",
      dob: formData.get("dob")?.toString() || "",
      sex: formData.get("sex")?.toString() || "",
      standard: formData.get("standard")?.toString() || "",
      level: formData.get("level")?.toString() || "",
      stream: formData.get("stream")?.toString() || "regular",
      status: formData.get("status")?.toString() || "active",

      // Father Details
      fatherName: formData.get("fatherName")?.toString() || "",
      fatherQualification:
        formData.get("fatherQualification")?.toString() || "",
      fatherOccupation: formData.get("fatherOccupation")?.toString() || "",
      fatherContactNo: formData.get("fatherContactNo")?.toString() || "",

      // Mother Details
      motherName: formData.get("motherName")?.toString() || "",
      motherQualification:
        formData.get("motherQualification")?.toString() || "",
      motherOccupation: formData.get("motherOccupation")?.toString() || "",
      motherContactNo: formData.get("motherContactNo")?.toString() || "",

      // Contact Information
      residentialAddress: formData.get("residentialAddress")?.toString() || "",
      mailId: formData.get("mailId")?.toString() || "",

      // Status Management
      isDiscontinued: formData.get("isDiscontinued") === "true",
      discontinueReason: formData.get("discontinueReason")?.toString() || "",

      // Franchise Information
      franchiseId: formData.get("franchiseId")?.toString() || "",
      franchiseName: formData.get("franchiseName")?.toString() || "",

      // Photo handling (for now, store filename, in production upload to cloud)
      photoImage: formData.get("photoImage") as File | null,
    };

    // Validation
    const requiredFields = [
      "studentName",
      "dob",
      "sex",
      "fatherName",
      "motherName",
      "residentialAddress",
      "mailId",
      "standard",
      "level",
      "franchiseId",
      "franchiseName",
      "fatherContactNo",
      "motherContactNo",
    ];

    for (const field of requiredFields) {
      if (
        !studentData[field as keyof typeof studentData] &&
        field !== "photoImage"
      ) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate phone numbers
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(studentData.fatherContactNo)) {
      return NextResponse.json(
        { error: "Father's contact number must be 10 digits" },
        { status: 400 }
      );
    }

    if (!phoneRegex.test(studentData.motherContactNo)) {
      return NextResponse.json(
        { error: "Mother's contact number must be 10 digits" },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(studentData.mailId)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const students = await fetchStudents();

    // Count students in the same franchise for roll number generation
    const franchiseStudents = students.filter(
      (s: any) => s.franchiseId === studentData.franchiseId
    );

    // Generate roll number
    const rollNo = generateRollNumber(
      studentData.franchiseId,
      franchiseStudents.length
    );

    // Handle photo upload (simplified - in production, upload to cloud storage)
    let photoPath = null;
    if (studentData.photoImage) {
      // In production, upload to cloud storage and get URL
      photoPath = `students/${rollNo}_photo.jpg`; // Placeholder path
    }

    const newStudent = {
      id: Date.now().toString(),
      rollNo: rollNo,

      // Basic Information
      registrationType: studentData.registrationType,
      studentName: studentData.studentName,
      dob: studentData.dob,
      sex: studentData.sex,
      standard: studentData.standard,
      level: studentData.level,
      stream: studentData.stream,
      status: studentData.status,

      // Parent Details
      fatherName: studentData.fatherName,
      fatherQualification: studentData.fatherQualification,
      fatherOccupation: studentData.fatherOccupation,
      fatherContactNo: studentData.fatherContactNo,

      motherName: studentData.motherName,
      motherQualification: studentData.motherQualification,
      motherOccupation: studentData.motherOccupation,
      motherContactNo: studentData.motherContactNo,

      // Contact Information
      residentialAddress: studentData.residentialAddress,
      mailId: studentData.mailId,

      // Status Management
      isDiscontinued: studentData.isDiscontinued,
      discontinueReason: studentData.discontinueReason,

      // Franchise Information
      franchiseId: studentData.franchiseId,
      franchiseName: studentData.franchiseName,

      // System Generated
      enrollmentDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Photo
      photoPath: photoPath,

      // Legacy fields for compatibility
      name: studentData.studentName,
      age: calculateAge(studentData.dob),

      // Certificate eligibility
      canRequestCertificate: !studentData.isDiscontinued,
    };

    students.push(newStudent);
    const success = await saveStudents(students);

    if (success) {
      return NextResponse.json({
        message: "Student registered successfully",
        student: newStudent,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to register student" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in student registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const students = await fetchStudents();
    const studentIndex = students.findIndex((s: any) => s.id === id);

    if (studentIndex === -1) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Handle different actions
    if (action === "reactivate") {
      // Admin reactivation
      students[studentIndex] = {
        ...students[studentIndex],
        isDiscontinued: false,
        discontinueReason: "",
        canRequestCertificate: true,
        status: "active",
        updatedAt: new Date().toISOString(),
      };
    } else if (action === "discontinue") {
      // Discontinue student
      if (!updateData.discontinueReason) {
        return NextResponse.json(
          { error: "Discontinue reason is required" },
          { status: 400 }
        );
      }
      students[studentIndex] = {
        ...students[studentIndex],
        isDiscontinued: true,
        discontinueReason: updateData.discontinueReason,
        canRequestCertificate: false,
        status: "inactive",
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Regular update
      students[studentIndex] = {
        ...students[studentIndex],
        ...updateData,
        updatedAt: new Date().toISOString(),
        // Recalculate age if DOB is updated
        age: updateData.dob
          ? calculateAge(updateData.dob)
          : students[studentIndex].age,
      };
    }

    const success = await saveStudents(students);

    if (success) {
      return NextResponse.json({
        message: "Student updated successfully",
        student: students[studentIndex],
      });
    } else {
      return NextResponse.json(
        { error: "Failed to update student" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("id");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const students = await fetchStudents();
    const filteredStudents = students.filter((s: any) => s.id !== studentId);

    if (students.length === filteredStudents.length) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const success = await saveStudents(filteredStudents);

    if (success) {
      return NextResponse.json({
        message: "Student deleted successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to delete student" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to calculate age
function calculateAge(dob: string): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}
