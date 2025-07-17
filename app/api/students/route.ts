import { NextRequest, NextResponse } from "next/server";

const BIN_ID = "6878f36109704554f6be97e9";
const API_KEY = "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchStudents() {
  const res = await fetch(`${BASE_URL}/latest`, {
    headers: { "X-Master-Key": API_KEY },
    cache: "no-store",
  });
  const data = await res.json();
  return data.record || [];
}

async function saveStudents(students: any[]) {
  const res = await fetch(BASE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
    },
    body: JSON.stringify(students),
  });
  return res.ok;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");
    const students = await fetchStudents();
    if (franchiseId) {
      return NextResponse.json({
        students: students.filter((s: any) => s.franchiseId === franchiseId),
      });
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
    const body = await request.json();
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
    const students = await fetchStudents();
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
    students.push(newStudent);
    await saveStudents(students);
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
    const students = await fetchStudents();
    const updated = students.map((s: any) =>
      s.id === id ? { ...s, ...updates } : s
    );
    await saveStudents(updated);
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
    const students = await fetchStudents();
    const updated = students.filter((s: any) => s.id !== id);
    await saveStudents(updated);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
