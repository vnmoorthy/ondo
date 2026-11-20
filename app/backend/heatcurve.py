"""Deterministic core-temperature model for the body heat curve (illustrative, not clinical)."""


def sweat_factor(p: dict, med_classes: set) -> float:
    s = 1.0
    if "anticholinergic" in med_classes:
        s -= 0.4
    if "beta_blocker" in med_classes:
        s -= 0.1
    age = p.get("age") or 0
    s -= 0.25 if age >= 75 else 0.15 if age >= 65 else 0
    s -= min(0.3, 0.1 * int((p.get("factors") or {}).get("alcohol_drinks_3h") or 0))
    return max(0.2, round(s, 2))


def simulate(water_c, minutes, rounds, cool_min, heat_index, sweat, total_min):
    core, out = 37.0 + max(0, heat_index - 32) * 0.02, []
    ambient = max(0.3, 1 - (heat_index - 30) * 0.04)
    plan = []
    for r in range(rounds):
        plan += ["in"] * minutes + ["cool"] * cool_min
    plan += ["cool"] * max(0, total_min - len(plan))
    out.append(round(core, 2))
    for phase in plan[:total_min]:
        if phase == "in":
            core += 0.035 * (water_c - 37) * (1.6 - sweat)
        else:
            core -= (core - 37) * 0.12 * (0.4 + sweat * 0.6) * ambient
        out.append(round(core, 2))
    return out


def body_heat_curve(p: dict, rx: dict, med_classes: set) -> dict:
    hi = rx["heat_index"]
    sweat = sweat_factor(p, med_classes)
    water = rx["bath"].get("set_temp", rx["max_temp"])
    if rx.get("foot_bath_only"):
        water = 37 + (water - 37) * 0.3
    total = max(3 * 15, rx["rounds"] * (rx["max_minutes"] + rx["cooldown_minutes"])) + 5
    typical = simulate(41, 10, 3, 5, hi, 1.0, total)
    without = simulate(41, 10, 3, 5, hi, sweat, total)
    plan = simulate(water, rx["max_minutes"], rx["rounds"], rx["cooldown_minutes"], hi, sweat, total)
    points = [{"min": i, "typical": typical[i], "without": without[i], "plan": plan[i]} for i in range(total + 1)]
    return {"points": points, "danger_c": 39.0, "sweat_factor": sweat, "peak_without": max(without), "peak_plan": max(plan), "peak_typical": max(typical)}
