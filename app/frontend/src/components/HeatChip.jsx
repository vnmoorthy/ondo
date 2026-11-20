import { useEffect, useState } from "react";
import { Thermometer } from "lucide-react";
import { http } from "@/lib/api";

export const useConditions = (refresh = 30000) => {
  const [c, setC] = useState(null);
  useEffect(() => {
    let on = true;
    const load = () => http.get("/conditions").then((r) => on && setC(r.data)).catch(() => {});
    load();
    const t = setInterval(load, refresh);
    return () => { on = false; clearInterval(t); };
  }, [refresh]);
  return c;
};

export const LiveBadge = ({ live, testId }) => (
  <span data-testid={testId} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${live ? "bg-[#3DDC97]/15 text-[#3DDC97]" : "bg-white/5 text-[#A39E95]"}`}>
    {live && <span className="dot-live" />}{live ? "Live · You.com" : "Cached"}
  </span>
);

export const HeatChip = ({ c, dark }) => {
  if (!c) return <div data-testid="heat-chip-loading" className={`text-sm ${dark ? "text-white/70" : "text-[#A39E95]"}`}>Checking Penang's heat on You.com…</div>;
  const hot = c.heat_index >= 45 ? "#FF4D3D" : c.heat_index >= 40 ? "#FFB020" : "#3DDC97";
  return (
    <div data-testid="heat-chip" className={`inline-flex flex-wrap items-center gap-3 rounded-full pl-2 pr-4 py-2 ${dark ? "bg-white/10 text-white backdrop-blur-md border border-white/15" : "bg-[#141412] border"}`}>
      <span className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: hot }}><Thermometer className="w-5 h-5 text-white" /></span>
      <span className="text-base"><b data-testid="heat-index-value">Feels {c.heat_index}°C</b> <span className="opacity-75">· George Town {c.temp_c}°C{c.high_c ? ` · high ${c.high_c}°C` : ""} · {c.humidity}% RH</span></span>
      {c.simulated ? <span className="rounded-full bg-[#FF4D3D] text-white text-xs font-bold px-2 py-0.5">Simulated spike</span> : <LiveBadge live={c.live} testId="heat-live-badge" />}
    </div>
  );
};
