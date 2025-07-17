import { NextRequest, NextResponse } from "next/server";
import { STUDENTS } from "@/lib/data";
import fs from "fs";
import path from "path";

const dataFile = path.resolve(process.cwd(), "lib/data.ts");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");

    if (franchiseId) {
      const students = STUDENTS.filter((s) => s.franchiseId === franchiseId);
      return NextResponse.json({ students });
    }

    return NextResponse.json({ students: STUDENTS });
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
    // Validate required fields
    if (
      !body.name ||
      !body.age ||
      !body.level ||
      !body.franchiseId ||
      !body.franchiseName
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const newStudent = {
      id: Date.now().toString(),
      name: body.name,
      age: Number(body.age),
      level: body.level,
      franchiseId: body.franchiseId,
      franchiseName: body.franchiseName,
      enrollmentDate: new Date().toISOString().split("T")[0],
      status: body.status as "Active" | "Inactive",
    };
    let fileContent = fs.readFileSync(dataFile, "utf-8");
    fileContent = fileContent.replace(
      /(export const STUDENTS: Student\[] = \[)([\s\S]*?)(\];)/,
      (match, start, arr, end) => {
        const arrTrimmed = arr.trim().replace(/\n?$/, "");
        const needsComma = arrTrimmed && !arrTrimmed.endsWith(",");
        const newArr =
          arrTrimmed +
          (needsComma ? "," : "") +
          `\n  ${JSON.stringify(newStudent, null, 2)}`;
        return `${start}${newArr}\n${end}`;
      }
    );
    fs.writeFileSync(dataFile, fileContent, "utf-8");
    return NextResponse.json({ success: true, student: newStudent });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add student" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { error: "Missing student id" },
        { status: 400 }
      );
    }
    let fileContent = fs.readFileSync(dataFile, "utf-8");
    // Find and update the student in the array
    fileContent = fileContent.replace(
      /(export const STUDENTS: Student\[] = \[)([\s\S]*?)(\];)/,
      (match, start, arr, end) => {
        let arrJson = `[${arr}]`;
        let studentsArr = [];
        try {
          studentsArr = eval(arrJson);
        } catch (e) {
          studentsArr = [];
        }
        const updatedArr = studentsArr.map((student: any) =>
          student.id === id ? { ...student, ...updates } : student
        );
        const newArrStr = updatedArr
          .map((s: any) => `  ${JSON.stringify(s, null, 2)}`)
          .join(",\n");
        return `${start}${newArrStr}\n${end}`;
      }
    );
    fs.writeFileSync(dataFile, fileContent, "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Missing student id" },
        { status: 400 }
      );
    }
    let fileContent = fs.readFileSync(dataFile, "utf-8");
    fileContent = fileContent.replace(
      /(export const STUDENTS: Student\[] = \[)([\s\S]*?)(\];)/,
      (match, start, arr, end) => {
        let arrJson = `[${arr}]`;
        let studentsArr = [];
        try {
          studentsArr = eval(arrJson);
        } catch (e) {
          studentsArr = [];
        }
        const updatedArr = studentsArr.filter(
          (student: any) => student.id !== id
        );
        const newArrStr = updatedArr
          .map((s: any) => `  ${JSON.stringify(s, null, 2)}`)
          .join(",\n");
        return `${start}${newArrStr}\n${end}`;
      }
    );
    fs.writeFileSync(dataFile, fileContent, "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
