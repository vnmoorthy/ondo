import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useDictation } from "@/lib/speech";

export const MicButton = ({ onText, lang, testId = "mic-button", dark = false }) => {
  const { listening, start, stop, supported } = useDictation(onText, lang);
  const click = () => {
    if (listening) return stop();
    if (!supported || !start()) toast("Voice isn't available in this browser. Hold fn to dictate with Willow, or type.");
  };
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={click}
      aria-label={listening ? "Stop listening" : "Speak"}
      className={`btn-press flex items-center gap-2 rounded-full px-5 h-14 font-semibold text-base ${
        listening ? "bg-[#FF4D3D] text-white pulse-ring" : dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#FF7A1A] text-white hover:bg-[#FF9A4A]"
      }`}
    >
      {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      {listening ? "Listening… tap to stop" : "Tap to speak"}
    </button>
  );
};
