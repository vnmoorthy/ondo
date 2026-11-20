import { QRCodeSVG } from "qrcode.react";

export const TryQR = ({ size = 88, testId = "try-qr", label = "Scan to try Ondo on your phone" }) => (
  <div data-testid={testId} className="inline-flex items-center gap-3 rounded-2xl border border-[#2A2723] bg-[#141412] p-2 pr-4">
    <div className="rounded-xl bg-white p-1.5"><QRCodeSVG value={window.location.origin + "/"} size={size} fgColor="#0B0B0A" /></div>
    <span className="text-sm font-semibold max-w-[9rem] leading-snug">{label}</span>
  </div>
);
