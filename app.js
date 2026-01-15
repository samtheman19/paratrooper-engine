/* Paratrooper Engine – v2
   - Auto progression logic (runs + weights)
   - Red-flag fatigue rules (Readiness check)
   - Run logging (so progression is based on what you did)
   - Strength logging: kg + LWkg + reps + LWreps + per-set rest countdown
   - Mode switch: treadmill/outdoor changes run guidance
   - Interval timer ONLY shown on Intervals day
*/

const STORAGE_KEY = "paratrooper_engine_v2";

const TODAY_KEY = () => new Date().toISOString().slice(0, 10);

// -------------------- Plan --------------------
const days = [
  {
    key: "mon",
    name: "Mon – Lower Body Strength",
    warmup: [
      "10 min easy jog or brisk walk",
      "Leg swings 10 each direction",
      "Ankles/calves 60s + hips 60s",
      "2 light warm-up sets for first lift"
    ],
    main: {
      type: "strength",
      block: "lower",
      exercises: [
        { id: "squat", name: "Back Squat (or Goblet Squat)", sets: 5, targetReps: 5, note: "clean form, no grind" },
        { id: "rdl", name: "Romanian Deadlift", sets: 4, targetReps: 6, note: "controlled" },
        { id: "split", name: "Bulgarian Split Squat", sets: 3, targetReps: 6, note: "each leg" },
        { id: "calf", name: "Standing Calf Raise", sets: 4, targetReps: 12, note: "pause at top" }
      ]
    },
    mobility: [
      { id: "couch", name: "Couch stretch", seconds: 60, note: "per side" },
      { id: "calves", name: "Calf stretch", seconds: 60, note: "per side" }
    ]
  },
  {
    key: "tue",
    name: "Tue – Intervals (2km speed)",
    warmup: [
      "Mode cue: treadmill 1.0% / outdoor flat route",
      "10–12 min easy",
      "3 × 20s strides (easy jog between)",
      "1–2 min easy before first rep"
    ],
    main: {
      type: "run",
      runType: "intervals",
      title: "Intervals",
      planned: { rounds: 6, workSec: 75, restSec: 90 },
      detailsTreadmill: [
        "Incline: 1.0%",
        "Planned: 6 rounds (edit in log if you do more/less)",
        "Work: 75s hard (RPE 8–9/10)",
        "Recover: 90s easy jog",
        "Goal: fast but controlled turnover"
      ],
      detailsOutdoor: [
        "Flat route (avoid hills/wind if possible)",
        "Planned: 6 rounds (edit in log if you do more/less)",
        "Work: 75s hard (RPE 8–9/10)",
        "Recover: 90s easy jog",
        "Effort > pace (wind/hills distort pace)"
      ],
      showIntervalTimer: true
    },
    mobility: [{ id: "hips", name: "Hip flexor stretch", seconds: 60, note: "per side" }]
  },
  {
    key: "wed",
    name: "Wed – Upper Body Strength",
    warmup: [
      "5–8 min easy cardio",
      "Band pull-aparts x 20",
      "Shoulder circles 60s",
      "2 light warm-up sets for first lift"
    ],
    main: {
      type: "strength",
      block: "upper",
      exercises: [
        { id: "press", name: "Overhead Press (DB/BB)", sets: 5, targetReps: 5, note: "tight core" },
        { id: "pull", name: "Pull-ups (or Lat Pulldown)", sets: 4, targetReps: 6, note: "full range" },
        { id: "row", name: "1-Arm Row", sets: 3, targetReps: 10, note: "each side" },
        { id: "push", name: "Push-ups", sets: 3, targetReps: 12, note: "clean reps" }
      ]
    },
    mobility: [
      { id: "pec", name: "Doorway pec stretch", seconds: 60, note: "per side" },
      { id: "lats", name: "Lat stretch", seconds: 60, note: "per side" }
    ]
  },
  {
    key: "thu",
    name: "Thu – Tempo Run (threshold)",
    warmup: [
      "Mode cue: treadmill 1.0% / outdoor flat route",
      "10–12 min easy",
      "4 × 20s relaxed strides (optional)"
    ],
    main: {
      type: "run",
      runType: "tempo",
      title: "Tempo / Threshold",
      planned: { minutes: 20 },
      detailsTreadmill: [
        "Incline: 1.0%",
        "Tempo: 20 min @ RPE 6–7/10",
        "You can speak short phrases (not full chat)",
        "Cool down: 8–10 min easy"
      ],
      detailsOutdoor: [
        "Flat route if possible",
        "Tempo: 20 min @ RPE 6–7/10",
        "Comfortably hard (controlled)",
        "Cool down: 8–10 min easy"
      ],
      showIntervalTimer: false
    },
    mobility: [{ id: "ham", name: "Hamstring stretch", seconds: 60, note: "per side" }]
  },
  {
    key: "fri",
    name: "Fri – Full Body Strength",
    warmup: [
      "5–8 min easy cardio",
      "Hip openers 60s + ankle rocks 60s",
      "2 light warm-up sets per lift"
    ],
    main: {
      type: "strength",
      block: "full",
      exercises: [
        { id: "dead", name: "Trap Bar Deadlift (or Deadlift)", sets: 4, targetReps: 4, note: "fast reps, no grind" },
        { id: "front", name: "Front Squat (or Leg Press)", sets: 3, targetReps: 6, note: "solid depth" },
        { id: "bench", name: "Bench Press (or DB Press)", sets: 4, targetReps: 6, note: "controlled" },
        { id: "carry", name: "Farmer Carry", sets: 4, targetReps: 40, note: "meters OR 40–60s" }
      ]
    },
    mobility: [{ id: "glute", name: "Glute stretch", seconds: 60, note: "per side" }]
  },
  {
    key: "sat",
    name: "Sat – Long Run (base + legs)",
    warmup: [
      "Easy start (first 10 min very relaxed)",
      "Stay smooth, avoid sprinting hills"
    ],
    main: {
      type: "run",
      runType: "long",
      title: "Long Run",
      planned: { minutes: 45 },
      detailsTreadmill: [
        "Incline: 1.0%",
        "45 min easy (RPE 2–3/10)",
        "Goal: time-on-feet + durability",
        "Optional: every 10 min, 30s slightly quicker"
      ],
      detailsOutdoor: [
        "45 min easy (RPE 2–3/10)",
        "Pick a steady route you can hold",
        "Goal: time-on-feet + durability"
      ],
      showIntervalTimer: false
    },
    mobility: [{ id: "full", name: "Full body stretch", seconds: 180, note: "easy" }]
  },
  {
    key: "sun",
    name: "Sun – Rest (full recovery)",
    warmup: [],
    main: {
      type: "rest",
      details: [
        "Full rest day.",
        "Optional: 20–40 min easy walk",
        "Optional: light mobility only"
      ]
    },
    mobility: [
      { id: "breath", name: "Box breathing", seconds: 180, note: "4-4-4-4" },
      { id: "easy", name: "Light stretch", seconds: 180, note: "gentle" }
    ]
  }
];

