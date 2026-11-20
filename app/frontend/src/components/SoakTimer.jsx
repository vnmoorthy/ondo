import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { fmt, heatColor } from "@/lib/api";
import { speak } from "@/lib/speech";

const Ring = ({ frac, label, sub, color }) => {
  const r = 110, c = 2 * Math.PI * r;
  return (
    <div className="relative w-[260px] h-[260px] mx-auto">
      <svg viewBox="0 0 260 260" className="w-full h-full -rotate-90">
        <circle cx="130" cy="130" r={r} stroke="#2A2723" strokeWidth="18" fill="none" />
        <circle cx="130" cy="130" r={r} stroke={color} strokeWidth="18" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, frac))} style={{ transition: "stroke-dashoffset .3s linear, stroke .6s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div data-testid="timer-remaining" className="font-display text-6xl font-semibold tabular-nums">{label}</div>
        <div data-testid="timer-phase" className="text-lg text-[#A39E95] mt-1">{sub}</div>
      </div>
    </div>
  );
};

export const SoakTimer = ({ booking, phrases, lang, speed, onPhase, blocked }) => {
  const { status, round, phase_limit_s: limit } = booking;
  const rounds = booking.limits.rounds;
  const [elapsed, setElapsed] = useState(booking.elapsed_s);
  const spoken = useRef(new Set());
  const pending = useRef(false);
  const say = (key, text) => { const k = `${status}-${round}-${key}`; if (spoken.current.has(k)) return; spoken.current.add(k); speak(text, lang); };

  useEffect(() => { setElapsed(booking.elapsed_s); }, [booking.elapsed_s, status, round]);
  useEffect(() => {
    if (!["soaking", "cooldown"].includes(status)) return;
    const t = setInterval(() => setElapsed((e) => e + 0.25 * speed), 250);
    return () => clearInterval(t);
  }, [status, speed]);

  const remaining = limit - elapsed;
  useEffect(() => {
    if (status === "soaking") {
      if (limit > 150 && remaining <= 120 && remaining > 60) say("two", phrases.two_min_left);
      if (remaining <= 60 && remaining > 0) say("one", phrases.one_min_left);
      if (remaining <= 0 && !pending.current) {
        say("out", phrases.get_out);
        pending.current = true;
        onPhase("cooldown", round).finally(() => { pending.current = false; speak(phrases.cooldown_start, lang); });
      }
    }
    if (status === "cooldown" && remaining <= 0) {
      if (round < rounds) say("cend", phrases.cooldown_end);
      else if (!pending.current) { pending.current = true; say("fin", phrases.finished); onPhase("done", round).finally(() => { pending.current = false; }); }
    }
  }, [remaining, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (r) => { speak(phrases.start_round, lang); onPhase("soaking", r); };
  const coolNow = () => { speak(phrases.cooldown_start, lang); onPhase("cooldown", round); };

  let label = fmt(limit), sub = `Round 1 of ${rounds} · ${Math.round(booking.limits.max_minutes)} min`, frac = 0, color = "#FF7A1A";
  if (status === "soaking") { label = fmt(remaining); sub = `Round ${round} of ${rounds} · in the water`; frac = elapsed / limit; color = heatColor(frac); }
  if (status === "cooldown") { label = fmt(remaining); sub = remaining > 0 ? `Cool-down · round ${round} of ${rounds}` : "Cool-down done"; frac = elapsed / limit; color = "#3b8fd6"; }
  if (status === "done") { label = "Done"; sub = "Soak complete"; frac = 1; }

  return (
    <section data-testid="soak-timer" className="rounded-3xl bg-[#141412] border p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl">Guided soak</h2>
        <button data-testid="timer-test-voice-btn" onClick={() => speak(phrases.two_min_left, lang)} className="btn-press flex items-center gap-2 rounded-full bg-[#1B1A17] px-4 h-11 text-sm font-semibold"><Volume2 className="w-4 h-4" /> Test voice</button>
      </div>
      {speed > 1 && <p className="mt-1 text-sm font-semibold text-[#FFB020]">Fast-forward 10× on</p>}
      <div className="mt-6"><Ring frac={frac} label={label} sub={sub} color={color} /></div>
      <div className="mt-6">
        {status === "booked" && (blocked ? (
          <p data-testid="timer-blocked" className="text-center text-lg rounded-2xl bg-[#FF4D3D]/10 p-4">Please wait: a staff member will confirm with you before your first round.</p>
        ) : (
          <button data-testid="timer-start-btn" onClick={() => start(1)} className="btn-press w-full h-16 rounded-full bg-[#FF7A1A] text-white text-xl font-semibold flex items-center justify-center gap-2"><Play className="w-6 h-6" /> Start round 1</button>
        ))}
        {status === "soaking" && (
          <button data-testid="timer-cooldown-btn" onClick={coolNow} className="btn-press w-full h-16 rounded-full bg-[#FF7A1A] text-white text-xl font-semibold flex items-center justify-center gap-2"><Pause className="w-6 h-6" /> I'm out, start cool-down</button>
        )}
        {status === "cooldown" && remaining <= 0 && round < rounds && (
          <button data-testid="timer-next-round-btn" onClick={() => start(round + 1)} className="btn-press w-full h-16 rounded-full bg-[#FF7A1A] text-white text-xl font-semibold flex items-center justify-center gap-2"><Play className="w-6 h-6" /> Start round {round + 1}</button>
        )}
        {status === "cooldown" && remaining > 0 && <p className="text-center text-lg text-[#A39E95]">Rest in the shade and sip water. No cold plunge right away.</p>}
        {status === "done" && <p data-testid="timer-done" className="text-center text-xl">Well done. Please drink a glass of water before you leave.</p>}
      </div>
    </section>
  );
};
