"use client";

export type OnboardingStep = { id: string; label: string; done: boolean };

export function OnboardingTimeline({ steps }: { steps: OnboardingStep[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm">
      {steps.map((s) => (
        <li key={s.id} className={s.done ? "opacity-70" : ""}>
          {s.label}
          {s.done ? " — done" : ""}
        </li>
      ))}
    </ol>
  );
}