// -------------------- State --------------------
const defaultState = {
  dayKey: "mon",
  mode: "treadmill",
  restSeconds: 90,
  session: { running: false, startedAt: null, elapsedMs: 0, lastSaved: null },
  readiness: {}, // readiness[date] = { sleep,soreness,stress,motivation,rhrDelta }
  logs: {},      // strength logs per week/day/exercise/set
  runLogs: {}    // runLogs[week][dayKey] = { done, rpe, notes, ...type-specific fields }
};

let state = loadState();

// -------------------- Helpers --------------------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function dayByKey(key) { return days.find(d => d.key === key) || days[0]; }

function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function formatMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function currentWeekNumber() {
  const base = new Date("2026-01-01T00:00:00Z").getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - base) / (24 * 3600 * 1000));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}
function getWeekKey() { return String(currentWeekNumber()); }

function ensurePath(obj, pathArr, fallback) {
  let ref = obj;
  for (let i = 0; i < pathArr.length; i++) {
    const k = pathArr[i];
    if (ref[k] == null) ref[k] = (i === pathArr.length - 1) ? fallback : {};
    ref = ref[k];
  }
  return ref;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  })[m]);
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// -------------------- Readiness + Red-flag rules --------------------
function getReadiness(dateKey = TODAY_KEY()) {
  return ensurePath(state.readiness, [dateKey], { sleep: 3, soreness: 1, stress: 1, motivation: 3, rhrDelta: 0 });
}

function computeFatigueScore(r) {
  // Higher score = worse readiness
  // sleep/motivation are “inverse”
  const sleepPenalty = (6 - clampInt(r.sleep, 1, 5, 3));
  const motPenalty   = (6 - clampInt(r.motivation, 1, 5, 3));
  const sorePenalty  = clampInt(r.soreness, 1, 5, 1);
  const stressPenalty= clampInt(r.stress, 1, 5, 1);
  const rhr = Number(r.rhrDelta || 0);
  const rhrPenalty = rhr > 0 ? Math.min(6, rhr) / 2 : 0; // +6 HR ≈ +3 score

  return sleepPenalty + motPenalty + sorePenalty + stressPenalty + rhrPenalty;
}

function readinessBand(score) {
  // tuned for simple rules
  if (score >= 12) return "red";
  if (score >= 9) return "amber";
  return "green";
}

function redFlagGuidance(day, band) {
  if (band === "green") return { tag: "GREEN", text: "Good to go. Follow the plan. Progress if you hit targets.", adjust: null };
  if (band === "amber") {
    return {
      tag: "AMBER",
      text: "Caution. Keep quality but reduce volume slightly if needed.",
      adjust: { strengthSetCut: 1, runCutPct: 15, intervalsCutRounds: 1 }
    };
  }
  // RED
  return {
    tag: "RED FLAG",
    text: "High fatigue. Deload today: reduce volume significantly OR swap to easy mobility/walk.",
    adjust: { strengthSetCut: 2, strengthDropPct: 7.5, runCutPct: 35, intervalsCutRounds: 2 }
  };
}

// -------------------- Auto progression logic --------------------
const strengthIncrementsKg = {
  // big lower-body compounds
  squat: 5,
  dead: 5,
  rdl: 5,
  front: 2.5,
  // upper body
  press: 2.5,
  bench: 2.5,
  pull: 0, // usually bodyweight/added weight (leave manual)
  row: 2.5,
  push: 0,
  // accessories
  split: 2.5,
  calf: 2.5,
  carry: 2.5
};

