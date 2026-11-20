import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/lib/api";
import { Brand } from "@/components/Brand";
import { HeatChip, useConditions } from "@/components/HeatChip";
import { MicButton } from "@/components/MicButton";
import { StepLoader } from "@/components/StepLoader";
import { ProfileChips } from "@/components/ProfileChips";
import { TryQR } from "@/components/TryQR";

const Impact = () => {
  const [d, setD] = useState(null);
  useEffect(() => { const load = () => http.get("/impact").then((r) => setD(r.data)).catch(() => {}); load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  return (
    <div data-testid="impact-counter" className="fade-up mt-8 flex flex-wrap gap-8" style={{ animationDelay: ".4s" }}>
      <div><div data-testid="impact-risks" className="font-display text-5xl font-semibold ember-text tabular-nums">{d?.risks_caught ?? "…"}</div><div className="text-sm uppercase tracking-widest text-white/70 mt-1">Heat risks caught today</div></div>
      <div><div data-testid="impact-soaking" className="font-display text-5xl font-semibold text-[#3DDC97] tabular-nums">{d?.soaking_safely ?? "…"}</div><div className="text-sm uppercase tracking-widest text-white/70 mt-1">Guests soaking safely now</div></div>
    </div>
  );
};

const PERSONAS = [
  { id: "margaret", label: "Margaret, 71 · Sydney", text: "I'm Margaret, 71, from Sydney, on the Navigator of the Seas. I take metoprolol for my blood pressure and I put a seasickness patch on this morning. I'd love a long hot soak." },
  { id: "tanaka", label: "田中さん, 68 · Osaka", text: "田中です。68歳です。ワーファリンと降圧剤を飲んでいます。温泉は大好きです。" },
  { id: "priya", label: "Priya, 33 · Mumbai", text: "I'm Priya, 20 weeks pregnant, vegetarian, travelling with my husband. Is the onsen safe for me?" },
  { id: "david", label: "David, 52 · Austin", text: "Had three beers on the ship's drinks package, slept badly, want the hottest bath you have." },
  { id: "chen", label: "陈家 · 一家四口", text: "我们一家四口，孩子六岁，第一次泡温泉。" },
];

const STATS = [
  { n: "546,000", t: "people die from heat every year.", s: "Lancet Countdown 2025 via PIK Potsdam", u: "https://www.pik-potsdam.de/en/news/latest-news" },
  { n: "+167%", t: "heat deaths among over-65s in 2023 versus the 1990s.", s: "Lancet Countdown 2024", u: "https://www.lancetcountdown.org/2024-report/" },
  { n: "19,000", t: "bathing-related deaths a year in Japan, mostly over 65. Advice: under 41°C, max 10 minutes.", s: "Consumer Affairs Agency via nippon.com", u: "https://www.nippon.com/en/japan-data/h01885/" },
];

const Hero = ({ cond }) => (
  <section className="relative overflow-hidden bg-[#0B0B0A] text-[#F5F2EC] ember-horizon grain">
    {[8, 22, 40, 58, 74, 88].map((l, i) => <span key={l} className="steam" style={{ left: `${l}%`, animationDelay: `${i * 1.4}s` }} />)}
    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#FFB067] to-transparent opacity-70" />
    <Brand />
    <div className="relative z-10 px-5 md:px-10 pt-8 pb-28 max-w-5xl">
      <p className="fade-up text-sm uppercase tracking-[0.3em] text-white/70">Your heat-safety host for one day in port</p>
      <h1 data-testid="hero-title" className="fade-up font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.02] mt-4" style={{ animationDelay: ".1s" }}>
        Soak safely in <span className="ember-text">Penang's heat.</span>
      </h1>
      <p className="fade-up text-lg md:text-xl text-white/80 mt-5 max-w-2xl" style={{ animationDelay: ".2s" }}>
        Tell Ondo about yourself in any language. We check today's heat, your medicines and how you feel, then give you a personal, safe soak.
      </p>
      <div className="fade-up mt-7" style={{ animationDelay: ".3s" }}><HeatChip c={cond} dark /></div>
      <Impact />
    </div>
  </section>
);

export default function Landing() {
  const cond = useConditions();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [stage, setStage] = useState("talk");
  const [profile, setProfile] = useState(null);
  const [pid, setPid] = useState(null);

  const submit = async () => {
    if (!text.trim()) return toast("Tell Ondo a little about yourself first, or tap an example.");
    setStage("reading");
    try {
      const r = await http.post("/intake", { text });
      setProfile(r.data.profile); setPid(r.data.id); setStage("chips");
    } catch { toast.error("Ondo couldn't read that. Please try again."); setStage("talk"); }
  };
  const confirm = async () => {
    setStage("rx");
    try {
      const r = await http.post("/prescription", { profile, profile_id: pid });
      nav(`/prescription/${r.data.id}`);
    } catch { toast.error("Couldn't build your prescription. Please try again."); setStage("chips"); }
  };

  return (
    <div className="min-h-screen">
      <Hero cond={cond} />
      <main className="relative z-10 -mt-16 px-4 md:px-10 max-w-5xl">
        <section data-testid="intake-card" className="fade-up rounded-[2rem] bg-[#141412] shadow-[0_30px_80px_-30px_rgba(0,0,0,.7)] p-6 md:p-10">
          {stage === "talk" && (
            <>
              <label htmlFor="intake" className="font-display text-2xl md:text-3xl block leading-snug">
                Just talk: who you are, how you feel today, and any medicines.
              </label>
              <p className="text-[#A39E95] mt-2 text-base">Hold <kbd className="rounded border px-1.5 py-0.5 text-sm bg-[#1B1A17]">fn</kbd> and speak with Willow, or tap the mic. Typing works too.</p>
              <textarea id="intake" data-testid="intake-textarea" value={text} onChange={(e) => setText(e.target.value)} rows={5}
                placeholder="I'm Margaret, 71, from Sydney…" className="mt-5 w-full rounded-2xl border-2 bg-[#1B1A17] p-5 text-xl leading-relaxed focus:outline-none focus:border-[#FF7A1A]" />
              <div className="mt-4 flex flex-wrap gap-2">
                {PERSONAS.map((p) => (
                  <button key={p.id} data-testid={`persona-${p.id}`} onClick={() => setText(p.text)} className="btn-press rounded-full border px-4 py-2 text-base hover:border-[#FF7A1A] hover:bg-[#FF7A1A]/5">{p.label}</button>
                ))}
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <MicButton onText={(t) => setText((x) => (x ? x + " " : "") + t)} testId="intake-mic-btn" />
                <button data-testid="intake-submit-btn" onClick={submit} className="btn-press flex-1 sm:flex-none h-14 rounded-full ember-cta text-[#0B0B0A] text-lg font-semibold px-8 flex items-center justify-center gap-2">
                  Talk to Ondo <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
          {stage === "reading" && <StepLoader testId="intake-loader" steps={["Listening to your words…", "Reading your medicines…", "Checking today's factors…", "Building your profile…"]} />}
          {stage === "chips" && profile && (
            <div className="fade-up">
              <h2 className="font-display text-3xl flex items-center gap-2"><Sparkles className="w-7 h-7 text-[#FFB020]" /> Here's what Ondo heard</h2>
              <p className="text-[#A39E95] mt-1 mb-6">Tap anything to fix it. Ondo will reply in {profile.language}.</p>
              <ProfileChips profile={profile} setProfile={setProfile} />
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button data-testid="profile-confirm-btn" onClick={confirm} className="btn-press h-14 rounded-full bg-[#FF7A1A] hover:bg-[#FF9A4A] text-white text-lg font-semibold px-8 flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Looks right
                </button>
                <button data-testid="profile-restart-btn" onClick={() => setStage("talk")} className="btn-press h-14 rounded-full border px-6 text-lg">Start again</button>
              </div>
            </div>
          )}
          {stage === "rx" && <StepLoader testId="rx-loader" steps={["Checking Penang's heat on You.com…", "Running the safety rules…", "Finding evidence on You.com…", `Writing your prescription in ${profile?.language || "your language"}…`]} />}
        </section>

        <section data-testid="why-ondo" className="py-20">
          <p className="text-sm uppercase tracking-[0.3em] text-[#A39E95]">Why Ondo</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3 max-w-3xl leading-tight">Cruise passengers are the highest-risk onsen guests.</h2>
          <p className="text-lg text-[#A39E95] mt-4 max-w-3xl">Often older, on blood-pressure pills, beta-blockers or diuretics, wearing scopolamine patches that stop sweating, dehydrated after days at sea. They step off a 22°C ship into 34°C humid Penang, then into a 41°C bath.</p>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {STATS.map((s, i) => (
              <a key={s.n} data-testid={`stat-${i}`} href={s.u} target="_blank" rel="noreferrer" className="group rounded-3xl bg-[#141412] border p-7 hover:-translate-y-1 transition-transform">
                <div className="h-1.5 w-16 rounded-full heat-gradient mb-6" />
                <div className="font-display text-5xl font-semibold">{s.n}</div>
                <p className="mt-3 text-lg">{s.t}</p>
                <p className="mt-4 text-sm text-[#A39E95] flex items-center gap-1 group-hover:text-[#FF7A1A]">{s.s} <ExternalLink className="w-3.5 h-3.5" /></p>
              </a>
            ))}
          </div>
        </section>
      </main>
      <footer className="px-5 md:px-10 py-10 border-t text-[#A39E95] text-sm flex flex-col md:flex-row md:items-center gap-6 justify-between">
        <span>Ondo is safety guidance, not medical advice. Yu Pinang Onsen · Penang, Malaysia.</span>
        <TryQR testId="landing-try-qr" />
      </footer>
    </div>
  );
}
