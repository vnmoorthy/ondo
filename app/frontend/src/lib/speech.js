import { useCallback, useEffect, useRef, useState } from "react";

export function speak(text, lang = "en-US") {
  if (!text || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((x) => x.lang === lang) || voices.find((x) => x.lang?.startsWith(lang.split("-")[0]));
  if (v) u.voice = v;
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

export function useDictation(onText, lang) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SR) return false;
    const r = new SR();
    r.lang = lang || navigator.language || "en-US";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      const t = Array.from(e.results).slice(e.resultIndex).map((x) => x[0].transcript).join(" ");
      cbRef.current(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
    return true;
  }, [SR, lang]);

  useEffect(() => () => recRef.current?.stop(), []);
  return { listening, start, stop, supported: !!SR };
}