function getStrengthProgressSuggestion(dayKey, ex) {
  const wk = Number(getWeekKey());
  const lw = String(Math.max(1, wk - 1));
  const thisWk = String(wk);

  const lastWeekEx = ((((state.logs || {})[lw] || {})[dayKey] || {})[ex.id]) || null;
  const thisWeekEx = ((((state.logs || {})[thisWk] || {})[dayKey] || {})[ex.id]) || null;

  // If no logs yet, give baseline suggestion
  if (!thisWeekEx) {
    return { msg: "Log today’s sets and the app will suggest next week’s progression.", nextKg: null };
  }

  // Determine if all sets are done and reps hit target
  let allDone = true;
  let allRepsHit = true;
  let avgKg = 0;
  let kgCount = 0;

  for (let i = 1; i <= ex.sets; i++) {
    const row = thisWeekEx[String(i)];
    if (!row || !row.done) allDone = false;
    const reps = Number(row?.reps ?? 0);
    if (!Number.isFinite(reps) || reps < ex.targetReps) allRepsHit = false;

    const kg = Number(row?.kg);
    if (Number.isFinite(kg)) { avgKg += kg; kgCount++; }
  }
  const meanKg = kgCount ? (avgKg / kgCount) : null;
  const inc = strengthIncrementsKg[ex.id] ?? 2.5;

  // If user isn’t ticking sets, don’t progress automatically
  if (!allDone) {
    return { msg: "Tip: tick each set ✓ to unlock auto-progression + rest timer.", nextKg: null };
  }

  // If reps missed, hold or reduce
  if (!allRepsHit) {
    return { msg: "Progression: hold weight next week (or -2.5 kg) until all target reps are solid.", nextKg: null };
  }

  // If this is bodyweight-ish, suggest reps progression
  if (inc === 0) {
    return { msg: "Progression: add +1 rep per set next week OR add small weight if available.", nextKg: null };
  }

  // Suggest next week kg based on mean
  const nextKg = meanKg != null ? roundToStep(meanKg + inc, 2.5) : null;
  const lastWeekAvg = lastWeekEx ? avgExerciseKg(lastWeekEx, ex.sets) : null;

  let msg = `Progression: next week add +${inc} kg (keep reps the same).`;
  if (lastWeekAvg != null && meanKg != null && meanKg <= lastWeekAvg) {
    msg = `Progression: you matched last week. Next week add +${inc} kg if form stays clean.`;
  }
  return { msg, nextKg };
}

function avgExerciseKg(exObj, sets) {
  let total = 0, n = 0;
  for (let i = 1; i <= sets; i++) {
    const kg = Number(exObj[String(i)]?.kg);
    if (Number.isFinite(kg)) { total += kg; n++; }
  }
  return n ? total / n : null;
}

function roundToStep(x, step) {
  return Math.round(x / step) * step;
}

function getRunProgressSuggestion(day, runLog, readinessBandValue) {
  const type = day.main.runType;
  const band = readinessBandValue;

  // Readiness adjustments
  const adj = redFlagGuidance(day, band).adjust;

  if (type === "intervals") {
    const planned = day.main.planned;
    const roundsDone = Number(runLog.roundsDone ?? planned.rounds);
    const rpe = Number(runLog.rpe ?? 8);

    if (!runLog.done) return "Log your rounds + RPE to unlock progression suggestion.";

    if (band === "red") return `RED FLAG: reduce to ${(planned.rounds - (adj?.intervalsCutRounds || 2))} rounds OR swap to easy 20–30 min + mobility.`;

    // Progress if completed all planned rounds and RPE not maxed
    if (roundsDone >= planned.rounds && rpe <= 8) {
      return `Progression: next week add +1 round (→ ${planned.rounds + 1}) OR add +5s work (keep quality).`;
    }
    return `Progression: keep the same next week. Focus on smoother reps + full recoveries.`;
  }

  if (type === "tempo") {
    const plannedMin = day.main.planned.minutes;
    const minutesDone = Number(runLog.minutesDone ?? plannedMin);
    const rpe = Number(runLog.rpe ?? 7);

    if (!runLog.done) return "Log tempo minutes + RPE to unlock progression suggestion.";

    if (band === "red") return `RED FLAG: cut tempo by ~${adj?.runCutPct || 35}% (→ ${Math.max(10, Math.round(plannedMin * 0.65))} min) OR do easy jog + mobility.`;

    if (minutesDone >= plannedMin && rpe <= 7) {
      return `Progression: next week add +2–3 min tempo (→ ${plannedMin + 2}–${plannedMin + 3} min).`;
    }
    return `Progression: keep the same tempo duration. Aim for steadier effort (RPE 6–7).`;
  }

  if (type === "long") {
    const plannedMin = day.main.planned.minutes;
    const minutesDone = Number(runLog.minutesDone ?? plannedMin);

    if (!runLog.done) return "Log long run minutes + RPE to unlock progression suggestion.";

    if (band === "red") return `RED FLAG: cut long run by ~${adj?.runCutPct || 35}% (→ ${Math.max(25, Math.round(plannedMin * 0.65))} min) or walk.`;

    if (minutesDone >= plannedMin) {
      return `Progression: add +5 min next week (→ ${plannedMin + 5} min), then deload every 3–4 weeks.`;
    }
    return `Progression: keep the same minutes next week until you hit the planned duration comfortably.`;
  }

  return "Keep the plan steady.";
}

// -------------------- Strength logging --------------------
function getLogRef(weekKey, dayKey, exId) {
  const week = ensurePath(state.logs, [weekKey], {});
  const day = ensurePath(week, [dayKey], {});
  return ensurePath(day, [exId], {});
}

function getLastWeekValue(dayKey, exId, setIdx, field) {
  const wk = Number(getWeekKey());
  const lw = String(Math.max(1, wk - 1));
  const ex = (((state.logs || {})[lw] || {})[dayKey] || {})[exId];
  const row = ex && ex[String(setIdx)];
  return row && row[field] != null && row[field] !== "" ? row[field] : "";
}

