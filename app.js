const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./sw.js"
];
/* Paratrooper Engine – v1
   - Day + Mode selector (treadmill/outdoor)
   - Strength logging with last-week columns + per-set rest countdown
   - Lower / Upper / Full-body strength + HIIT
   - Run sessions + interval timer ONLY on Intervals day
   - Mobility with countdown + tick
*/

const STORAGE_KEY = "paratrooper_engine_v1";

const TODAY_KEY = () => new Date().toISOString().slice(0, 10);

// -------------------- Plan --------------------
// Note: Run details are written in “effort + simple pace cues” so treadmill/outdoor both work.
// Outdoor: use flat route & “controlled effort”; treadmill: 1% incline cue.
const days = [
  {
    key: "mon",
    name: "Mon – Lower Body (Strength)",
    warmup: [
      "10 min easy jog or brisk walk",
      "Leg swings 10 each direction",
      "Ankles/calves 60s + hips 60s"
    ],
    main: {
      type: "strength",
      exercises: [
        { id: "squat", name: "Back Squat (or Goblet Squat)", sets: 5, targetReps: 5, note: "tight form, drive up" },
        { id: "rdl", name: "Romanian Deadlift", sets: 4, targetReps: 6, note: "controlled" },
        { id: "lunge", name: "Walking Lunge", sets: 3, targetReps: 10, note: "each leg" },
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
    name: "Tue – Intervals (2k speed)",
    warmup: [
      "Mode cue: treadmill 1.0% / outdoor flat route",
      "10–12 min easy",
      "3 × 20s strides (easy jog between)"
    ],
    main: {
      type: "run",
      title: "Intervals",
      detailsTreadmill: [
        "Incline: 1.0%",
        "6–8 rounds",
        "Work: 60–90s hard (RPE 8/10)",
        "Recover: 75–120s easy jog",
        "Goal: relaxed fast turnover"
      ],
      detailsOutdoor: [
        "Flat route (avoid hills/wind if possible)",
        "6–8 rounds",
        "Work: 60–90s hard (RPE 8/10)",
        "Recover: 75–120s easy jog",
        "Use effort; don’t chase pace in wind"
      ],
      showIntervalTimer: true
    },
    mobility: [{ id: "hips", name: "Hip flexor stretch", seconds: 60, note: "per side" }]
  },
  {
    key: "wed",
    name: "Wed – HIIT + Core (Engine)",
    warmup: [
      "5–8 min easy jog or brisk walk",
      "Dynamic: high knees x 20m, butt kicks x 20m, leg swings x 10"
    ],
    main: {
      type: "hiit",
      title: "HIIT (No equipment)",
      details: [
        "12–18 min total",
        "Option A: 10 rounds → 30s hard / 30s easy",
        "Hard options: burpees, shuttle sprints, mountain climbers, squat jumps",
        "Easy: walk + deep breaths",
        "Finish: 6–10 min easy walk"
      ]
    },
    mobility: [
      { id: "tspine", name: "Thoracic rotations", seconds: 60, note: "per side" },
      { id: "ham", name: "Hamstring stretch", seconds: 60, note: "per side" }
    ]
  },
  {
    key: "thu",
    name: "Thu – Upper Body (Strength)",
    warmup: [
      "5–8 min easy cardio",
      "Band pull-aparts x 20",
      "Shoulder circles 60s"
    ],
    main: {
      type: "strength",
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
    key: "fri",
    name: "Fri – Easy Run (aerobic)",
    warmup: ["Mode cue: treadmill 1.0% / outdoor easy flat loop"],
    main: {
      type: "run",
      title: "Easy Run",
      detailsTreadmill: [
        "Incline: 1.0%",
        "20–35 min easy",
        "You should be able to talk",
        "Finish: 4 × 15s relaxed strides (optional)"
      ],
      detailsOutdoor: [
        "20–35 min easy",
        "Talk-test pace",
        "Avoid sprinting hills; keep it smooth",
        "Finish: 4 × 15s relaxed strides (optional)"
      ],
      showIntervalTimer: false
    },
    mobility: [{ id: "calf2", name: "Calf stretch", seconds: 60, note: "per side" }]
  },
  {
    key: "sat",
    name: "Sat – Full Body (Strength)",
    warmup: [
      "5–8 min easy cardio",
      "Hip openers 60s + ankle rocks 60s",
      "2 light warm-up sets per lift"
    ],
    main: {
      type: "strength",
      exercises: [
        { id: "dead", name: "Trap Bar Deadlift (or Deadlift)", sets: 4, targetReps: 4, note: "fast reps, no grind" },
        { id: "front", name: "Front Squat (or Leg Press)", sets: 3, targetReps: 6, note: "solid depth" },
        { id: "bench", name: "Bench Press (or DB Press)", sets: 4, targetReps: 6, note: "controlled" },
        { id: "carry", name: "Farmer Carry", sets: 4, targetReps: 40, note: "meters (or 40–60s)" }
      ]
    },
    mobility: [{ id: "glute", name: "Glute stretch", seconds: 60, note: "per side" }]
  },
  {
    key: "sun",
    name: "Sun – Long Run (base + legs)",
    warmup: ["Keep it easy. Flat route if possible."],
    main: {
      type: "run",
      title: "Long Run",
      detailsTreadmill: [
        "Incline: 1.0%",
        "35–55 min easy",
        "Every 10 min: 30s slightly faster (optional)",
        "Goal: time-on-feet"
      ],
      detailsOutdoor: [
        "35–55 min easy",
        "Choose a route you can keep steady",
        "If hills happen, keep effort easy",
        "Goal: time-on-feet"
      ],
      showIntervalTimer: false
    },
    mobility: [{ id: "full", name: "Full body stretch", seconds: 180, note: "easy" }]
  }
];

// -------------------- State --------------------
const defaultState = {
  dayKey: "mon",
  mode: "treadmill", // treadmill | outdoor
  restSeconds: 90,
  session: { running: false, startedAt: null, elapsedMs: 0, lastSaved: null },
  logs: {},     // strength logs
  mobility: {}, // mobility timers + done state
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
  // Rolling week number; change base date if you want a “fresh start”
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

// -------------------- DOM --------------------
const daySelect = document.getElementById("daySelect");
const modeSelect = document.getElementById("modeSelect");
const resetDayBtn = document.getElementById("resetDayBtn");
const resetWeekBtn = document.getElementById("resetWeekBtn");

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

  render();
  startTick();
}
init();

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

  if (day.main.type === "strength") {
    mainBlock.innerHTML = `
      ${(day.main.exercises || []).map(ex => renderExercise(day.key, ex)).join("")}
      ${renderRestSettings()}
      ${renderProgressionHintStrength()}
    `;
  } else if (day.main.type === "run") {
    const details = mode === "outdoor" ? (day.main.detailsOutdoor || []) : (day.main.detailsTreadmill || []);
    mainBlock.innerHTML = `
      <div class="cardTitle">${escapeHtml(day.main.title || "Run")}</div>
      <ul>${details.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      ${renderProgressionHintRun(day.key)}
      ${day.main.showIntervalTimer ? `
        <div class="hr"></div>
        <div class="cardTitle">Interval Timer</div>
        <div class="muted">Use only for this intervals session.</div>
        ${renderIntervalTimer()}
      ` : ``}
    `;
  } else if (day.main.type === "hiit") {
    mainBlock.innerHTML = `
      <div class="cardTitle">${escapeHtml(day.main.title || "HIIT")}</div>
      <ul>${(day.main.details || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      <div class="hr"></div>
      <div class="muted">Progression: add 1–2 rounds OR shorten “easy” by 5s every 1–2 weeks.</div>
    `;
  } else {
    mainBlock.innerHTML = `
      <div class="cardTitle">Recovery</div>
      <ul>${(day.main.details || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    `;
  }

  mobilityList.innerHTML =
    (day.mobility || []).map(m => renderMobItem(day.key, m)).join("") || `<div class="muted">—</div>`;
}

function renderExercise(dayKey, ex) {
  const wk = getWeekKey();
  const exLog = getLogRef(wk, dayKey, ex.id);

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

  return `
    <div style="margin:10px 0 18px;">
      <div class="exTitle">${escapeHtml(ex.name)}</div>
      <div class="exMeta">${ex.sets} sets · target reps ${ex.targetReps}${ex.note ? ` · ${escapeHtml(ex.note)}` : ""}</div>

      <div class="tableHead">
        <div>#</div><div>kg</div><div>LW</div><div>reps</div><div>LW</div><div>⏱</div><div>✓</div>
      </div>
      ${rows}
    </div>
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

function renderIntervalTimer() {
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
      <div class="row">
        <input id="itWork" type="number" min="10" value="75" style="width:100%;" placeholder="Work (sec)" />
        <input id="itRest" type="number" min="10" value="90" style="width:100%;" placeholder="Rest (sec)" />
      </div>
      <div class="row" style="margin-top:10px;">
        <input id="itRounds" type="number" min="1" value="6" style="width:100%;" placeholder="Rounds" />
        <select id="itAuto" style="width:100%;">
          <option value="on" selected>Auto switch: On</option>
          <option value="off">Auto switch: Off</option>
        </select>
      </div>
    </div>
  `;
}

function renderProgressionHintStrength() {
  return `
    <div class="hr"></div>
    <div class="muted" style="font-weight:900;">
      Strength progression: when you hit target reps for all sets with clean form, add +2.5 kg next week (upper) / +5 kg (lower) OR add +1 rep per set if equipment jumps are too big.
    </div>
  `;
}

function renderProgressionHintRun(dayKey) {
  return `
    <div class="hr"></div>
    <div class="muted" style="font-weight:900;">
      Run progression: keep easy days EASY. Progress intervals by +1 round OR +5–10s work every 1–2 weeks. Long run adds +5 min every 1–2 weeks (then deload).
    </div>
  `;
}

// -------------------- Main render --------------------
function render() {
  renderSession();
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
    if (state.mobility[state.dayKey]) delete state.mobility[state.dayKey];
    saveState();
    render();
  };

  resetWeekBtn.onclick = () => {
    const wk = getWeekKey();
    delete state.logs[wk];
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

  // Done tick -> starts rest timer
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

// -------------------- Interval Timer (Intervals day only) --------------------
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
