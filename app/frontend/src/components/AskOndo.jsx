import { useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import { http } from "@/lib/api";
import { MicButton } from "@/components/MicButton";
import { CitedText, SourceChips } from "@/components/CitedText";
import { LiveBadge } from "@/components/HeatChip";
import { StepLoader } from "@/components/StepLoader";

export const AskOndo = ({ language = "English", lang, examples = ["Can I soak after two beers?", "Is it safe with my patch?"] }) => {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const ask = async (text) => {
    const question = (text ?? q).trim();
    if (!question) return;
    setQ(question); setBusy(true); setRes(null);
    try { setRes((await http.post("/ask", { question, language })).data); }
    catch { setRes({ answer: "Sorry, I couldn't answer just now. Please ask a staff member.", citations: [], live: false }); }
    setBusy(false);
  };
  return (
    <section data-testid="ask-ondo" className="rounded-3xl bg-[#141412] border p-6 md:p-8">
      <h2 className="font-display text-2xl md:text-3xl flex items-center gap-3"><MessageCircleQuestion className="w-7 h-7 text-[#FF7A1A]" /> Ask Ondo anything</h2>
      <p className="text-[#A39E95] mt-1">Answered from the live web by You.com, with sources.</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {examples.map((e) => (
          <button key={e} data-testid={`ask-example-${e.slice(0, 12).replace(/\W+/g, "-").toLowerCase()}`} onClick={() => ask(e)} className="btn-press rounded-full bg-[#1B1A17] border px-4 py-2 text-base hover:border-[#FF7A1A]">{e}</button>
        ))}
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <input data-testid="ask-input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Type or speak your question" className="flex-1 h-14 rounded-2xl border px-4 text-lg bg-[#1B1A17] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]" />
        <div className="flex gap-2">
          <MicButton testId="ask-mic-btn" lang={lang} onText={(t) => setQ((x) => (x ? x + " " : "") + t)} />
          <button data-testid="ask-submit-btn" onClick={() => ask()} disabled={busy} className="btn-press h-14 px-6 rounded-full bg-[#FF7A1A] text-white font-semibold flex items-center gap-2 disabled:opacity-60"><Send className="w-5 h-5" /> Ask</button>
        </div>
      </div>
      {busy && <div className="mt-5"><StepLoader steps={["Searching the web with You.com…", "Reading the sources…", `Answering in ${language}…`]} /></div>}
      {res && (
        <div data-testid="ask-answer" className="mt-5 rounded-2xl bg-[#1B1A17] p-5 fade-up text-lg">
          <div className="mb-2"><LiveBadge live={res.live} testId="ask-live-badge" /></div>
          <CitedText text={res.answer} citations={res.citations} />
          <SourceChips citations={res.citations} testId="ask-sources" />
        </div>
      )}
    </section>
  );
};
