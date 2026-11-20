import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export const StepLoader = ({ steps, testId = "step-loader" }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 1800);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <ul data-testid={testId} className="space-y-3 py-2" aria-live="polite">
      {steps.map((s, k) => (
        <li key={s} className={`flex items-center gap-3 text-lg transition-opacity duration-300 ${k > i ? "opacity-30" : "opacity-100"}`}>
          {k < i ? <Check className="w-6 h-6 text-[#FF7A1A]" /> : k === i ? <Loader2 className="w-6 h-6 animate-spin text-[#FFB020]" /> : <span className="w-6 h-6 rounded-full border-2" />}
          {s}
        </li>
      ))}
    </ul>
  );
};
