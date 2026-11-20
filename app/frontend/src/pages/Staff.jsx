import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Activity, Bell, Check, Mic2, Ship, Thermometer, Users, ShieldCheck, Siren, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { http, flag, fmt, RISK, heatColor } from "@/lib/api";
import { speak } from "@/lib/speech";
import { Brand } from "@/components/Brand";
import { HeatChip, LiveBadge, useConditions } from "@/components/HeatChip";
import { MicButton } from "@/components/MicButton";
import { DemoDrawer } from "@/components/DemoDrawer";
import { TryQR } from "@/components/TryQR";
import { CitedText, SourceChips } from "@/components/CitedText";

const FLAG_LABEL = { age_65: "65–74", age_75: "75+", anticholinergic: "Patch", beta_blocker: "Beta-blocker", diuretic: "Diuretic", vasodilator: "BP med", anticoagulant: "Blood thinner",
  diabetes: "Diabetes", pregnancy: "Pregnant", heart: "Heart", epilepsy: "Epilepsy", alcohol_light: "Alcohol", alcohol_heavy: "Alcohol 3+", sleep_seasick: "Poor sleep", children: "Child <7", heat_40: "Heat", heat_45: "Extreme heat" };

const GuestCard = ({ g, onConfirm }) => {
  const frac = g.elapsed_s / Math.max(1, g.phase_limit_s);
  const risk = RISK[g.limits.risk_level];
  const over = g.status === "soaking" && frac >= 1;
  return (
    <article data-testid={`staff-guest-${g.code}`} className={`rounded-2xl bg-[#141412] border p-4 transition-colors ${over || g.flagged ? "border-[#FF4D3D] shadow-[0_0_0_1px_#FF4D3D]" : "border-white/10"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-lg truncate"><span className="mr-1.5">{flag(g.country_code)}</span>{g.name}</div>
          <div className="text-sm text-white/60">{g.bath_name} · {g.bath_temp}°C · round {g.round}/{g.limits.rounds}</div>
        </div>
        <span className="shrink-0 w-4 h-4 rounded-full mt-1.5" style={{ background: risk.color }} title={risk.label} />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className={g.status === "cooldown" ? "text-[#7cc0ff]" : ""}>{g.status === "cooldown" ? "Cooling down" : "In the water"}</span>
        <span data-testid={`staff-guest-time-${g.code}`} className="tabular-nums font-semibold">{fmt(g.elapsed_s)} / {fmt(g.phase_limit_s)}</span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, frac * 100)}%`, background: g.status === "cooldown" ? "#3b8fd6" : heatColor(frac) }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {g.red_flag_ids.filter((r) => !r.startsWith("heat")).map((r) => <span key={r} className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{FLAG_LABEL[r] || r}</span>)}
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60">max {g.limits.max_temp}°C</span>
      </div>
      <div className="mt-2 text-xs text-white/60">{over ? <b className="text-[#ff8a80]">Limit reached: help out now</b> : `Next check-in in ${fmt(g.next_checkin_s)}`}</div>
      {g.flagged && <div className="mt-2 text-sm font-semibold text-[#ff8a80]">Flagged: {g.flagged}</div>}
      {!g.staff_confirmed && <button data-testid={`staff-confirm-${g.code}`} onClick={() => onConfirm(g.code)} className="btn-press mt-3 w-full h-10 rounded-xl bg-[#FFB020] text-[#0B0B0A] font-semibold text-sm">Confirm in person</button>}
    </article>
  );
};

