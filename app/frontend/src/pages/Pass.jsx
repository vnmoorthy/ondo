import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Ship, Droplets, HeartPulse, FileText, Copy, X, Plus, ShieldAlert, Phone, Volume2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { http, RISK } from "@/lib/api";
import { speak } from "@/lib/speech";
import { Brand } from "@/components/Brand";
import { SoakTimer } from "@/components/SoakTimer";
import { AskOndo } from "@/components/AskOndo";
import { DemoDrawer } from "@/components/DemoDrawer";
import { StepLoader } from "@/components/StepLoader";

const HOSPITALS = [
  { id: "island", name: "Island Hospital", addr: "308 Jalan Macalister, George Town", dist: "24-hour emergency", tel: "+6042383388" },
  { id: "adventist", name: "Penang Adventist Hospital", addr: "465 Jalan Burmah, George Town", dist: "24-hour emergency", tel: "+6042227200" },
];

const Etiquette = ({ language, lang }) => {
  const [items, setItems] = useState(null);
  useEffect(() => { http.get(`/etiquette?language=${encodeURIComponent(language || "English")}`).then((r) => setItems(r.data.items)).catch(() => {}); }, [language]);
  return (
    <section data-testid="etiquette-card" className="rounded-3xl bg-[#141412] border p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl md:text-3xl flex items-center gap-2"><BookOpen className="w-7 h-7 text-[#FF7A1A]" /> Onsen etiquette in 30 seconds</h2>
        <button data-testid="etiquette-listen-btn" disabled={!items} onClick={() => { window.speechSynthesis?.cancel(); speak(items.join(" "), lang); }} className="btn-press shrink-0 h-12 px-5 rounded-full ember-cta text-[#0B0B0A] font-semibold flex items-center gap-2"><Volume2 className="w-5 h-5" /> Listen</button>
      </div>
      {!items ? <p className="mt-4 text-[#A39E95]">Translating into {language}…</p> : (
        <ol data-testid="etiquette-list" className="mt-4 space-y-2">
          {items.map((t, i) => <li key={i} className="flex gap-3 text-lg"><span className="shrink-0 w-8 h-8 rounded-full bg-[#1B1A17] border text-[#FF7A1A] flex items-center justify-center font-bold text-sm">{i + 1}</span>{t}</li>)}
        </ol>
      )}
    </section>
  );
};

const Hydration = ({ b, onDrink }) => {
  const goal = b.limits.total_water_ml, glasses = Math.ceil(goal / 250), drunk = Math.floor(b.water_ml / 250);
  return (
    <section data-testid="hydration-tracker" className="rounded-3xl bg-[#141412] border p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl flex items-center gap-2"><Droplets className="w-7 h-7 text-[#3b8fd6]" /> Water</h2>
        <span data-testid="hydration-value" className="text-xl font-semibold">{b.water_ml} / {goal} ml</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: glasses }).map((_, i) => (
          <div key={i} className={`w-10 h-14 rounded-b-xl rounded-t-md border-2 transition-colors ${i < drunk ? "bg-[#3b8fd6] border-[#3b8fd6]" : "border-[#3b8fd6]/40"}`} />
        ))}
      </div>
      <button data-testid="hydration-add-btn" onClick={onDrink} className="btn-press mt-5 h-14 px-6 rounded-full bg-[#3b8fd6] text-white text-lg font-semibold flex items-center gap-2"><Plus className="w-5 h-5" /> I drank a glass (250 ml)</button>
    </section>
  );
};

const Overlay = ({ children, onClose, testId, tone = "#fff" }) => (
  <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
    <div data-testid={testId} className="fade-up w-full max-w-xl max-h-[90vh] overflow-auto rounded-3xl p-6 md:p-8 relative" style={{ background: tone }}>
      <button data-testid={`${testId}-close`} onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10" aria-label="Close"><X className="w-6 h-6" /></button>
      {children}
    </div>
  </div>
);

