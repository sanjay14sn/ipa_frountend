import assert from "node:assert/strict";
import { test } from "node:test";
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
} from "./invoice-preview-merge.ts";

const kitGroup = (qty: number): StartingKitGroupPreview => ({
  streamId: 9,
  streamName: "S9",
  quantity: qty,
  materialUnit: 10,
  kitUnit: 20,
  royaltyUnit: 5,
  items: [
    { name: "A", quantity: 2 * qty },
    { name: "B", quantity: 4 * qty },
  ],
});

test("scaleStartingKitGroup preserves unit fields and stream metadata", () => {
  const g = kitGroup(4);
  const scaled = scaleStartingKitGroup(g, 8);
  assert.equal(scaled.streamId, 9);
  assert.equal(scaled.streamName, "S9");
  assert.equal(scaled.materialUnit, 10);
  assert.equal(scaled.kitUnit, 20);
  assert.equal(scaled.royaltyUnit, 5);
  assert.equal(scaled.quantity, 8);
});

test("scaleStartingKitGroup scales line item quantities by newQty/oldQty", () => {
  const g = kitGroup(4);
  const scaled = scaleStartingKitGroup(g, 8);
  assert.equal(scaled.items[0].quantity, 16);
  assert.equal(scaled.items[1].quantity, 32);
});

test("scaleStartingKitGroup rounds fractional item quantities", () => {
  const g: StartingKitGroupPreview = {
    streamId: 1,
    streamName: "X",
    quantity: 3,
    materialUnit: 1,
    kitUnit: 1,
    royaltyUnit: 1,
    items: [{ name: "odd", quantity: 5 }],
  };
  const scaled = scaleStartingKitGroup(g, 2);
  assert.equal(Math.round((5 * 2) / 3), scaled.items[0].quantity);
});

test("mergeStudentGroups has no duplicate studentId; partial incoming overlays and keeps rest", () => {
  const existing: StudentGroupPreview[] = [
    mkStudent(1, "Old", 100),
    mkStudent(2, "B", 50),
  ];
  const incoming: StudentGroupPreview[] = [
    mkStudent(1, "New", 200),
    mkStudent(3, "C", 30),
  ];
  const merged = mergeStudentGroups(existing, incoming);
  const ids = merged.map((g) => g.studentId);
  assert.deepEqual(ids, [1, 2, 3]);
  assert.equal(merged.find((g) => g.studentId === 1)?.studentName, "New");
  assert.equal(merged.find((g) => g.studentId === 1)?.totalPrice, 200);
});

test("mergeStartingKitGroups no duplicate streamId; partial incoming appends new stream", () => {
  const existing: StartingKitGroupPreview[] = [
    kitGroup(2),
    { ...kitGroup(1), streamId: 2 },
  ];
  const incoming: StartingKitGroupPreview[] = [{ ...kitGroup(5), streamId: 1 }];
  const merged = mergeStartingKitGroups(existing, incoming);
  assert.deepEqual(merged.map((g) => g.streamId), [9, 2, 1]);
  assert.equal(merged.find((g) => g.streamId === 1)?.quantity, 5);
});

test("mergeInstructorGroups no duplicate instructorId; partial overlay keeps others", () => {
  const a = (id: number, n: string): InstructorGroupPreview => ({
    instructorId: id,
    name: n,
    instructorCode: `C${id}`,
    items: [{ name: "x", quantity: 1 }],
  });
  const merged = mergeInstructorGroups([a(1, "I1"), a(2, "I2")], [a(1, "I1-upd")]);
  assert.deepEqual(merged.map((g) => g.instructorId), [1, 2]);
  assert.equal(merged[0].name, "I1-upd");
});

test("removal is caller filter then merge with empty incoming preserves", () => {
  const full = [mkStudent(1, "A", 10), mkStudent(2, "B", 20), mkStudent(3, "C", 30)];
  const afterRemove = full.filter((g) => g.studentId === 2);
  const merged = mergeStudentGroups(afterRemove, []);
  assert.deepEqual(merged.map((g) => g.studentId), [2]);
});

test("mergeStudentGroups with empty incoming dedupes duplicate ids in existing", () => {
  const existing = [mkStudent(1, "First", 10), mkStudent(1, "Second", 20)];
  const merged = mergeStudentGroups(existing, []);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].studentName, "Second");
  assert.equal(merged[0].totalPrice, 20);
});

test("mergeStudentGroups preserves existing id order then appends new ids from incoming", () => {
  const existing = [mkStudent(2, "B", 20), mkStudent(1, "A", 10)];
  const incoming = [mkStudent(1, "A-upd", 99), mkStudent(3, "C", 5)];
  const merged = mergeStudentGroups(existing, incoming);
  assert.deepEqual(
    merged.map((g) => g.studentId),
    [2, 1, 3],
  );
  assert.equal(merged.find((g) => g.studentId === 1)?.studentName, "A-upd");
  assert.equal(merged.find((g) => g.studentId === 1)?.totalPrice, 99);
});

test("scaleStartingKitGroup throws when newQty or oldQty invalid", () => {
  assert.throws(() => scaleStartingKitGroup(kitGroup(2), 0), RangeError);
  assert.throws(
    () =>
      scaleStartingKitGroup(
        { ...kitGroup(1), quantity: 0 },
        2,
      ),
    RangeError,
  );
});

test("recomputeTotalAmount matches manual sum", () => {
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
        materialUnit: 10,
        kitUnit: 5,
        royaltyUnit: 3,
        items: [],
      },
    ],
  };
  const manual =
    100 +
    40 +
    (10 + 5 + 3) * 2;
  assert.equal(recomputeTotalAmount(preview), manual);
  const applied = applyRecomputedTotal(preview);
  assert.equal(applied.totalAmount, manual);
  assert.notEqual(preview.totalAmount, applied.totalAmount);
});

test("studentGroupsToBreakdowns empty array", () => {
  assert.deepEqual(studentGroupsToBreakdowns([]), []);
});

test("studentGroupsToBreakdowns matches previewOrderInvoice mapping", () => {
  const g = mkStudent(7, "N", 55);
  const [b] = studentGroupsToBreakdowns([g]);
  assert.equal(b.studentId, g.studentId);
  assert.equal(b.studentName, g.studentName);
  assert.equal(b.levelId, g.levelId);
  assert.equal(b.levelName, g.levelName);
  assert.equal(b.isFirstLevel, g.isFirstLevel);
  assert.equal(b.royalty, g.royalty);
  assert.equal(b.materialCost, g.materialCost);
  assert.equal(b.kitCost, g.kitCost);
  assert.equal(b.totalPrice, g.totalPrice);
  assert.equal(b.durationInMonths, g.durationInMonths);
});

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