function setTodayValue(dayKey, exId, setIdx, field, value) {
  const wk = getWeekKey();
  const ex = getLogRef(wk, dayKey, exId);
  const row = ensurePath(ex, [String(setIdx)], { kg: "", reps: "", done: false, restEndsAtMs: null });
  row[field] = value;
  saveState();
}

function setDoneAndStartRest(dayKey, exId, setIdx, done) {
  const wk = getWeekKey();
  const ex = getLogRef(wk, dayKey, exId);
  const row = ensurePath(ex, [String(setIdx)], { kg: "", reps: "", done: false, restEndsAtMs: null });

  row.done = done;
  row.restEndsAtMs = done ? (Date.now() + (Number(state.restSeconds || 90) * 1000)) : null;
  saveState();
}

// -------------------- Run logging --------------------
function getRunLogRef(weekKey, dayKey) {
  const week = ensurePath(state.runLogs, [weekKey], {});
  return ensurePath(week, [dayKey], {});
}

function defaultRunLogFor(day) {
  if (day.main.runType === "intervals") {
    const p = day.main.planned;
    return { done: false, rpe: 8, roundsDone: p.rounds, workSec: p.workSec, restSec: p.restSec, notes: "" };
  }
  if (day.main.runType === "tempo") {
    return { done: false, rpe: 7, minutesDone: day.main.planned.minutes, notes: "" };
  }
  if (day.main.runType === "long") {
    return { done: false, rpe: 3, minutesDone: day.main.planned.minutes, notes: "" };
  }
  return { done: false, rpe: 5, notes: "" };
}

// -------------------- Mobility --------------------
function getMob(dayKey, mobId) {
  const day = ensurePath(state.mobility, [dayKey], {});
  return ensurePath(day, [mobId], { done: false, running: false, endsAtMs: null });
}
function mobStart(dayKey, mobId, seconds) {
  const m = getMob(dayKey, mobId);
  m.running = true;
  m.endsAtMs = Date.now() + seconds * 1000;
  m.done = false;
  saveState();
}
function mobToggleDone(dayKey, mobId, done) {
  const m = getMob(dayKey, mobId);
  m.done = done;
  if (done) { m.running = false; m.endsAtMs = null; }
  saveState();
}
function mobRemainingMs(dayKey, mobId) {
  const m = getMob(dayKey, mobId);
  if (!m.running || !m.endsAtMs) return 0;
  return Math.max(0, m.endsAtMs - Date.now());
}

// -------------------- DOM --------------------
const daySelect = document.getElementById("daySelect");
const modeSelect = document.getElementById("modeSelect");
const resetDayBtn = document.getElementById("resetDayBtn");
const resetWeekBtn = document.getElementById("resetWeekBtn");

const readinessDateEl = document.getElementById("readinessDate");
const sleepSelect = document.getElementById("sleepSelect");
const sorenessSelect = document.getElementById("sorenessSelect");
const stressSelect = document.getElementById("stressSelect");
const motivationSelect = document.getElementById("motivationSelect");
const rhrDeltaInput = document.getElementById("rhrDeltaInput");
const readinessStatus = document.getElementById("readinessStatus");

const sessionDateEl = document.getElementById("sessionDate");
const sessionTimeEl = document.getElementById("sessionTime");
const sessionStartBtn = document.getElementById("sessionStartBtn");
const sessionPauseBtn = document.getElementById("sessionPauseBtn");
const sessionEndBtn = document.getElementById("sessionEndBtn");

const dayTitleEl = document.getElementById("dayTitle");
const warmupList = document.getElementById("warmupList");
const mainBlock = document.getElementById("mainBlock");
const mobilityList = document.getElementById("mobilityList");

// -------------------- Init --------------------
function init() {
  daySelect.innerHTML = days.map(d => `<option value="${d.key}">${d.name}</option>`).join("");
  daySelect.value = state.dayKey;

  modeSelect.value = state.mode || "treadmill";

  initReadinessUI();
  render();
  startTick();
}
init();

function initReadinessUI() {
  const dateKey = TODAY_KEY();
  const r = getReadiness(dateKey);

  readinessDateEl.textContent = dateKey;

  sleepSelect.value = String(r.sleep ?? 3);
  sorenessSelect.value = String(r.soreness ?? 1);
  stressSelect.value = String(r.stress ?? 1);
  motivationSelect.value = String(r.motivation ?? 3);
  rhrDeltaInput.value = String(r.rhrDelta ?? 0);

  const saveReadiness = () => {
    const rr = getReadiness(dateKey);
    rr.sleep = clampInt(sleepSelect.value, 1, 5, 3);
    rr.soreness = clampInt(sorenessSelect.value, 1, 5, 1);
    rr.stress = clampInt(stressSelect.value, 1, 5, 1);
    rr.motivation = clampInt(motivationSelect.value, 1, 5, 3);
    const rhr = Number(rhrDeltaInput.value || 0);
    rr.rhrDelta = Number.isFinite(rhr) ? rhr : 0;
    saveState();
    renderReadinessStatus();
    renderDay(); // so guidance changes immediately
    attachHandlers();
  };

  sleepSelect.onchange = saveReadiness;
  sorenessSelect.onchange = saveReadiness;
  stressSelect.onchange = saveReadiness;
  motivationSelect.onchange = saveReadiness;
  rhrDeltaInput.oninput = saveReadiness;

  renderReadinessStatus();
}

