import { NextRequest, NextResponse } from "next/server";

const BIN_ID = "6878f33c09704554f6be97d1";
const API_KEY = "$2a$10$/xYWzfE8im1VpidHF3p4leL5j95jlURVNihEN9kiCtd3ByMJ2UvAG";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchOrders() {
  const res = await fetch(`${BASE_URL}/latest`, {
    headers: { "X-Master-Key": API_KEY },
    cache: "no-store",
  });
  const data = await res.json();
  return data.record || [];
}

async function saveOrders(orders: any[]) {
  const res = await fetch(BASE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
    },
    body: JSON.stringify(orders),
  });
  return res.ok;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseId = searchParams.get("franchiseId");
    const orders = await fetchOrders();
    if (franchiseId) {
      return NextResponse.json({
        orders: orders.filter((o: any) => o.franchiseId === franchiseId),
      });
    }
    return NextResponse.json({ orders });
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
    const orders = await fetchOrders();
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
    orders.push(newOrder);
    await saveOrders(orders);
    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add order" }, { status: 500 });
  }
}
