import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";

export const HeatCurve = ({ curve }) => {
  if (!curve) return null;
  const top = Math.max(40, Math.ceil(curve.peak_without + 0.3));
  return (
    <section data-testid="body-heat-curve" className="rounded-3xl bg-[#141412] border p-6 md:p-8">
      <h2 className="font-display text-2xl md:text-3xl flex items-center gap-2"><Activity className="w-7 h-7 text-[#FF7A1A]" /> Your body heat curve</h2>
      <p className="text-[#A39E95] mt-1">Predicted core temperature over your visit. Your sweat factor today: <b data-testid="sweat-factor" className="text-[#F5F2EC]">{Math.round(curve.sweat_factor * 100)}%</b> of a typical guest.</p>
      <div className="mt-5 h-[300px] -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve.points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#2A2723" strokeDasharray="3 3" />
            <ReferenceArea y1={curve.danger_c} y2={top} fill="#FF4D3D" fillOpacity={0.12} />
            <ReferenceLine y={curve.danger_c} stroke="#FF4D3D" strokeDasharray="6 4" label={{ value: "39°C danger", fill: "#FF4D3D", fontSize: 12, position: "insideTopLeft" }} />
            <XAxis dataKey="min" stroke="#A39E95" tick={{ fontSize: 12 }} label={{ value: "minutes", fill: "#A39E95", fontSize: 12, position: "insideBottomRight", offset: -2 }} />
            <YAxis domain={[36.8, top]} stroke="#A39E95" tick={{ fontSize: 12 }} width={44} tickFormatter={(v) => `${v.toFixed(1)}°`} />
            <Tooltip contentStyle={{ background: "#1B1A17", border: "1px solid #2A2723", borderRadius: 12, color: "#F5F2EC" }} formatter={(v) => `${v.toFixed(2)}°C`} labelFormatter={(l) => `Minute ${l}`} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line type="monotone" dataKey="typical" name="Typical guest at 41°C" stroke="#A39E95" strokeWidth={2} dot={false} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="without" name="You without Ondo" stroke="#FF4D3D" strokeWidth={3} dot={false} />
            <Area type="monotone" dataKey="plan" name="Your Ondo plan" stroke="#3DDC97" strokeWidth={3.5} fill="#3DDC97" fillOpacity={0.08} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p data-testid="heat-curve-peaks" className="mt-3 text-base text-[#A39E95]">
        Peak without Ondo <b className="text-[#FF4D3D]">{curve.peak_without.toFixed(1)}°C</b> · with your Ondo plan <b className="text-[#3DDC97]">{curve.peak_plan.toFixed(1)}°C</b>. A simple illustrative model, not a medical measurement.
      </p>
    </section>
  );
};
