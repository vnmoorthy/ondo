import { useEffect, useState } from "react";
import { FlaskConical, FastForward, Flame, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/lib/api";
import { speak } from "@/lib/speech";

export const DemoDrawer = ({ onChange, speakAnnouncement = true }) => {
  const [open, setOpen] = useState(false);
  const [demo, setDemo] = useState(null);
  const [busy, setBusy] = useState("");
  useEffect(() => { http.get("/demo").then((r) => setDemo(r.data)); }, [open]);

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); onChange?.(); } catch { toast.error("That didn't work, please try again."); }
    setBusy("");
  };
  const fast = () => run("fast", async () => { const r = await http.post("/demo/speed", { fast: demo?.speed !== 10 }); setDemo(r.data); toast(r.data.speed === 10 ? "Fast-forward on: timers run 10× faster" : "Normal speed"); });
  const spike = () => run("spike", async () => {
    const r = await http.post("/demo/heat-spike");
    toast.error(`Heat spike ${r.data.heat_index}°C · limits lowered for ${r.data.changed.length} guests`);
    if (speakAnnouncement) speak(r.data.announcement, "en-GB");
    setDemo((d) => ({ ...d, heat_override: 46 }));
  });
  const reset = () => run("reset", async () => { await http.post("/demo/reset"); const r = await http.get("/demo"); setDemo(r.data); toast.success("Demo reset with fresh guests"); });

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open ? (
        <div data-testid="demo-drawer" className="fade-up w-72 rounded-2xl bg-[#0B0B0A] text-white p-4 shadow-2xl border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-xl">Demo controls</span>
            <button data-testid="demo-close-btn" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-white/10" aria-label="Close demo"><X className="w-5 h-5" /></button>
          </div>
          <button data-testid="demo-fast-forward-btn" disabled={!!busy} onClick={fast} className={`btn-press w-full mb-2 flex items-center gap-3 rounded-xl px-4 h-12 text-left ${demo?.speed === 10 ? "bg-[#FF7A1A]" : "bg-white/10 hover:bg-white/15"}`}>
            <FastForward className="w-5 h-5" /> Fast-forward 10× {demo?.speed === 10 ? "· ON" : "· off"}
          </button>
          <button data-testid="demo-heat-spike-btn" disabled={!!busy} onClick={spike} className="btn-press w-full mb-2 flex items-center gap-3 rounded-xl px-4 h-12 bg-[#FF4D3D] hover:bg-[#E03A2B]">
            <Flame className="w-5 h-5" /> {busy === "spike" ? "Re-running the engine…" : "Simulate heat spike (46°C)"}
          </button>
          <button data-testid="demo-reset-btn" disabled={!!busy} onClick={reset} className="btn-press w-full flex items-center gap-3 rounded-xl px-4 h-12 bg-white/10 hover:bg-white/15">
            <RotateCcw className="w-5 h-5" /> {busy === "reset" ? "Resetting…" : "Reset demo"}
          </button>
        </div>
      ) : (
        <button data-testid="demo-open-btn" onClick={() => setOpen(true)} className="btn-press flex items-center gap-2 rounded-full bg-[#0B0B0A] text-white px-4 h-11 text-sm font-semibold shadow-xl">
          <FlaskConical className="w-4 h-4" /> Demo
        </button>
      )}
    </div>
  );
};
