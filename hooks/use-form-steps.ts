import { useState } from "react";

/** Step state for multi-step modal forms with validation-gated navigation. */
export function useFormSteps(
  totalSteps: number,
  validateCurrentStep: () => boolean,
) {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return { currentStep, setCurrentStep, handleNext, handlePrevious };
}
