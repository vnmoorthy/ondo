import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const http = axios.create({ baseURL: API, timeout: 90000 });

export const flag = (cc) =>
  cc && cc.length === 2 ? String.fromCodePoint(...cc.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0))) : "";

export const fmt = (s) => {
  const v = Math.max(0, Math.round(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};

export const RISK = {
  green: { color: "#3DDC97", label: "Low risk" },
  amber: { color: "#FFB020", label: "Take care" },
  red: { color: "#FF4D3D", label: "High risk" },
};

export const heatColor = (f) => (f < 0.6 ? "#3DDC97" : f < 0.9 ? "#FFB020" : "#FF4D3D");
