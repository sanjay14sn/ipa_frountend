import { NextRequest, NextResponse } from "next/server";
import { ORDERS } from "@/lib/data";
import fs from "fs";
import path from "path";

const dataFile = path.resolve(process.cwd(), "lib/data.ts");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");

    if (franchiseId) {
      const orders = ORDERS.filter((o) => o.franchiseId === franchiseId);
      return NextResponse.json({ orders });
    }

    return NextResponse.json({ orders: ORDERS });
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
      !body.franchiseId ||
      !body.franchise ||
      !body.type ||
      !body.items ||
      !body.amount
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const newOrder = {
      id: `ORD-${Date.now()}`,
      franchiseId: body.franchiseId,
      franchise: body.franchise,
      type: body.type,
      items: body.items,
      amount: body.amount,
      status: body.status || "Pending",
      orderDate: new Date().toISOString().split("T")[0],
      expectedDelivery: body.expectedDelivery || "",
    };
    let fileContent = fs.readFileSync(dataFile, "utf-8");
    fileContent = fileContent.replace(
      /(export const ORDERS: Order\[] = \[)([\s\S]*?)(\];)/,
      (match, start, arr, end) => {
        const arrTrimmed = arr.trim().replace(/\n?$/, "");
        const needsComma = arrTrimmed && !arrTrimmed.endsWith(",");
        const newArr =
          arrTrimmed +
          (needsComma ? "," : "") +
          `\n  ${JSON.stringify(newOrder, null, 2)}`;
        return `${start}${newArr}\n${end}`;
      }
    );
    fs.writeFileSync(dataFile, fileContent, "utf-8");
    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add order" }, { status: 500 });
  }
}