function renderReadinessStatus() {
  const r = getReadiness(TODAY_KEY());
  const score = computeFatigueScore(r);
  const band = readinessBand(score);

  const dot = band === "green" ? "statusGood" : band === "amber" ? "statusWarn" : "statusBad";
  const label = band === "green" ? "GREEN" : band === "amber" ? "AMBER" : "RED FLAG";

  const day = dayByKey(state.dayKey);
  const guide = redFlagGuidance(day, band);

  readinessStatus.innerHTML = `
    <div class="pill">
      <div style="font-weight:900;">
        <span class="statusDot ${dot}"></span>${label} • score ${score.toFixed(1)}
      </div>
      <div class="tiny" style="margin-top:6px;">
        ${escapeHtml(guide.text)}
      </div>
    </div>
  `;
}

// -------------------- Session Timer --------------------
function sessionNowElapsedMs() {
  if (!state.session.running || !state.session.startedAt) return state.session.elapsedMs || 0;
  return (state.session.elapsedMs || 0) + (Date.now() - state.session.startedAt);
}
function sessionStart() {
  if (state.session.running) return;
  state.session.running = true;
  state.session.startedAt = Date.now();
  saveState();
  renderSession();
}
function sessionPause() {
  if (!state.session.running) return;
  state.session.elapsedMs = sessionNowElapsedMs();
  state.session.running = false;
  state.session.startedAt = null;
  saveState();
  renderSession();
}
function sessionEndSave() {
  state.session.elapsedMs = sessionNowElapsedMs();
  state.session.running = false;
  state.session.startedAt = null;
  state.session.lastSaved = { date: TODAY_KEY(), elapsedMs: state.session.elapsedMs };
  saveState();
  renderSession();
}

// -------------------- Render --------------------
function renderSession() {
  sessionDateEl.textContent = new Date().toDateString();
  sessionTimeEl.textContent = formatHMS(sessionNowElapsedMs());
  sessionStartBtn.textContent = state.session.running ? "Running" : "Start";
  sessionStartBtn.disabled = state.session.running;
}

function renderDay() {
  const day = dayByKey(state.dayKey);
  const mode = state.mode || "treadmill";

  dayTitleEl.textContent = day.name;

  warmupList.innerHTML =
    (day.warmup || []).map(x => `<li>${escapeHtml(x)}</li>`).join("") || `<li class="muted">—</li>`;

  const r = getReadiness(TODAY_KEY());
  const band = readinessBand(computeFatigueScore(r));
  const fatigueGuide = redFlagGuidance(day, band);

  const fatigueBanner = `
    <div class="pill" style="margin-bottom:12px;">
      <div style="font-weight:900;">Today: ${escapeHtml(fatigueGuide.tag)}</div>
      <div class="tiny">${escapeHtml(fatigueGuide.text)}</div>
    </div>
  `;

  if (day.main.type === "strength") {
    mainBlock.innerHTML = `
      ${fatigueBanner}
      ${(day.main.exercises || []).map(ex => renderExercise(day.key, ex, band)).join("")}
      ${renderRestSettings()}
      ${renderStrengthProgressOverview(day, band)}
    `;
  } else if (day.main.type === "run") {
    const details = mode === "outdoor" ? (day.main.detailsOutdoor || []) : (day.main.detailsTreadmill || []);
    mainBlock.innerHTML = `
      ${fatigueBanner}
      <div class="cardTitle">${escapeHtml(day.main.title || "Run")}</div>
      <ul>${details.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      ${renderRunLogger(day, band)}
      ${day.main.showIntervalTimer ? `
        <div class="hr"></div>
        <div class="cardTitle">Interval Timer</div>
        <div class="muted">Use only for this intervals session.</div>
        ${renderIntervalTimer(day)}
      ` : ``}
    `;
  } else if (day.main.type === "rest") {
    mainBlock.innerHTML = `
      ${fatigueBanner}
      <div class="cardTitle">Rest</div>
      <ul>${(day.main.details || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    `;
  } else {
    mainBlock.innerHTML = `
      ${fatigueBanner}
      <div class="cardTitle">${escapeHtml(day.main.title || "Session")}</div>
      <ul>${(day.main.details || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    `;
  }

  mobilityList.innerHTML =
    (day.mobility || []).map(m => renderMobItem(day.key, m)).join("") || `<div class="muted">—</div>`;
}

