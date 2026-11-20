import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Bath, Clock, Droplets, Repeat, Thermometer, Wind, Ticket, Info, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { http, RISK } from "@/lib/api";
import { speak } from "@/lib/speech";
import { HeatCurve } from "@/components/HeatCurve";
import { Brand } from "@/components/Brand";
import { RiskDial } from "@/components/RiskDial";
import { CitedText, SourceChips } from "@/components/CitedText";
import { LiveBadge } from "@/components/HeatChip";
import { AskOndo } from "@/components/AskOndo";
import { StepLoader } from "@/components/StepLoader";

const Stat = ({ icon: I, label, value, testId }) => (
  <div className="rounded-2xl bg-[#1B1A17] p-4">
    <div className="flex items-center gap-2 text-[#A39E95] text-sm"><I className="w-4 h-4" />{label}</div>
    <div data-testid={testId} className="font-display text-3xl font-semibold mt-1">{value}</div>
  </div>
);

const RedFlag = ({ f, reason, ev, i }) => (
  <article data-testid={`red-flag-${f.id}`} className="fade-up rounded-3xl bg-[#141412] border-l-8 p-6" style={{ borderLeftColor: f.red ? "#FF4D3D" : f.risk >= 20 ? "#FFB020" : "#3DDC97", animationDelay: `${i * 0.08}s` }}>
    <div className="flex items-start justify-between gap-3">
      <h3 className="font-display text-2xl flex items-center gap-2"><AlertTriangle className="w-6 h-6 shrink-0" style={{ color: f.red ? "#FF4D3D" : "#FFB020" }} />{f.title}</h3>
      <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-sm font-semibold">+{f.risk}</span>
    </div>
    <p className="text-xl mt-3 leading-relaxed">{reason || f.reason}</p>
    {reason && reason !== f.reason && <p className="text-base text-[#A39E95] mt-2">{f.reason}</p>}
    {ev && (
      <div className="mt-4 rounded-2xl bg-[#1B1A17] p-4">
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-[#A39E95]">Evidence <LiveBadge live={ev.live} testId={`evidence-badge-${f.id}`} /></div>
        <div className="text-base text-[#A39E95]"><CitedText text={ev.answer} citations={ev.citations} limit={360} testId={`evidence-text-${f.id}`} /></div>
        <SourceChips citations={ev.citations} testId={`evidence-sources-${f.id}`} />
      </div>
    )}
  </article>
);

const Booker = ({ p }) => {
  const nav = useNavigate();
  const rx = p.rx;
  const [baths, setBaths] = useState([]);
  const [bath, setBath] = useState(rx.bath.id);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { http.get("/baths").then((r) => setBaths(r.data)); }, []);
  useEffect(() => { http.get(`/slots?bath_id=${bath}`).then((r) => { setSlots(r.data); setSlot((s) => s || r.data.find((x) => x.left > 0)?.slot); }); }, [bath]);
  const allowed = (b) => b.id === rx.bath.id || (!rx.foot_bath_only && (rx.risk_level === "red" ? ["jade", "footbath"].includes(b.id) : b.id !== "plunge" && (b.adjustable || b.temp <= rx.max_temp)));
  const book = async () => {
    if (!slot) return toast("Pick a time first.");
    setBusy(true);
    try { const r = await http.post("/bookings", { prescription_id: p.id, bath_id: bath, slot }); nav(`/pass/${r.data.code}`); }
    catch { toast.error("Booking failed. Please try again."); setBusy(false); }
  };
  return (
    <section data-testid="booking-section" className="rounded-3xl bg-[#141412] border p-6 md:p-8">
      <h2 className="font-display text-3xl">Book this soak</h2>
      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        {baths.filter(allowed).map((b) => (
          <button key={b.id} data-testid={`bath-option-${b.id}`} onClick={() => setBath(b.id)}
            className={`btn-press text-left rounded-2xl border-2 p-4 ${bath === b.id ? "border-[#FF7A1A] bg-[#FF7A1A]/5" : "border-transparent bg-[#1B1A17]"}`}>
            <div className="flex items-center justify-between"><span className="font-semibold text-lg">{b.name}</span>{b.id === rx.bath.id && <span className="text-xs font-bold rounded-full bg-[#FF7A1A] text-white px-2 py-0.5">Recommended</span>}</div>
            <div className="text-[#A39E95] mt-1">{b.adjustable ? `${b.min_temp}–${b.temp}°C adjustable` : `${b.temp}°C`} · {b.indoor ? "indoor" : "outdoor, shaded"}{b.step_free ? " · step-free" : ""}</div>
          </button>
        ))}
      </div>
      <div className="mt-6 text-sm uppercase tracking-widest text-[#A39E95]">Time today</div>
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
        {slots.map((s) => (
          <button key={s.slot} data-testid={`slot-${s.slot.replace(":", "")}`} disabled={!s.left} onClick={() => setSlot(s.slot)}
            className={`btn-press rounded-xl h-14 text-lg font-semibold border ${slot === s.slot ? "bg-[#FF7A1A] text-white" : "bg-[#141412]"} disabled:opacity-30`}>
            {s.slot}<div className="text-[0.65rem] font-normal opacity-70 -mt-1">{s.left} left</div>
          </button>
        ))}
      </div>
      <button data-testid="book-soak-btn" onClick={book} disabled={busy} className="btn-press mt-6 w-full h-16 rounded-full ember-cta text-[#0B0B0A] text-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
        <Ticket className="w-6 h-6" /> {busy ? "Booking…" : `Book this soak${slot ? ` at ${slot}` : ""}`}
      </button>
    </section>
  );
};

