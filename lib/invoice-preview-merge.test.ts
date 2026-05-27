import { describe, it, expect } from "vitest";
import type {
  InstructorGroupPreview,
  InvoicePreview,
  StartingKitGroupPreview,
  StudentGroupPreview,
} from "../services/order.service";
import {
  applyRecomputedTotal,
  mergeInstructorGroups,
  mergeStartingKitGroups,
  mergeStudentGroups,
  recomputeTotalAmount,
  scaleStartingKitGroup,
  studentGroupsToBreakdowns,
} from "./invoice-preview-merge";

function kitGroup(qty: number): StartingKitGroupPreview {
  return {
    streamId: 9,
    streamName: "S9",
    quantity: qty,
    kitUnit: 20,
    royaltyUnit: 5,
    tshirtBreakdown: [{ tshirtItemId: 101, tshirtName: "Tee-M", quantity: qty }],
    items: [
      { name: "A", quantity: 2 * qty },
      { name: "B", quantity: 4 * qty },
    ],
  };
}

function mkStudent(
  studentId: number,
  studentName: string,
  totalPrice: number,
): StudentGroupPreview {
  return {
    studentId,
    studentName,
    levelId: 1,
    levelName: "L1",
    isFirstLevel: false,
    durationInMonths: 12,
    royalty: 1,
    materialCost: 2,
    kitCost: 3,
    totalPrice,
    items: [],
  };
}

describe("scaleStartingKitGroup", () => {
  it("preserves unit fields and stream metadata", () => {
    const scaled = scaleStartingKitGroup(kitGroup(4), 8);
    expect(scaled.streamId).toBe(9);
    expect(scaled.streamName).toBe("S9");
    expect(scaled.kitUnit).toBe(20);
    expect(scaled.royaltyUnit).toBe(5);
    expect(scaled.quantity).toBe(8);
  });

  it("preserves tshirtBreakdown intact and does not mutate source", () => {
    const g = kitGroup(4);
    const scaled = scaleStartingKitGroup(g, 8);
    expect(scaled.tshirtBreakdown).toEqual([
      { tshirtItemId: 101, tshirtName: "Tee-M", quantity: 4 },
    ]);
    scaled.tshirtBreakdown[0].quantity = 999;
    expect(g.tshirtBreakdown[0].quantity).toBe(4);
  });

  it("scales line item quantities by newQty/oldQty", () => {
    const scaled = scaleStartingKitGroup(kitGroup(4), 8);
    expect(scaled.items[0].quantity).toBe(16);
    expect(scaled.items[1].quantity).toBe(32);
  });

  it("rounds fractional item quantities", () => {
    const g: StartingKitGroupPreview = {
      streamId: 1,
      streamName: "X",
      quantity: 3,
      kitUnit: 1,
      royaltyUnit: 1,
      tshirtBreakdown: [],
      items: [{ name: "odd", quantity: 5 }],
    };
    const scaled = scaleStartingKitGroup(g, 2);
    expect(scaled.items[0].quantity).toBe(Math.round((5 * 2) / 3));
  });

  it("throws RangeError when newQty is 0", () => {
    expect(() => scaleStartingKitGroup(kitGroup(2), 0)).toThrow(RangeError);
  });

  it("throws RangeError when oldQty is 0", () => {
    expect(() =>
      scaleStartingKitGroup({ ...kitGroup(1), quantity: 0 }, 2),
    ).toThrow(RangeError);
  });
});

describe("mergeStudentGroups", () => {
  it("no duplicate studentId; partial incoming overlays and keeps rest", () => {
    const existing: StudentGroupPreview[] = [
      mkStudent(1, "Old", 100),
      mkStudent(2, "B", 50),
    ];
    const incoming: StudentGroupPreview[] = [
      mkStudent(1, "New", 200),
      mkStudent(3, "C", 30),
    ];
    const merged = mergeStudentGroups(existing, incoming);
    expect(merged.map((g) => g.studentId)).toEqual([1, 2, 3]);
    expect(merged.find((g) => g.studentId === 1)?.studentName).toBe("New");
    expect(merged.find((g) => g.studentId === 1)?.totalPrice).toBe(200);
  });

  it("empty incoming dedupes duplicate ids in existing", () => {
    const existing = [mkStudent(1, "First", 10), mkStudent(1, "Second", 20)];
    const merged = mergeStudentGroups(existing, []);
    expect(merged.length).toBe(1);
    expect(merged[0].studentName).toBe("Second");
    expect(merged[0].totalPrice).toBe(20);
  });

  it("preserves existing id order then appends new ids from incoming", () => {
    const existing = [mkStudent(2, "B", 20), mkStudent(1, "A", 10)];
    const incoming = [mkStudent(1, "A-upd", 99), mkStudent(3, "C", 5)];
    const merged = mergeStudentGroups(existing, incoming);
    expect(merged.map((g) => g.studentId)).toEqual([2, 1, 3]);
    expect(merged.find((g) => g.studentId === 1)?.studentName).toBe("A-upd");
    expect(merged.find((g) => g.studentId === 1)?.totalPrice).toBe(99);
  });

  it("removal via caller filter then merge with empty incoming preserves", () => {
    const full = [mkStudent(1, "A", 10), mkStudent(2, "B", 20), mkStudent(3, "C", 30)];
    const afterRemove = full.filter((g) => g.studentId === 2);
    const merged = mergeStudentGroups(afterRemove, []);
    expect(merged.map((g) => g.studentId)).toEqual([2]);
  });
});