function renderExercise(dayKey, ex, readinessBandValue) {
  const wk = getWeekKey();
  const exLog = getLogRef(wk, dayKey, ex.id);

  const suggestion = getStrengthProgressSuggestion(dayKey, ex);

  // Readiness deload hint
  let deloadHint = "";
  if (readinessBandValue === "amber") deloadHint = "AMBER: consider -1 set if form feels off.";
  if (readinessBandValue === "red") deloadHint = "RED FLAG: drop 5–10% weight and cut 1–2 sets OR swap to mobility.";

  const rows = Array.from({ length: ex.sets }, (_, i) => {
    const setIdx = i + 1;
    const row = exLog[String(setIdx)] || { kg: "", reps: ex.targetReps, done: false, restEndsAtMs: null };

    const lwKg = getLastWeekValue(dayKey, ex.id, setIdx, "kg");
    const lwReps = getLastWeekValue(dayKey, ex.id, setIdx, "reps");

    const remaining = row.restEndsAtMs ? Math.max(0, row.restEndsAtMs - Date.now()) : 0;
    const restLabel = row.restEndsAtMs ? formatMS(remaining) : "—";

    return `
      <div class="setRow">
        <div class="setNum">#${setIdx}</div>

        <input class="pillInput" inputmode="decimal" placeholder="kg"
          value="${escapeAttr(row.kg ?? "")}"
          data-kg="${ex.id}|${setIdx}" />

        <div class="pillRead" title="Last week kg">${lwKg !== "" ? escapeHtml(String(lwKg)) : "LW"}</div>

        <input class="pillInput" inputmode="numeric" placeholder="${ex.targetReps}"
          value="${escapeAttr(row.reps ?? ex.targetReps)}"
          data-reps="${ex.id}|${setIdx}" />

        <div class="pillRead" title="Last week reps">${lwReps !== "" ? escapeHtml(String(lwReps)) : "LW"}</div>

        <div class="restBox" data-restbox="${ex.id}|${setIdx}" title="Rest countdown">${restLabel}</div>

        <div class="doneWrap">
          <input class="done" type="checkbox" ${row.done ? "checked" : ""} data-done="${ex.id}|${setIdx}" />
        </div>
      </div>
    `;
  }).join("");

  const nextLine = suggestion.nextKg != null
    ? `<div class="tiny">Suggested next week: <b>${suggestion.nextKg} kg</b></div>`
    : "";

  return `
    <div style="margin:10px 0 18px;">
      <div class="exTitle">${escapeHtml(ex.name)}</div>
      <div class="exMeta">${ex.sets} sets · target reps ${ex.targetReps}${ex.note ? ` · ${escapeHtml(ex.note)}` : ""}</div>

      <div class="tiny" style="margin-bottom:8px;">
        ${escapeHtml(suggestion.msg)} ${nextLine}
        ${deloadHint ? `<div class="tiny" style="margin-top:6px;">${escapeHtml(deloadHint)}</div>` : ""}
      </div>

      <div class="tableHead">
        <div>#</div><div>kg</div><div>LW</div><div>reps</div><div>LW</div><div>⏱</div><div>✓</div>
      </div>
      ${rows}
    </div>
  `;
}

function renderStrengthProgressOverview(day, readinessBandValue) {
  let note = "Auto progression uses your ticks ✓ + reps hit. Hit all targets → add load next week.";
  if (readinessBandValue === "amber") note = "AMBER: keep quality, reduce volume slightly if needed.";
  if (readinessBandValue === "red") note = "RED FLAG: deload (reduce weight/sets) or swap to mobility.";

  return `
    <div class="hr"></div>
    <div class="muted" style="font-weight:900;">${escapeHtml(note)}</div>
  `;
}

function renderRestSettings() {
  return `
    <div class="hr"></div>
    <div class="cardTitle">Rest settings</div>
    <div class="muted">Tick a set to auto-start the countdown next to it.</div>

    <div class="row" style="margin-top:10px;">
      <button class="btn btnSmall" data-rest="60">60s</button>
      <button class="btn btnSmall" data-rest="90">90s</button>
      <button class="btn btnSmall" data-rest="120">120s</button>
      <div class="spacer"></div>
      <input id="restSeconds" type="number" min="10" max="600" value="${Number(state.restSeconds || 90)}" style="width:120px;" />
      <div class="muted" style="padding-left:6px;font-weight:900;">sec</div>
    </div>
  `;
}

function renderRunLogger(day, readinessBandValue) {
  const wk = getWeekKey();
  const ref = getRunLogRef(wk, day.key);
  const defaults = defaultRunLogFor(day);

  // ensure defaults exist
  for (const k of Object.keys(defaults)) {
    if (ref[k] == null) ref[k] = defaults[k];
  }
  saveState();

  const suggestion = getRunProgressSuggestion(day, ref, readinessBandValue);

  // Build type-specific fields
  let fields = "";

  if (day.main.runType === "intervals") {
    fields = `
      <div class="runGrid">
        <div>
          <div class="label">Rounds done</div>
          <input id="runRoundsDone" type="number" min="1" value="${escapeAttr(ref.roundsDone)}" />
        </div>
        <div>
          <div class="label">RPE (1–10)</div>
          <input id="runRPE" type="number" min="1" max="10" value="${escapeAttr(ref.rpe)}" />
        </div>
      </div>
      <div class="runGrid">
        <div>
          <div class="label">Work seconds</div>
          <input id="runWorkSec" type="number" min="10" value="${escapeAttr(ref.workSec)}" />
        </div>
        <div>
          <div class="label">Rest seconds</div>
          <input id="runRestSec" type="number" min="10" value="${escapeAttr(ref.restSec)}" />
        </div>
      </div>
    `;
  } else if (day.main.runType === "tempo") {
    fields = `
      <div class="runGrid">
        <div>
          <div class="label">Tempo minutes done</div>
          <input id="runMinutesDone" type="number" min="5" value="${escapeAttr(ref.minutesDone)}" />
        </div>
        <div>
          <div class="label">RPE (1–10)</div>
          <input id="runRPE" type="number" min="1" max="10" value="${escapeAttr(ref.rpe)}" />
        </div>
      </div>
    `;
  } else if (day.main.runType === "long") {
    fields = `
      <div class="runGrid">
        <div>
          <div class="label">Minutes done</div>
          <input id="runMinutesDone" type="number" min="10" value="${escapeAttr(ref.minutesDone)}" />
        </div>
        <div>
          <div class="label">RPE (1–10)</div>
          <input id="runRPE" type="number" min="1" max="10" value="${escapeAttr(ref.rpe)}" />
        </div>
      </div>
    `;
  }

  return `
    <div class="hr"></div>

    <div class="cardTitle">Log this session</div>
    <div class="muted">This drives your auto progression.</div>

    <div class="row" style="margin-top:10px;">
      <label class="pill" style="display:flex;align-items:center;gap:10px;">
        <input id="runDone" type="checkbox" ${ref.done ? "checked" : ""} />
        <span style="font-weight:900;">Completed</span>
      </label>
      <div class="spacer"></div>
    </div>

    ${fields}

    <div style="margin-top:10px;">
      <div class="label">Notes (optional)</div>
      <textarea id="runNotes" placeholder="How did it feel? Any pain/tightness?">${escapeHtml(ref.notes || "")}</textarea>
    </div>

    <div class="hr"></div>
    <div class="pill">
      <div style="font-weight:900;">Auto progression</div>
      <div class="tiny" style="margin-top:6px;">${escapeHtml(suggestion)}</div>
    </div>
  `;
}

