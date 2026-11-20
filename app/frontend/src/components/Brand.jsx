import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export const Brand = ({ dark = true, right }) => (
  <header className={`relative z-20 flex items-center justify-between px-5 md:px-10 py-5 ${dark ? "text-white" : "text-[#0B0B0A]"}`}>
    <Link to="/" data-testid="brand-home-link" className="flex items-baseline gap-2">
      <span className="font-wordmark text-2xl font-semibold tracking-[0.35em]">ONDO</span>
      <span className="font-display text-xl opacity-70">温度</span>
      <span className="hidden sm:inline text-sm opacity-70 ml-2">Yu Pinang Onsen · Penang</span>
    </Link>
    {right ?? (
      <Link to="/staff" data-testid="nav-staff-link" className={`btn-press inline-flex items-center gap-2 rounded-full px-4 h-11 text-sm font-semibold ${dark ? "bg-white/10 hover:bg-white/20" : "bg-[#FF7A1A] text-white"}`}>
        <ShieldCheck className="w-4 h-4" /> Staff console
      </Link>
    )}
  </header>
);
