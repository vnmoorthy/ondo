import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";

const Field = ({ label, value, onSave, type = "text", testId }) => {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value ?? "");
  const save = () => { setEdit(false); onSave(type === "number" ? (v === "" ? null : Number(v)) : v); };
  if (edit)
    return (
      <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#FF7A1A] bg-[#141412] px-3 py-1.5">
        <span className="text-sm text-[#A39E95]">{label}</span>
        <input autoFocus data-testid={`${testId}-input`} type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-36 text-lg font-semibold bg-transparent focus:outline-none" />
      </span>
    );
  return (
    <button data-testid={testId} onClick={() => { setV(value ?? ""); setEdit(true); }} className="btn-press group inline-flex items-center gap-2 rounded-2xl bg-[#141412] border px-4 py-2 hover:border-[#FF7A1A]">
      <span className="text-sm text-[#A39E95]">{label}</span>
      <span className="text-lg font-semibold">{value === null || value === undefined || value === "" ? "—" : String(value)}</span>
      <Pencil className="w-4 h-4 opacity-40 group-hover:opacity-100" />
    </button>
  );
};

const ListChips = ({ items, render, onRemove, onAdd, placeholder, testId, tone }) => {
  const [v, setV] = useState("");
  const add = () => { if (v.trim()) { onAdd(v.trim()); setV(""); } };
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map((it, i) => (
        <span key={i} data-testid={`${testId}-chip-${i}`} className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-lg font-medium" style={{ background: tone + "1f", color: "#F5F2EC", border: `1px solid ${tone}55` }}>
          {render(it)}
          <button data-testid={`${testId}-remove-${i}`} onClick={() => onRemove(i)} aria-label="Remove" className="rounded-full p-0.5 hover:bg-black/10"><X className="w-4 h-4" /></button>
        </span>
      ))}
      <span className="inline-flex items-center rounded-2xl border border-dashed px-2">
        <input data-testid={`${testId}-add-input`} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={placeholder} className="w-40 h-10 bg-transparent px-2 focus:outline-none" />
        <button data-testid={`${testId}-add-btn`} onClick={add} aria-label="Add" className="p-1.5 rounded-full hover:bg-white/5"><Plus className="w-5 h-5" /></button>
      </span>
    </div>
  );
};

const Toggle = ({ label, on, onClick, testId }) => (
  <button data-testid={testId} onClick={onClick} aria-pressed={on}
    className={`btn-press rounded-2xl px-4 py-2 text-base font-semibold border ${on ? "bg-[#FFB020] text-[#0B0B0A] border-[#FFB020]" : "bg-[#141412] text-[#A39E95]"}`}>{label}</button>
);

export const ProfileChips = ({ profile, setProfile }) => {
  const set = (k, v) => setProfile({ ...profile, [k]: v });
  const setF = (k, v) => setProfile({ ...profile, factors: { ...profile.factors, [k]: v } });
  const f = profile.factors || {};
  return (
    <div data-testid="profile-chips" className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Field label="Name" value={profile.name} onSave={(v) => set("name", v)} testId="chip-name" />
        <Field label="Age" type="number" value={profile.age} onSave={(v) => set("age", v)} testId="chip-age" />
        <Field label="Language" value={profile.language} onSave={(v) => set("language", v)} testId="chip-language" />
        <Field label="From" value={profile.home} onSave={(v) => set("home", v)} testId="chip-home" />
        <Field label="Ship" value={profile.ship} onSave={(v) => set("ship", v)} testId="chip-ship" />
        <Field label="With" value={profile.party} onSave={(v) => set("party", v)} testId="chip-party" />
      </div>
      <div>
        <div className="text-sm uppercase tracking-widest text-[#A39E95] mb-2">Medicines</div>
        <ListChips testId="meds" tone="#FF4D3D" items={profile.medications || []} placeholder="Add a medicine"
          render={(m) => <span>{m.name}{m.generic && m.generic !== m.name ? <span className="text-[#A39E95]"> · {m.generic}</span> : null}{m.drug_class ? <span className="text-sm text-[#A39E95]"> ({m.drug_class})</span> : null}</span>}
          onRemove={(i) => set("medications", profile.medications.filter((_, k) => k !== i))}
          onAdd={(v) => set("medications", [...(profile.medications || []), { name: v, generic: v, drug_class: null }])} />
      </div>
      <div>
        <div className="text-sm uppercase tracking-widest text-[#A39E95] mb-2">Health conditions</div>
        <ListChips testId="conditions" tone="#FFB020" items={profile.conditions || []} placeholder="Add a condition" render={(c) => c}
          onRemove={(i) => set("conditions", profile.conditions.filter((_, k) => k !== i))} onAdd={(v) => set("conditions", [...(profile.conditions || []), v])} />
      </div>
      <div>
        <div className="text-sm uppercase tracking-widest text-[#A39E95] mb-2">Today</div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-[#141412] border px-3 py-1.5">
            <span className="text-base">Drinks in last 3 h</span>
            <button data-testid="drinks-minus" onClick={() => setF("alcohol_drinks_3h", Math.max(0, (f.alcohol_drinks_3h || 0) - 1))} className="w-9 h-9 rounded-full bg-[#1B1A17] text-xl">−</button>
            <b data-testid="drinks-value" className="w-6 text-center text-lg">{f.alcohol_drinks_3h || 0}</b>
            <button data-testid="drinks-plus" onClick={() => setF("alcohol_drinks_3h", (f.alcohol_drinks_3h || 0) + 1)} className="w-9 h-9 rounded-full bg-[#1B1A17] text-xl">+</button>
          </span>
          <Toggle label="Slept badly" on={f.poor_sleep} onClick={() => setF("poor_sleep", !f.poor_sleep)} testId="toggle-poor-sleep" />
          <Toggle label="Seasick" on={f.seasick} onClick={() => setF("seasick", !f.seasick)} testId="toggle-seasick" />
          <Toggle label="Sunburnt" on={f.sunburn} onClick={() => setF("sunburn", !f.sunburn)} testId="toggle-sunburn" />
          <Toggle label="Dehydrated" on={f.dehydrated} onClick={() => setF("dehydrated", !f.dehydrated)} testId="toggle-dehydrated" />
          <Toggle label="Private bath please" on={profile.privacy_request} onClick={() => set("privacy_request", !profile.privacy_request)} testId="toggle-privacy" />
          <Toggle label="Need step-free" on={profile.mobility_need} onClick={() => set("mobility_need", !profile.mobility_need)} testId="toggle-mobility" />
          <Toggle label="Heart attack in last 6 months" on={profile.heart_attack_6mo} onClick={() => set("heart_attack_6mo", !profile.heart_attack_6mo)} testId="toggle-heart-attack" />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Field label="Pregnant (weeks)" type="number" value={profile.pregnancy_weeks} onSave={(v) => set("pregnancy_weeks", v)} testId="chip-pregnancy" />
          <Field label="Children's ages" value={(profile.children_ages || []).join(", ")} testId="chip-children"
            onSave={(v) => set("children_ages", String(v).split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => !isNaN(n)))} />
        </div>
      </div>
    </div>
  );
};