export default function Prescription() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  useEffect(() => { http.get(`/prescription/${id}`).then((r) => setP(r.data)).catch(() => toast.error("Prescription not found")); }, [id]);
  if (!p) return <div className="p-10"><StepLoader steps={["Loading your Soak Prescription…"]} /></div>;
  const { rx, explanation: ex, profile } = p;
  return (
    <div className="min-h-screen pb-24">
      <div className="bg-[#0B0B0A] text-[#F5F2EC] pb-24 ember-horizon grain relative overflow-hidden"><Brand /></div>
      <main className="-mt-20 relative z-10 px-4 md:px-10 max-w-5xl mx-auto space-y-6">
        <section data-testid="prescription-card" className="fade-up rounded-[2rem] bg-[#141412] shadow-[0_30px_80px_-30px_rgba(0,0,0,.7)] p-6 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-[#A39E95]">Soak Prescription · {profile.language}</p>
          <h1 data-testid="rx-guest-name" className="font-display text-4xl sm:text-5xl font-semibold mt-2">{profile.name}{profile.age ? `, ${profile.age}` : ""}</h1>
          <div className="mt-6 grid md:grid-cols-[260px_1fr] gap-8 items-center">
            <RiskDial score={rx.risk_score} level={rx.risk_level} />
            <div>
              <p data-testid="rx-summary" className="text-xl leading-relaxed">{ex.summary}</p>
              {rx.staff_confirm && <p data-testid="rx-staff-confirm" className="mt-4 rounded-2xl px-4 py-3 text-white font-semibold" style={{ background: RISK.red.color }}>A staff member will confirm with you in person before you soak.</p>}
            </div>
          </div>
          <div className="mt-8 rounded-3xl p-1 heat-gradient">
            <div className="rounded-[1.4rem] bg-[#141412] p-5">
              <div className="flex items-center gap-3"><Bath className="w-7 h-7 text-[#FF7A1A]" /><span data-testid="rx-bath" className="font-display text-2xl md:text-3xl">{rx.bath.name}</span></div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                <Stat icon={Thermometer} label="Max water" value={`${rx.max_temp}°C`} testId="rx-max-temp" />
                <Stat icon={Clock} label="Per round" value={`${rx.max_minutes} min`} testId="rx-minutes" />
                <Stat icon={Repeat} label="Rounds" value={rx.rounds} testId="rx-rounds" />
                <Stat icon={Wind} label="Cool-down" value={`${rx.cooldown_minutes} min`} testId="rx-cooldown" />
                <Stat icon={Droplets} label="Water" value={`${rx.total_water_ml} ml`} testId="rx-water" />
              </div>
              {rx.notes.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{rx.notes.map((n) => <span key={n} className="rounded-full bg-[#FFB020]/15 px-3 py-1 text-base">{n}</span>)}</div>}
            </div>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <button data-testid="rx-listen-btn" onClick={() => { window.speechSynthesis?.cancel(); speak([ex.summary, ...rx.red_flags.map((f) => ex.flag_reasons?.[f.id] || f.reason)].join(" "), profile.lang_code); }}
              className="btn-press ember-cta text-[#0B0B0A] h-14 px-6 rounded-full text-lg font-semibold flex items-center justify-center gap-2"><Volume2 className="w-5 h-5" /> Listen</button>
            <p data-testid="rx-disclaimer" className="flex items-center gap-2 text-[#A39E95]"><Info className="w-4 h-4" /> {ex.disclaimer}</p>
          </div>
        </section>

        <HeatCurve curve={p.heat_curve} />

        {rx.red_flags.length > 0 && (
          <section data-testid="red-flags" className="space-y-4">
            <h2 className="font-display text-3xl px-1">Why these limits</h2>
            {rx.red_flags.map((f, i) => <RedFlag key={f.id} f={f} i={i} reason={ex.flag_reasons?.[f.id]} ev={p.evidence?.[f.id]} />)}
          </section>
        )}
        <Booker p={p} />
        <AskOndo language={profile.language} lang={profile.lang_code} />
      </main>
    </div>
  );
}