const ALERT_ICON = { unwell: Siren, limit: Activity, heat: Thermometer, incident: Mic2, confirm: ShieldCheck };
const AlertsRail = ({ alerts, onAck, onConfirm }) => (
  <section data-testid="alerts-rail" className="rounded-3xl bg-[#141412] border border-white/10 p-5">
    <h2 className="font-display text-2xl flex items-center gap-2"><Bell className="w-6 h-6" /> Alerts <span className="ml-auto text-sm font-sans rounded-full bg-[#FF4D3D] px-2.5 py-0.5">{alerts.filter((a) => !a.ack).length}</span></h2>
    <ul className="mt-4 space-y-2 max-h-[460px] overflow-auto pr-1">
      {alerts.map((a) => {
        const I = ALERT_ICON[a.type] || Bell;
        return (
          <li key={a.id} data-testid={`alert-${a.type}-${a.id.slice(0, 6)}`} className={`rounded-xl p-3 border-l-4 ${a.ack ? "opacity-45 bg-white/5" : "bg-white/10"}`} style={{ borderLeftColor: a.severity === "red" ? "#FF4D3D" : "#FFB020" }}>
            <div className="flex gap-2 text-sm"><I className="w-4 h-4 shrink-0 mt-0.5" /><span className="flex-1">{a.message}</span></div>
            <div className="mt-2 flex items-center justify-between text-xs text-white/50">
              <span>{new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <div className="flex gap-2">
                {a.type === "confirm" && !a.ack && <button data-testid={`alert-confirm-${a.id.slice(0, 6)}`} onClick={() => onConfirm(a.code)} className="btn-press rounded-full bg-[#FFB020] text-[#0B0B0A] px-3 h-8 font-semibold">Confirm</button>}
                {!a.ack && <button data-testid={`alert-ack-${a.id.slice(0, 6)}`} onClick={() => onAck(a.id)} className="btn-press rounded-full bg-[#F5F2EC] text-[#0B0B0A] px-3 h-8 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Acknowledge</button>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  </section>
);

const VoiceBox = ({ onDone }) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const send = async (t) => {
    const msg = (t ?? text).trim();
    if (!msg) return toast("Say or type what's happening.");
    setText(msg); setBusy(true);
    try { const r = await http.post("/staff/voice", { text: msg }); setRes(r.data); onDone(); speak(r.data.summary || msg, "en-GB"); }
    catch { toast.error("Couldn't log that. Try again."); }
    setBusy(false);
  };
  return (
    <section data-testid="voice-box" className="rounded-3xl bg-[#141412] border border-white/10 p-5">
      <h2 className="font-display text-2xl flex items-center gap-2"><Mic2 className="w-6 h-6" /> Say what's happening</h2>
      <p className="text-sm text-white/60 mt-1">Hold fn and speak with Willow, tap the mic, or type.</p>
      <textarea data-testid="voice-textarea" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder='"Margaret looks dizzy" or "Rotenburo is 42 degrees right now"'
        className="mt-3 w-full rounded-2xl bg-black/30 border border-white/10 p-4 text-lg focus:outline-none focus:border-[#FF7A1A]" />
      <div className="mt-2 flex flex-wrap gap-2">
        {["Margaret looks dizzy", "Rotenburo is 42 degrees right now"].map((e) => <button key={e} data-testid={`voice-example-${e.split(" ")[0].toLowerCase()}`} onClick={() => send(e)} className="btn-press rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">{e}</button>)}
      </div>
      <div className="mt-3 flex gap-2">
        <MicButton dark testId="voice-mic-btn" onText={(t) => setText((x) => (x ? x + " " : "") + t)} />
        <button data-testid="voice-submit-btn" onClick={() => send()} disabled={busy} className="btn-press flex-1 h-14 rounded-full bg-[#FF7A1A] font-semibold text-lg disabled:opacity-60">{busy ? "Understanding…" : "Log it"}</button>
      </div>
      {res && (
        <div data-testid="voice-result" className="fade-up mt-4 rounded-2xl p-4 border-l-4 bg-white/5" style={{ borderLeftColor: res.severity === "red" ? "#FF4D3D" : "#FFB020" }}>
          <div className="font-semibold">{res.summary}</div>
          {res.actions?.length > 0 && <ul className="mt-2 text-sm text-white/70 list-disc pl-5">{res.actions.map((a) => <li key={a}>{a}</li>)}</ul>}
          {res.protocol && <><div className="mt-3 text-xs uppercase tracking-widest text-white/50">Protocol</div><ol data-testid="voice-protocol" className="mt-1 space-y-1 list-decimal pl-5">{res.protocol.map((p) => <li key={p}>{p}</li>)}</ol></>}
        </div>
      )}
    </section>
  );
};

const Kpi = ({ icon: I, label, value, testId, tone = "#FF7A1A" }) => (
  <div className="rounded-2xl bg-[#141412] border border-white/10 p-4">
    <div className="flex items-center gap-2 text-white/60 text-sm"><I className="w-4 h-4" style={{ color: tone }} />{label}</div>
    <div data-testid={testId} className="font-display text-4xl font-semibold mt-1">{value}</div>
  </div>
);

const ShipsPanel = () => {
  const [s, setS] = useState(null);
  useEffect(() => { http.get("/ships").then((r) => setS(r.data)).catch(() => {}); }, []);
  return (
    <section data-testid="ships-panel" className="rounded-3xl bg-[#141412] border border-white/10 p-5">
      <h2 className="font-display text-2xl flex items-center gap-2"><Ship className="w-6 h-6" /> Ships in Penang today</h2>
      {!s ? <p className="mt-3 text-white/60">Asking You.com which ships are at Swettenham Pier…</p> : (
        <>
          <ul className="mt-3 space-y-2">{s.seed.map((x) => (
            <li key={x.name} className="rounded-xl bg-white/5 p-3"><div className="font-semibold">{x.name} <span className="text-white/50 font-normal">· {x.line}</span></div>
              <div className="text-sm text-white/70">{x.arrive}–{x.depart} · all aboard {x.all_aboard} · guests leave onsen by {x.leave_by}</div></li>))}</ul>
          {s.answer && <div className="mt-3 text-sm text-white/70"><div className="mb-1"><LiveBadge live={s.live} /></div><CitedText text={s.answer} citations={s.citations} limit={320} /><SourceChips citations={s.citations} max={2} /></div>}
        </>
      )}
    </section>
  );
};

const NewsPanel = () => {
  const [n, setN] = useState(null);
  useEffect(() => { http.get("/news").then((r) => setN(r.data)).catch(() => {}); }, []);
  if (!n) return null;
  return (
    <section data-testid="news-panel" className="rounded-3xl bg-[#141412] border border-white/10 p-5">
      <h2 className="font-display text-2xl flex items-center gap-2"><Newspaper className="w-6 h-6" /> Heat news <span className="ml-auto"><LiveBadge live={n.live} /></span></h2>
      <ul className="mt-3 space-y-2">{n.items.slice(0, 3).map((x) => <li key={x.url + x.title}><a href={x.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-white/5 p-3 hover:bg-white/10"><div className="font-semibold text-sm">{x.title}</div><div className="text-xs text-white/60 mt-1">{x.snippet}</div></a></li>)}</ul>
    </section>
  );
};

export default function Staff() {
  const [d, setD] = useState(null);
  const cond = useConditions(10000);
  const seen = useRef(null);
  const load = useCallback(() => http.get("/staff/board").then((r) => setD(r.data)).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (!d) return;
    const ids = new Set(d.alerts.map((a) => a.id));
    if (seen.current) {
      d.alerts.filter((a) => !seen.current.has(a.id) && !a.ack && ["unwell", "limit", "incident"].includes(a.type)).slice(0, 2).forEach((a) => { speak(a.message, "en-GB"); toast.error(a.message); });
    }
    seen.current = ids;
  }, [d]);

  const ack = async (id) => { await http.post(`/staff/alerts/${id}/ack`); load(); };
  const confirm = async (code) => { await http.post(`/staff/confirm/${code}`); toast.success("Confirmed in person"); load(); };
  const guestUrl = window.location.origin + "/";
  const flags = d ? Object.entries(d.kpis.red_flags_by_type).sort((a, b) => b[1] - a[1]) : [];
  const maxFlag = Math.max(1, ...flags.map((f) => f[1]));

  return (
    <div className="min-h-screen bg-[#0B0B0A] text-white pb-24">
      <Brand right={<div className="flex items-center gap-3"><span className="hidden md:block"><TryQR size={64} testId="staff-try-qr" /></span><span className="rounded-full bg-white/10 px-4 h-11 flex items-center text-sm font-semibold gap-2"><span className="dot-live" /> Staff Safety Console</span></div>} />
      <main className="px-4 md:px-8 space-y-5">
        <div className="flex flex-wrap items-center gap-3"><HeatChip c={cond} dark /></div>
        {d && (
          <div data-testid="staff-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={Users} label="Guests today" value={d.kpis.guests_today} testId="kpi-guests" />
            <Kpi icon={Activity} label="In the water now" value={d.kpis.in_water} testId="kpi-in-water" tone="#3b8fd6" />
            <Kpi icon={ShieldCheck} label="Heat risks caught" value={d.kpis.risks_caught} testId="kpi-risks" tone="#FFB020" />
            <Kpi icon={Siren} label="Incidents" value={d.kpis.incidents} testId="kpi-incidents" tone="#FF4D3D" />
          </div>
        )}
        <div className="grid xl:grid-cols-[1fr_380px] gap-5">
          <section data-testid="live-board">
            <h2 className="font-display text-3xl mb-3">In the water <span className="text-white/40 text-xl">· refreshes every 3 s</span></h2>
            {!d ? <p className="text-white/60">Loading the live board…</p> : (
              <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-3">{d.guests.map((g) => <GuestCard key={g.code} g={g} onConfirm={confirm} />)}</div>
            )}
          </section>
          <div className="space-y-5">
            {d && <AlertsRail alerts={d.alerts} onAck={ack} onConfirm={confirm} />}
            <VoiceBox onDone={load} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          <ShipsPanel />
          <NewsPanel />
          <section data-testid="flags-panel" className="rounded-3xl bg-[#141412] border border-white/10 p-5">
            <h2 className="font-display text-2xl">Red flags by type</h2>
            <ul className="mt-3 space-y-2">{flags.map(([k, n]) => (
              <li key={k} className="text-sm"><div className="flex justify-between"><span>{FLAG_LABEL[k] || k}</span><b>{n}</b></div><div className="h-2 rounded-full bg-white/10 mt-1"><div className="h-full rounded-full heat-gradient" style={{ width: `${(n / maxFlag) * 100}%` }} /></div></li>))}</ul>
          </section>
          <section data-testid="join-qr-panel" className="rounded-3xl bg-[#141412] border border-white/10 p-5 flex flex-col items-center text-center">
            <h2 className="font-display text-2xl">Join as a guest</h2>
            <p className="text-sm text-white/60 mt-1">Scan to try Ondo. You'll appear here within 3 seconds of starting your soak.</p>
            <div className="mt-4 rounded-2xl bg-[#141412] p-3"><QRCodeSVG value={guestUrl} size={150} fgColor="#0B0B0A" /></div>
            <a data-testid="join-guest-link" href={guestUrl} className="mt-3 text-sm underline text-white/70">{guestUrl}</a>
          </section>
        </div>
      </main>
      <DemoDrawer onChange={load} />
    </div>
  );
}