describe("mergeStartingKitGroups", () => {
  it("no duplicate streamId; partial incoming appends new stream", () => {
    const existing: StartingKitGroupPreview[] = [
      kitGroup(2),
      { ...kitGroup(1), streamId: 2 },
    ];
    const incoming: StartingKitGroupPreview[] = [{ ...kitGroup(5), streamId: 1 }];
    const merged = mergeStartingKitGroups(existing, incoming);
    expect(merged.map((g) => g.streamId)).toEqual([9, 2, 1]);
    expect(merged.find((g) => g.streamId === 1)?.quantity).toBe(5);
  });
});

describe("mergeInstructorGroups", () => {
  it("no duplicate instructorId; partial overlay keeps others", () => {
    const a = (id: number, n: string): InstructorGroupPreview => ({
      instructorId: id,
      name: n,
      instructorCode: `C${id}`,
      items: [{ name: "x", quantity: 1 }],
    });
    const merged = mergeInstructorGroups([a(1, "I1"), a(2, "I2")], [a(1, "I1-upd")]);
    expect(merged.map((g) => g.instructorId)).toEqual([1, 2]);
    expect(merged[0].name).toBe("I1-upd");
  });
});

describe("recomputeTotalAmount / applyRecomputedTotal", () => {
  it("matches manual sum", () => {
    const preview: InvoicePreview = {
      franchiseId: "f",
      programId: 1,
      levelId: 1,
      isFirstLevel: true,
      students: [],
      lines: [],
      totalAmount: 999,
      studentGroups: [mkStudent(1, "A", 100), mkStudent(2, "B", 40)],
      startingKitGroups: [
        {
          streamId: 1,
          streamName: "S",
          quantity: 2,
          kitUnit: 5,
          royaltyUnit: 3,
          tshirtBreakdown: [{ tshirtItemId: 42, tshirtName: "Tee", quantity: 2 }],
          items: [],
        },
      ],
    };
    const manual = 100 + 40 + (5 + 3) * 2;
    expect(recomputeTotalAmount(preview)).toBe(manual);
    const applied = applyRecomputedTotal(preview);
    expect(applied.totalAmount).toBe(manual);
    expect(preview.totalAmount).not.toBe(applied.totalAmount);
  });

  it("preserves tshirtBreakdown when applied", () => {
    const preview: InvoicePreview = {
      franchiseId: "f",
      programId: 1,
      levelId: 1,
      isFirstLevel: true,
      students: [],
      lines: [],
      totalAmount: 0,
      studentGroups: [],
      startingKitGroups: [
        {
          streamId: 7,
          streamName: "S7",
          quantity: 3,
          kitUnit: 4,
          royaltyUnit: 2,
          tshirtBreakdown: [{ tshirtItemId: 11, tshirtName: "L", quantity: 3 }],
          items: [{ name: "x", quantity: 1 }],
        },
      ],
    };
    const applied = applyRecomputedTotal(preview);
    expect(applied.totalAmount).toBe((4 + 2) * 3);
    expect(applied.startingKitGroups).toEqual(preview.startingKitGroups);
  });
});

describe("studentGroupsToBreakdowns", () => {
  it("returns empty array for empty input", () => {
    expect(studentGroupsToBreakdowns([])).toEqual([]);
  });

  it("matches previewOrderInvoice mapping", () => {
    const g = mkStudent(7, "N", 55);
    const [b] = studentGroupsToBreakdowns([g]);
    expect(b.studentId).toBe(g.studentId);
    expect(b.studentName).toBe(g.studentName);
    expect(b.levelId).toBe(g.levelId);
    expect(b.levelName).toBe(g.levelName);
    expect(b.isFirstLevel).toBe(g.isFirstLevel);
    expect(b.royalty).toBe(g.royalty);
    expect(b.materialCost).toBe(g.materialCost);
    expect(b.kitCost).toBe(g.kitCost);
    expect(b.totalPrice).toBe(g.totalPrice);
    expect(b.durationInMonths).toBe(g.durationInMonths);
  });
});