export default function Pass() {
  const { code } = useParams();
  const [v, setV] = useState(null);
  const [unwell, setUnwell] = useState(null);
  const [doc, setDoc] = useState(null);
  const heatSeen = useRef(null);

  const load = useCallback(() => http.get(`/bookings/${code}`).then((r) => setV(r.data)).catch((e) => e.response?.status === 404 && setV(false)), [code]);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);

  const ex = v?.prescription?.explanation;
  const lang = v?.booking?.lang_code || "en-US";
  useEffect(() => {
    if (!v) return;
    const hv = v.booking.heat_version;
    if (heatSeen.current !== null && hv > heatSeen.current) { speak(ex.phrases.heat_alert, lang); toast.error(ex.phrases.heat_alert); }
    heatSeen.current = hv;
  }, [v?.booking?.heat_version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (v === false) return <div data-testid="pass-not-found" className="p-10 text-xl">This Soak Pass wasn't found. <a href="/" className="text-[#FF7A1A] underline">Start a new one</a>.</div>;
  if (!v) return <div className="p-10"><StepLoader steps={["Opening your Soak Pass…"]} /></div>;
  const { booking: b, bath, ship, prescription: p, demo } = v;

  const onPhase = async (phase, round) => { const r = await http.post(`/bookings/${code}/phase`, { phase, round }); setV(r.data); };
  const drink = async () => { const r = await http.post(`/bookings/${code}/water`, { ml: 250 }); setV(r.data); speak(ex.phrases.drink_water, lang); toast.success("+250 ml logged"); };
  const feelUnwell = async () => {
    setUnwell({ steps: ex.unwell_steps });
    try { const r = await http.post(`/bookings/${code}/unwell`); setUnwell({ steps: r.data.steps, sent: true }); speak(r.data.steps.join(". "), lang); }
    catch { setUnwell({ steps: ex.unwell_steps, sent: false }); }
  };
  const summary = async () => { setDoc({ loading: true }); try { setDoc({ text: (await http.get(`/bookings/${code}/summary`)).data.summary }); } catch { setDoc({ text: "Couldn't generate the summary. Please ask staff." }); } };
  const confirm = async () => { await http.post(`/staff/confirm/${code}`); load(); toast.success("Staff confirmed. You can start."); };
  const risk = RISK[b.limits.risk_level];

  return (
    <div className="min-h-screen pb-28">
      <div className="bg-[#0B0B0A] text-[#F5F2EC] pb-24 ember-horizon grain relative overflow-hidden"><Brand /></div>
      <main className="-mt-20 relative z-10 px-4 md:px-10 max-w-5xl mx-auto space-y-6">
        <section data-testid="soak-pass" className="fade-up rounded-[2rem] bg-[#141412] shadow-[0_30px_80px_-30px_rgba(0,0,0,.7)] overflow-hidden">
          <div className="h-2 heat-gradient" />
          <div className="p-6 md:p-10 grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#A39E95]">Soak Pass</p>
              <h1 data-testid="pass-code" className="font-display text-5xl sm:text-6xl font-semibold mt-1 tracking-tight">{b.code}</h1>
              <p data-testid="pass-guest" className="text-2xl mt-3">{b.name}</p>
              <p data-testid="pass-bath" className="text-xl text-[#A39E95] mt-1">{bath?.name} · {b.slot}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-base">
                <span className="rounded-full px-3 py-1 text-white font-semibold" style={{ background: risk.color }}>{risk.label} · {b.limits.risk_score}</span>
                <span className="rounded-full bg-[#1B1A17] px-3 py-1">Max {b.limits.max_temp}°C</span>
                <span className="rounded-full bg-[#1B1A17] px-3 py-1">{b.limits.max_minutes} min × {b.limits.rounds}</span>
                <span className="rounded-full bg-[#1B1A17] px-3 py-1">Cool {b.limits.cooldown_minutes} min</span>
              </div>
              <p data-testid="pass-ship-line" className="mt-5 flex items-center gap-2 text-base text-[#A39E95]"><Ship className="w-5 h-5" /> {ship.name} · all aboard {ship.all_aboard} · leave the onsen by {ship.leave_by}</p>
            </div>
            <div data-testid="pass-qr" className="justify-self-center rounded-2xl border p-4 bg-[#141412]"><QRCodeSVG value={window.location.href} size={168} fgColor="#0B0B0A" /></div>
          </div>
          {!b.staff_confirmed && (
            <div className="px-6 md:px-10 pb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
              <p className="flex-1 flex items-center gap-2 text-lg"><ShieldAlert className="w-6 h-6 text-[#FF4D3D]" /> Staff must confirm with you before you soak.</p>
              <button data-testid="pass-staff-confirm-btn" onClick={confirm} className="btn-press h-12 px-5 rounded-full border-2 border-[#FF7A1A] font-semibold">Staff: confirm in person</button>
            </div>
          )}
        </section>

        <button data-testid="unwell-btn" onClick={feelUnwell} className="btn-press w-full h-24 rounded-[2rem] bg-[#FF4D3D] hover:bg-[#E03A2B] text-white text-3xl font-display font-semibold flex items-center justify-center gap-3 shadow-xl">
          <HeartPulse className="w-9 h-9" /> I feel unwell
        </button>

        <SoakTimer booking={b} phrases={ex.phrases} lang={lang} speed={demo.speed} onPhase={onPhase} blocked={!b.staff_confirmed} />
        <Hydration b={b} onDrink={drink} />
        <Etiquette language={b.language} lang={lang} />

        <section className="rounded-3xl bg-[#141412] border p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="font-display text-2xl flex items-center gap-2"><FileText className="w-6 h-6" /> Health summary for the ship's doctor</h2>
            <p className="text-[#A39E95] mt-1">In English{b.language && b.language !== "English" ? ` and ${b.language}` : ""}.</p>
          </div>
          <button data-testid="doctor-summary-btn" onClick={summary} className="btn-press h-14 px-6 rounded-full bg-[#FF7A1A] text-white text-lg font-semibold">Create summary</button>
        </section>

        <AskOndo language={b.language} lang={lang} />
      </main>

      {unwell && (
        <Overlay testId="unwell-modal" onClose={() => setUnwell(null)} tone="#1B1A17">
          <h2 className="font-display text-4xl text-[#FF4D3D]">Stay calm, {b.name.split(" ")[0]}.</h2>
          <p data-testid="unwell-status" className="mt-2 text-lg font-semibold">{unwell.sent ? "Staff have been alerted and are coming now." : "Alerting staff…"}</p>
          <ol className="mt-5 space-y-3">
            {unwell.steps.map((s, i) => (
              <li key={i} className="flex gap-4 text-2xl leading-snug"><span className="shrink-0 w-10 h-10 rounded-full bg-[#FF4D3D] text-white flex items-center justify-center font-bold">{i + 1}</span>{s}</li>
            ))}
          </ol>
          <a data-testid="call-999-btn" href="tel:999" className="btn-press mt-6 w-full h-20 rounded-[1.5rem] bg-[#FF4D3D] text-white text-3xl font-display font-semibold flex items-center justify-center gap-3"><Phone className="w-8 h-8" /> Call 999</a>
          <div className="mt-5 text-sm uppercase tracking-widest text-[#A39E95]">Nearest hospitals</div>
          <ul data-testid="nearest-hospitals" className="mt-2 space-y-2">
            {HOSPITALS.map((h) => (
              <li key={h.name} className="rounded-2xl bg-[#141412] border p-4 flex items-center gap-3">
                <div className="flex-1"><div className="font-semibold text-lg">{h.name}</div><div className="text-sm text-[#A39E95]">{h.addr} · {h.dist}</div></div>
                <a data-testid={`call-${h.id}`} href={`tel:${h.tel}`} className="btn-press h-12 px-4 rounded-full border border-[#FF7A1A] text-[#FF7A1A] font-semibold flex items-center gap-2"><Phone className="w-4 h-4" /> Call</a>
              </li>
            ))}
          </ul>
        </Overlay>
      )}
      {doc && (
        <Overlay testId="doctor-summary-modal" onClose={() => setDoc(null)}>
          <h2 className="font-display text-3xl pr-10">For the ship's doctor</h2>
          {doc.loading ? <div className="mt-4"><StepLoader steps={["Gathering today's soak record…", "Writing the summary…", "Translating…"]} /></div> : (
            <>
              <pre data-testid="doctor-summary-text" className="mt-4 whitespace-pre-wrap font-sans text-base leading-relaxed bg-[#1B1A17] rounded-2xl p-4">{doc.text}</pre>
              <button data-testid="doctor-summary-copy-btn" onClick={() => { navigator.clipboard?.writeText(doc.text); toast.success("Copied"); }} className="btn-press mt-4 h-12 px-5 rounded-full border font-semibold flex items-center gap-2"><Copy className="w-4 h-4" /> Copy</button>
            </>
          )}
        </Overlay>
      )}
      <DemoDrawer onChange={load} speakAnnouncement={false} />
    </div>
  );
}
