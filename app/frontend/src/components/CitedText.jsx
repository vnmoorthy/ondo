import { ExternalLink } from "lucide-react";

const stripMd = (t) => (t || "").replace(/^#+\s*/gm, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");

export const CitedText = ({ text, citations = [], limit, testId }) => {
  let t = stripMd(text);
  if (limit && t.length > limit) {
    const cut = t.slice(0, limit);
    t = cut.slice(0, cut.lastIndexOf(" ")) + "…";
  }
  const parts = t.split(/(\[\[[\d,\s]+\]\])/g);
  return (
    <p data-testid={testId} className="leading-relaxed whitespace-pre-line">
      {parts.map((p, i) => {
        const m = p.match(/^\[\[([\d,\s]+)\]\]$/);
        if (!m) return <span key={i}>{p}</span>;
        return m[1].split(",").map((n) => {
          const c = citations[parseInt(n, 10) - 1];
          return c ? (
            <a key={`${i}-${n}`} href={c.url} target="_blank" rel="noreferrer" className="mx-0.5 align-super text-[0.65rem] font-bold rounded bg-[#FF7A1A] text-white px-1 py-px hover:bg-[#FF7A1A]">{n.trim()}</a>
          ) : null;
        });
      })}
    </p>
  );
};

export const SourceChips = ({ citations = [], max = 3, testId }) => (
  <div data-testid={testId} className="flex flex-wrap gap-2 mt-3">
    {citations.slice(0, max).map((c, i) => (
      <a key={c.url + i} href={c.url} target="_blank" rel="noreferrer" title={c.excerpt}
        className="btn-press inline-flex items-center gap-1.5 rounded-full border border-[#FF7A1A]/20 bg-[#1B1A17] px-3 py-1 text-sm text-[#FF7A1A] hover:border-[#FF7A1A] hover:text-[#FF7A1A]">
        <span className="font-bold">{i + 1}</span> {c.domain || "source"} <ExternalLink className="w-3.5 h-3.5" />
      </a>
    ))}
  </div>
);
