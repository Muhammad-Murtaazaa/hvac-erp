"use client";

import React from "react";
import { Check } from "lucide-react";

export interface WorkflowStepperProps {
  steps: string[];
  currentStep: string;
  className?: string;
}

export default function WorkflowStepper({ steps, currentStep, className = "" }: WorkflowStepperProps) {
  const currentIndex = steps.findIndex(
    (s) => s.toLowerCase() === currentStep.toLowerCase()
  );

  return (
    <div className={`flex items-center w-full max-w-lg ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={step}>
            {/* Step Circle + Label */}
            <div className="flex flex-col items-center relative">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={`text-[10px] font-semibold mt-1 whitespace-nowrap capitalize ${
                  isCurrent
                    ? "text-indigo-600 dark:text-indigo-400 font-bold"
                    : isCompleted
                    ? "text-slate-700 dark:text-slate-300"
                    : "text-slate-400"
                }`}
              >
                {step.replace(/_/g, " ")}
              </span>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-all ${
                  index < currentIndex
                    ? "bg-emerald-500"
                    : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