function renderIntervalTimer(day) {
  const p = day.main.planned || { rounds: 6, workSec: 75, restSec: 90 };
  return `
    <div class="card" style="margin:12px 0 0;">
      <div class="row" style="align-items:flex-end;">
        <div class="bigTime" id="itTime" style="font-size:44px;margin:0;">00:00</div>
        <div class="spacer"></div>
        <button class="btn btnPrimary" id="itStart">Start</button>
        <button class="btn" id="itPause">Pause</button>
        <button class="btn" id="itStop">Stop</button>
      </div>
      <div class="hr"></div>
      <div class="runGrid">
        <div>
          <div class="label">Work (sec)</div>
          <input id="itWork" type="number" min="10" value="${p.workSec}" />
        </div>
        <div>
          <div class="label">Rest (sec)</div>
          <input id="itRest" type="number" min="10" value="${p.restSec}" />
        </div>
      </div>
      <div class="runGrid" style="margin-top:10px;">
        <div>
          <div class="label">Rounds</div>
          <input id="itRounds" type="number" min="1" value="${p.rounds}" />
        </div>
        <div>
          <div class="label">Auto switch</div>
          <select id="itAuto">
            <option value="on" selected>On</option>
            <option value="off">Off</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderMobItem(dayKey, m) {
  const mob = getMob(dayKey, m.id);
  const rem = mobRemainingMs(dayKey, m.id);
  const shown = mob.running ? formatMS(rem) : formatMS(m.seconds * 1000);

  return `
    <div class="mobItem">
      <div>
        <div class="mobName">${escapeHtml(m.name)}</div>
        <div class="tiny">${escapeHtml(m.note || "")}</div>
      </div>

      <div class="mobTimer">${shown}</div>

      <button class="mobBtn" data-mobstart="${m.id}" title="Start">▶</button>

      <div class="mobDone">
        <input class="mobChk" type="checkbox" ${mob.done ? "checked" : ""} data-mobdone="${m.id}" />
      </div>
    </div>
  `;
}

function render() {
  renderSession();
  renderReadinessStatus();
  renderDay();
  attachHandlers();
}

// -------------------- Handlers --------------------
function attachHandlers() {
  daySelect.onchange = () => {
    state.dayKey = daySelect.value;
    saveState();
    render();
  };

  modeSelect.onchange = () => {
    state.mode = modeSelect.value;
    saveState();
    renderDay();
    attachHandlers();
  };

  resetDayBtn.onclick = () => {
    const wk = getWeekKey();
    if (state.logs[wk] && state.logs[wk][state.dayKey]) delete state.logs[wk][state.dayKey];
    if (state.runLogs[wk] && state.runLogs[wk][state.dayKey]) delete state.runLogs[wk][state.dayKey];
    if (state.mobility[state.dayKey]) delete state.mobility[state.dayKey];
    saveState();
    render();
  };

  resetWeekBtn.onclick = () => {
    const wk = getWeekKey();
    delete state.logs[wk];
    delete state.runLogs[wk];
    saveState();
    render();
  };

  sessionStartBtn.onclick = sessionStart;
  sessionPauseBtn.onclick = sessionPause;
  sessionEndBtn.onclick = sessionEndSave;

  // Rest settings
  document.querySelectorAll("[data-rest]").forEach(btn => {
    btn.onclick = () => {
      state.restSeconds = Number(btn.getAttribute("data-rest")) || 90;
      const inp = document.getElementById("restSeconds");
      if (inp) inp.value = state.restSeconds;
      saveState();
    };
  });
  const restInp = document.getElementById("restSeconds");
  if (restInp) {
    restInp.onchange = () => {
      const v = Number(restInp.value || 90);
      state.restSeconds = Math.min(600, Math.max(10, v));
      restInp.value = state.restSeconds;
      saveState();
    };
  }

  // Strength inputs
  document.querySelectorAll("[data-kg]").forEach(inp => {
    inp.oninput = () => {
      const [exId, setIdx] = inp.getAttribute("data-kg").split("|");
      setTodayValue(state.dayKey, exId, Number(setIdx), "kg", inp.value);
    };
  });

  document.querySelectorAll("[data-reps]").forEach(inp => {
    inp.oninput = () => {
      const [exId, setIdx] = inp.getAttribute("data-reps").split("|");
      setTodayValue(state.dayKey, exId, Number(setIdx), "reps", inp.value);
    };
  });

  document.querySelectorAll("[data-done]").forEach(chk => {
    chk.onchange = () => {
      const [exId, setIdx] = chk.getAttribute("data-done").split("|");
      setDoneAndStartRest(state.dayKey, exId, Number(setIdx), chk.checked);
      renderDay();
      attachHandlers();
    };
  });

  // Mobility
  document.querySelectorAll("[data-mobstart]").forEach(btn => {
    btn.onclick = () => {
      const mobId = btn.getAttribute("data-mobstart");
      const day = dayByKey(state.dayKey);
      const item = (day.mobility || []).find(x => x.id === mobId);
      if (!item) return;
      mobStart(state.dayKey, mobId, item.seconds);
      renderDay();
      attachHandlers();
    };
  });
  document.querySelectorAll("[data-mobdone]").forEach(chk => {
    chk.onchange = () => {
      const mobId = chk.getAttribute("data-mobdone");
      mobToggleDone(state.dayKey, mobId, chk.checked);
      renderDay();
      attachHandlers();
    };
  });

  // Run log handlers (if present)
  const day = dayByKey(state.dayKey);
  if (day.main.type === "run") {
    const wk = getWeekKey();
    const ref = getRunLogRef(wk, day.key);

    const doneEl = document.getElementById("runDone");
    const rpeEl = document.getElementById("runRPE");
    const notesEl = document.getElementById("runNotes");
    const roundsEl = document.getElementById("runRoundsDone");
    const workEl = document.getElementById("runWorkSec");
    const restEl = document.getElementById("runRestSec");
    const minsEl = document.getElementById("runMinutesDone");

    const saveRunLog = () => {
      if (doneEl) ref.done = !!doneEl.checked;
      if (rpeEl) ref.rpe = clampInt(rpeEl.value, 1, 10, Number(ref.rpe || 7));
      if (notesEl) ref.notes = String(notesEl.value || "");

      if (roundsEl) ref.roundsDone = clampInt(roundsEl.value, 1, 50, Number(ref.roundsDone || day.main.planned?.rounds || 6));
      if (workEl) ref.workSec = clampInt(workEl.value, 10, 600, Number(ref.workSec || day.main.planned?.workSec || 75));
      if (restEl) ref.restSec = clampInt(restEl.value, 10, 600, Number(ref.restSec || day.main.planned?.restSec || 90));
      if (minsEl) ref.minutesDone = clampInt(minsEl.value, 5, 300, Number(ref.minutesDone || day.main.planned?.minutes || 20));

      saveState();
      renderDay();
      attachHandlers();
    };

    if (doneEl) doneEl.onchange = saveRunLog;
    if (rpeEl) rpeEl.onchange = saveRunLog;
    if (notesEl) notesEl.oninput = saveRunLog;

    if (roundsEl) roundsEl.onchange = saveRunLog;
    if (workEl) workEl.onchange = saveRunLog;
    if (restEl) restEl.onchange = saveRunLog;
    if (minsEl) minsEl.onchange = saveRunLog;
  }

  // Interval timer only if present
  const itTime = document.getElementById("itTime");
  if (itTime) setupIntervalTimer();
}

// -------------------- Tick loop --------------------
let tickTimer = null;
function startTick() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    sessionTimeEl.textContent = formatHMS(sessionNowElapsedMs());

    const wk = getWeekKey();
    const dayKey = state.dayKey;
    const day = dayByKey(dayKey);

    if (day.main.type === "strength") {
      (day.main.exercises || []).forEach(ex => {
        const exLog = (((state.logs || {})[wk] || {})[dayKey] || {})[ex.id] || {};
        for (let i = 1; i <= ex.sets; i++) {
          const row = exLog[String(i)];
          const el = document.querySelector(`[data-restbox="${ex.id}|${i}"]`);
          if (!el) continue;

          if (row && row.restEndsAtMs) {
            const rem = Math.max(0, row.restEndsAtMs - Date.now());
            el.textContent = formatMS(rem);
            if (rem <= 0) {
              row.restEndsAtMs = null;
              saveState();
              el.textContent = "—";
              beep();
            }
          } else {
            el.textContent = "—";
          }
        }
      });
    }

    (day.mobility || []).forEach(m => {
      const mob = getMob(dayKey, m.id);
      if (mob.running && mob.endsAtMs) {
        const rem = Math.max(0, mob.endsAtMs - Date.now());
        if (rem <= 0) {
          mob.running = false;
          mob.endsAtMs = null;
          saveState();
          beep();
          renderDay();
          attachHandlers();
        }
      }
    });
  }, 250);
}

// -------------------- Interval Timer --------------------
function setupIntervalTimer() {
  const itTime = document.getElementById("itTime");
  const itStart = document.getElementById("itStart");
  const itPause = document.getElementById("itPause");
  const itStop = document.getElementById("itStop");
  const itWork = document.getElementById("itWork");
  const itRest = document.getElementById("itRest");
  const itRounds = document.getElementById("itRounds");
  const itAuto = document.getElementById("itAuto");

  let running = false;
  let phase = "work";
  let endsAt = null;
  let round = 1;

  function setDisplay(ms) { itTime.textContent = formatMS(ms); }
  function startPhase() {
    const work = Number(itWork.value || 75) * 1000;
    const rest = Number(itRest.value || 90) * 1000;
    endsAt = Date.now() + (phase === "work" ? work : rest);
  }
  function tick() {
    if (!running || !endsAt) return;
    const rem = Math.max(0, endsAt - Date.now());
    setDisplay(rem);
    if (rem <= 0) {
      beep();
      if (itAuto.value === "off") { running = false; return; }
      if (phase === "work") phase = "rest";
      else {
        phase = "work";
        round += 1;
        const totalRounds = Number(itRounds.value || 6);
        if (round > totalRounds) { running = false; return; }
      }
      startPhase();
    }
  }

  itStart.onclick = () => {
    if (running) return;
    running = true;
    phase = "work";
    round = 1;
    startPhase();
  };
  itPause.onclick = () => { running = false; };
  itStop.onclick = () => { running = false; endsAt = null; setDisplay(0); phase = "work"; round = 1; };

  setInterval(tick, 200);
}

// -------------------- Beep --------------------
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 800;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
  } catch {}
}

render();
