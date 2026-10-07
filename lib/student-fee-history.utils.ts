import { dueDateToPaidAtIso } from "@/lib/student-fee-history-display";
import { addMonthsToDate } from "@/lib/student-fee-calculations";
import type {
  StudentFeeConfigurationResponse,
  StudentFeeHistoryResponse,
  StudentFeeHistoryRow,
  StudentFeeInstallmentStatus,
} from "@/services/student-fee.service";

type ExpectedInstallment = {
  label: string;
  amount: number;
  dueDate: string;
};

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    const today = new Date();
    today.setDate(today.getDate() + days);
    return today.toISOString().slice(0, 10);
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function compareDatesOnly(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function appendMonthlyInstallments(
  items: ExpectedInstallment[],
  firstDue: string,
  count: number,
  monthlyFee: number,
): void {
  let due = firstDue;
  for (let i = 0; i < count; i++) {
    items.push({
      label: "Monthly installment",
      amount: monthlyFee,
      dueDate: due,
    });
    due = addMonthsToDate(due, 1);
  }
}

function buildExpectedInstallments(
  config: StudentFeeConfigurationResponse,
): ExpectedInstallment[] {
  const installmentDays = Math.max(1, Number(config.installmentDays) || 30);
  const durationMonths = Math.max(1, Number(config.durationMonths) || 1);
  const monthlyFee = Number(config.monthlyFee);
  const registrationFee = Number(config.registrationFee);
  const totalPayable = Number(config.totalPayable);
  const items: ExpectedInstallment[] = [];

  let due = addDays(String(config.startDate), installmentDays);

  switch (config.feeRule) {
    case "REG_PLUS_FULL_COURSE":
    case "CUSTOM":
      items.push({
        label:
          config.feeRule === "CUSTOM"
            ? "Custom plan — full payment"
            : "Registration + full course fee",
        amount: totalPayable,
        dueDate: due,
      });
      return items;
    case "REG_PLUS_FIRST_MONTH":
      items.push({
        label: "Registration + first month",
        amount:
          Math.round((registrationFee + monthlyFee + Number.EPSILON) * 100) /
          100,
        dueDate: String(config.startDate).slice(0, 10),
      });
      appendMonthlyInstallments(
        items,
        due,
        Math.max(0, durationMonths - 1),
        monthlyFee,
      );
      return items;
    case "REG_ONLY":
      items.push({
        label: "Registration fee",
        amount: registrationFee,
        dueDate: String(config.startDate).slice(0, 10),
      });
      appendMonthlyInstallments(items, due, durationMonths, monthlyFee);
      return items;
    default:
      items.push({
        label: "Registration + full course fee",
        amount: totalPayable,
        dueDate: due,
      });
      return items;
  }
}

function resolveOpenStatus(dueDate: string): StudentFeeInstallmentStatus {
  const cmp = compareDatesOnly(dueDate, todayIso());
  if (cmp < 0) return "OVERDUE";
  if (cmp === 0) return "UPCOMING";
  return "SCHEDULED";
}

export function buildStudentFeeHistoryFromConfig(
  student: { id: number; name: string; rollNo: string },
  config: StudentFeeConfigurationResponse,
): StudentFeeHistoryResponse {
  const expected = buildExpectedInstallments(config);
  const configMarkedClosed =
    config.nextDueDate == null ||
    config.nextDueAmount == null ||
    Number(config.nextDueAmount) <= 0;

  const nextDueDate = config.nextDueDate ? String(config.nextDueDate) : null;

  const rows: StudentFeeHistoryRow[] = expected.map((item, index) => {
    if (configMarkedClosed) {
      return {
        sequence: index + 1,
        label: item.label,
        amount: item.amount,
        dueDate: item.dueDate,
        paidAt: dueDateToPaidAtIso(item.dueDate),
        status: "PAID",
        paymentId: null,
      };
    }

    if (
      (config.feeRule === "REG_ONLY" && item.label === "Registration fee") ||
      (config.feeRule === "REG_PLUS_FIRST_MONTH" &&
        item.label === "Registration + first month")
    ) {
      return {
        sequence: index + 1,
        label: item.label,
        amount: item.amount,
        dueDate: item.dueDate,
        paidAt: dueDateToPaidAtIso(item.dueDate),
        status: "PAID" as const,
        paymentId: null,
      };
    }

    const isCurrent =
      nextDueDate != null && item.dueDate === nextDueDate;

    if (isCurrent) {
      return {
        sequence: index + 1,
        label: item.label,
        amount: Number(config.nextDueAmount ?? item.amount),
        dueDate: item.dueDate,
        paidAt: null,
        status: resolveOpenStatus(item.dueDate),
        paymentId: null,
      };
    }

    const status =
      compareDatesOnly(item.dueDate, todayIso()) < 0 ? "OVERDUE" : "SCHEDULED";

    return {
      sequence: index + 1,
      label: item.label,
      amount: item.amount,
      dueDate: item.dueDate,
      paidAt: null,
      status,
      paymentId: null,
    };
  });

  const registrationFee = Number(config.registrationFee);
  const courseFee = Number(config.courseFee);
  const openRow = rows.find((row) => row.status !== "PAID");

  return {
    student,
    configured: true,
    summary: {
      feeRule: config.feeRule,
      planTotal: Math.round((registrationFee + courseFee) * 100) / 100,
      startDate: config.startDate,
      endDate: config.endDate,
      monthlyInstallment: Number(config.monthlyFee),
      nextDueDate: openRow?.dueDate ?? null,
      nextDueAmount: openRow ? openRow.amount : 0,
    },
    rows,
  };
}
