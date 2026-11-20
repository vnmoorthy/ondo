import { RISK } from "@/lib/api";

export const RiskDial = ({ score, level, size = 240 }) => {
  const r = size / 2 - 18;
  const cx = size / 2, cy = size / 2;
  const angle = Math.PI * (1 - Math.min(100, score) / 100);
  const nx = cx + (r - 22) * Math.cos(angle), ny = cy - (r - 22) * Math.sin(angle);
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const color = RISK[level]?.color;
  return (
    <div data-testid="risk-dial" className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        <defs>
          <linearGradient id="dialg" x1="0" x2="1">
            <stop offset="0%" stopColor="#3DDC97" /><stop offset="50%" stopColor="#FFB020" /><stop offset="100%" stopColor="#FF4D3D" />
          </linearGradient>
        </defs>
        <path d={arc} stroke="#2A2723" strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d={arc} stroke="url(#dialg)" strokeWidth="22" fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#F5F2EC" strokeWidth="5" strokeLinecap="round" style={{ transition: "all .8s ease" }} />
        <circle cx={cx} cy={cy} r="11" fill="#F5F2EC" />
      </svg>
      <div className="-mt-2 text-center">
        <div data-testid="risk-score" className="font-display text-5xl font-semibold">{score}</div>
        <div data-testid="risk-level" className="mt-1 inline-block rounded-full px-4 py-1 text-white font-semibold" style={{ background: color }}>{RISK[level]?.label}</div>
      </div>
    </div>
  );
};
