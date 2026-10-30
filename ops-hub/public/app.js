/* AI Operations Hub — shared frontend.
   Conversations, source material, and the last decision brief are saved locally
   in this browser. No account or cloud database is required for the demo. */

"use strict";

if (location.protocol === "file:") {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML =
      '<div style="max-width:560px;margin:18vh auto;padding:36px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#17181a">' +
      '<h1 style="font-size:28px;margin-bottom:12px">One quick step</h1>' +
      '<p style="color:#666b73;line-height:1.7">Close this tab and double-click <b style="color:#17181a">start-hub.bat</b> in the ops-hub folder. The private workspace will open itself.</p></div>';
  });
}

const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

const ICONS = {
  legal:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v16"/><path d="M5 6.5h14"/><path d="M7 6.5 4 12.5a3.2 3.2 0 0 0 6 0L7 6.5Z"/><path d="M17 6.5l-3 6a3.2 3.2 0 0 0 6 0l-3-6Z"/><path d="M8.5 21h7"/></svg>',
  bizdev:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  technical:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5 4 12l4 7"/><path d="m16 5 4 7-4 7"/><path d="M13.5 4.5 10.5 19.5"/></svg>',
  hr:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c.6-4 2.8-6 5.5-6s4.9 2 5.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 20c.3-2.7 1.6-4.3 3.6-4.3 1.4 0 2.4.8 2.9 2.3"/></svg>',
};

const AGENT_CONFIG = {
  legal: {
    name: "Legal",
    code: "LEGAL · CONTRACTS & COMPLIANCE",
    brief: "Turn agreements into obligations, protected deadlines, and a clear review path.",
    placeholder: "Paste a contract, NDA, teaming agreement, redlines, or compliance inquiry…",
    actionLabel: "Review contract",
    actionHeading: "Protect the commitment",
    actionHint: "Get the key obligation, highest risk, critical date, and next three moves in one brief.",
    sampleTitle: "Texas staffing agreement",
    greeting: "I’ll stay grounded in this workspace. Ask about a clause, deadline, obligation, or risk—and I’ll remember the conversation when you return.",
    chips: ["What is the most important deadline?", "What needs counsel review?", "What are the next three actions?"],
  },
  bizdev: {
    name: "Business Development",
    code: "GROWTH · CAPTURE & PROPOSALS",
    brief: "Turn an opportunity into a bid decision, P-Win view, and focused capture plan.",
    placeholder: "Paste an RFP summary, opportunity description, pipeline note, or capture plan…",
    actionLabel: "Evaluate opportunity",
    actionHeading: "Choose the right deal",
    actionHint: "See the bid recommendation, P-Win, decisive deadline, capture gaps, and next three moves.",
    sampleTitle: "VA $18M staffing opportunity",
    greeting: "I’ll keep the opportunity context and our conversation together. Ask what drives the decision, what is missing, or what should happen next.",
    chips: ["What are we still waiting on?", "What drives the P-Win?", "What could change the bid decision?"],
  },
  technical: {
    name: "Technical",
    code: "TECHNICAL · PROJECTS & REQUIREMENTS",
    brief: "Turn requirements and meeting notes into decisions, owners, and a plan that can ship.",
    placeholder: "Paste requirements, meeting notes, a bug list, delivery plan, or status update…",
    actionLabel: "Build delivery plan",
    actionHeading: "Make the plan executable",
    actionHint: "See the timeline call, critical blocker, aligned scope, and next three moves first.",
    sampleTitle: "Patient portal migration",
    greeting: "I’ll remember the requirements, decisions, and blockers in this workspace. Ask what is aligned, what is at risk, or who moves next.",
    chips: ["What puts the date at risk?", "Which ideas match the requirements?", "What should happen today?"],
  },
  hr: {
    name: "HR",
    code: "HR · CASES & COMPLIANCE",
    brief: "Turn a people case into a documented process, missing-information list, and safe next step.",
    placeholder: "Paste a case description, accommodation request, job requisition, or provider correspondence…",
    actionLabel: "Assess case",
    actionHeading: "Move the case forward",
    actionHint: "See the case classification, escalation signal, missing documentation, and next three moves.",
    sampleTitle: "Telework accommodation case",
    greeting: "I’ll keep this case and its conversation together in this browser. Ask about process, missing documents, escalation signals, or the next safe step.",
    chips: ["What is the biggest escalation signal?", "Who are we waiting on?", "What should we document today?"],
  },
};

const AGENT_KEYS = Object.keys(AGENT_CONFIG);
const MEMORY_KEY = "-ops-memory-v2";
const MEMORY_VERSION = 2;
const MAX_THREADS_PER_AGENT = 12;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 6000;
const MAX_MESSAGE_TOTAL = 24000;
const MAX_MATERIAL_CHARS = 12000;
let memoryAvailable = true;

function emptyMemoryStore() {
  return {
    version: MEMORY_VERSION,
    conversations: Object.fromEntries(AGENT_KEYS.map((key) => [key, []])),
    active: Object.fromEntries(AGENT_KEYS.map((key) => [key, null])),
  };
}

function newId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function trimMessages(input) {
  const clean = (Array.isArray(input) ? input : [])
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_MESSAGE_CHARS) }))
    .filter((message) => message.content.trim())
    .slice(-MAX_MESSAGES);

  const kept = [];
  let total = 0;
  for (let index = clean.length - 1; index >= 0; index -= 1) {
    const message = clean[index];
    if (total + message.content.length > MAX_MESSAGE_TOTAL) break;
    kept.unshift(message);
    total += message.content.length;
  }
  return kept;
}

function normalizeThread(raw, agent) {
  if (!raw || typeof raw !== "object") return null;
  const now = new Date().toISOString();
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 120) : newId(),
    agent,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 72) : "New conversation",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
    material: typeof raw.material === "string" ? raw.material.slice(0, MAX_MATERIAL_CHARS) : "",
    messages: trimMessages(raw.messages),
    lastRun: raw.lastRun && typeof raw.lastRun === "object" ? raw.lastRun : null,
    guided: raw.guided === true,
  };
}

function readMemoryStore() {
  const fresh = emptyMemoryStore();
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== MEMORY_VERSION) return fresh;
    for (const agent of AGENT_KEYS) {
      const list = parsed.conversations && Array.isArray(parsed.conversations[agent]) ? parsed.conversations[agent] : [];
      fresh.conversations[agent] = list
        .map((thread) => normalizeThread(thread, agent))
        .filter(Boolean)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, MAX_THREADS_PER_AGENT);
      fresh.active[agent] = typeof parsed.active?.[agent] === "string" ? parsed.active[agent] : null;
    }
    return fresh;
  } catch (_) {
    memoryAvailable = false;
    return fresh;
  }
}

function writeMemoryStore(store) {
  if (!memoryAvailable) return false;
  try {
    for (const agent of AGENT_KEYS) store.conversations[agent] = store.conversations[agent].slice(0, MAX_THREADS_PER_AGENT);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(store));
    return true;
  } catch (_) {
    try {
      for (const agent of AGENT_KEYS) store.conversations[agent] = store.conversations[agent].slice(0, 6);
      localStorage.setItem(MEMORY_KEY, JSON.stringify(store));
      return true;
    } catch (_) {
      memoryAvailable = false;
      return false;
    }
  }
}

function createThread(agent) {
  const now = new Date().toISOString();
  return { id: newId(), agent, title: "New conversation", createdAt: now, updatedAt: now, material: "", messages: [], lastRun: null, guided: false };
}

function isMeaningfulThread(thread) {
  return !!(thread && (thread.material.trim() || thread.messages.length || thread.lastRun));
}

function shortTitle(value, fallback = "New conversation") {
  const clean = String(value || "")
    .replace(/^[-#>*\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return fallback;
  return clean.length > 58 ? `${clean.slice(0, 57).trim()}…` : clean;
}

function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());

let HEALTH = { ok: false, demo: true, model: "" };
let toastTimer;

async function checkHealth() {
  const dot = $("#healthDot");
  const label = $("#healthText");
  if (!dot && !label) return;
  let state = "demo";
  let text = "Guided demo · Ready";
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("unavailable");
    HEALTH = await response.json();
    if (HEALTH.ok && HEALTH.modelReady) {
      state = "ok";
      text = "Local model · Ready";
    }
  } catch (_) {
    HEALTH = { ok: false, demo: true, model: "" };
    state = "err";
    text = "Workspace offline";
  }
  if (dot) dot.className = `dot ${state}`;
  if (label) label.textContent = text;
}

checkHealth();
setInterval(checkHealth, 15000);

const AGENT = document.body.dataset.agent;
if (AGENT && AGENT_CONFIG[AGENT]) initAgentPage(AGENT_CONFIG[AGENT]);
else initHomePage();

function initHomePage() {
  const countEl = $("#savedCount");
  if (!countEl) return;
  const store = readMemoryStore();
  const meaningful = AGENT_KEYS.flatMap((agent) => store.conversations[agent]).filter(isMeaningfulThread);
  meaningful.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  countEl.textContent = `${meaningful.length} saved conversation${meaningful.length === 1 ? "" : "s"}`;
  const recent = $("#recentMemory");
  const recentGrid = $("#recentWorkGrid");
  const pageForAgent = { legal: "legal.html", bizdev: "bizdev.html", technical: "technical.html", hr: "hr.html" };

  const decisionSummary = (thread) => {
    const result = thread.lastRun?.result;
    if (!result) return { decision: thread.material.trim() ? "Ready for review" : "Conversation saved", date: "", risk: "" };
    const risks = Array.isArray(result.risks) ? result.risks : [];
    const highRisk = risks.find((risk) => /high/i.test(risk.level || ""));
    const insights = result.agent_insights || {};
    let decision = "Decision brief ready";
    if (thread.agent === "bizdev" && typeof insights.bid_recommendation === "string") {
      decision = insights.bid_recommendation.split(/(?<=\.)\s/)[0].replace(/\.$/, "");
    } else if (thread.agent === "legal" && highRisk) decision = "Review before approval";
    else if (thread.agent === "technical" && highRisk) decision = "The current plan is at risk";
    else if (thread.agent === "hr" && highRisk) decision = "Escalation risk needs action";

    const deadlines = Array.isArray(result.deadlines) ? result.deadlines : [];
    const priorityDates = deadlines.filter((item) => /due|deadline|notice|cutover|proposal|Q&A|ends|expir/i.test(item.label || ""));
    const date = [...(priorityDates.length ? priorityDates : deadlines)].sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
    return { decision, date: date?.date || "", risk: highRisk ? "High risk" : risks.length ? `${risks.length} risks` : "" };
  };

  AGENT_KEYS.forEach((agent) => {
    const savedForAgent = store.conversations[agent].filter(isMeaningfulThread).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const action = document.querySelector(`[data-card-action="${agent}"]`);
    if (action && savedForAgent.length) {
      action.textContent = `Continue: ${savedForAgent[0].title}`;
      const card = action.closest(".agent-card");
      if (card) card.href = `${pageForAgent[agent]}?workspace=${encodeURIComponent(savedForAgent[0].id)}`;
    }
  });

  if (!memoryAvailable) {
    recent.textContent = "Browser storage is unavailable in this session.";
    if (recentGrid) recentGrid.innerHTML = '<div class="recent-empty"><strong>Saved work is unavailable.</strong><p>This browser is not allowing local storage in the current session.</p></div>';
  } else if (meaningful.length) {
    const latest = meaningful[0];
    recent.textContent = `Most recent: ${latest.title} · ${formatWhen(latest.updatedAt)}`;
    if (recentGrid) {
      recentGrid.innerHTML = "";
      meaningful.slice(0, 4).forEach((thread) => {
        const card = document.createElement("a");
        card.className = "recent-work-card";
        card.dataset.theme = thread.agent;
        card.href = `${pageForAgent[thread.agent]}?workspace=${encodeURIComponent(thread.id)}`;

        const top = document.createElement("div");
        top.className = "recent-card-top";
        const agent = document.createElement("span");
        agent.className = "recent-agent";
        agent.textContent = AGENT_CONFIG[thread.agent].name;
        const when = document.createElement("span");
        when.className = "recent-when";
        when.textContent = formatWhen(thread.updatedAt);
        top.append(agent, when);

        const title = document.createElement("h3");
        title.textContent = thread.title;
        const summary = decisionSummary(thread);
        const decision = document.createElement("strong");
        decision.className = "recent-decision";
        decision.textContent = summary.decision;
        const signals = document.createElement("div");
        signals.className = "recent-signals";
        if (summary.date) {
          const date = document.createElement("span");
          date.textContent = summary.date;
          signals.appendChild(date);
        }
        if (summary.risk) {
          const risk = document.createElement("span");
          risk.textContent = summary.risk;
          signals.appendChild(risk);
        }
        const open = document.createElement("span");
        open.className = "recent-open";
        open.innerHTML = 'Resume decision <b aria-hidden="true">→</b>';
        card.append(top, title, decision, signals, open);
        recentGrid.appendChild(card);
      });
    }
  } else if (recentGrid) {
    recentGrid.innerHTML =
      '<div class="recent-empty"><div><strong>No saved work yet.</strong><p>Try the guided $18M opportunity. It will return here with its source and decision brief intact.</p></div>' +
      '<a class="btn primary" href="bizdev.html?demo=1">Try the opportunity</a></div>';
  }
}

function initAgentPage(cfg) {
  const material = $("#material");
  const log = $("#chatLog");
  const output = $("#output");
  const sourceCard = document.querySelector(".source-card");
  const sourceToggleBtn = $("#sourceToggleBtn");
  const memoryDrawer = $("#memoryDrawer");
  const drawerBackdrop = $("#drawerBackdrop");
  const historyList = $("#historyList");
  const initialParams = new URLSearchParams(location.search);
  const shouldLoadDemo = initialParams.get("demo") === "1";
  let store = readMemoryStore();
  let conversations = store.conversations[AGENT];
  const requestedThread = initialParams.get("workspace");
  let activeThread =
    conversations.find((thread) => thread.id === requestedThread) ||
    conversations.find((thread) => thread.id === store.active[AGENT]) ||
    conversations[0];
  if (!activeThread) {
    activeThread = createThread(AGENT);
    conversations.unshift(activeThread);
  }
  let messages = trimMessages(activeThread.messages);
  let lastCalendar = null;
  let busy = false;
  let saveTimer;
  let thinkingTimer;

  $("#agentName").textContent = cfg.name;
  $("#agentCode").textContent = cfg.code;
  $("#agentBrief").textContent = cfg.brief;
  $("#agentIcon").innerHTML = ICONS[AGENT];
  $("#actionHeading").textContent = cfg.actionHeading;
  $("#actionHint").textContent = cfg.actionHint;
  $("#primaryAction").textContent = cfg.actionLabel;
  material.placeholder = cfg.placeholder;
  document.title = `${cfg.name} Workspace — AI Operations Hub`;
  document.querySelectorAll("[data-agent-link]").forEach((link) => {
    const active = link.dataset.agentLink === AGENT;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
  });

  function syncThread({ touch = true } = {}) {
    activeThread.material = material.value.slice(0, MAX_MATERIAL_CHARS);
    activeThread.messages = trimMessages(messages);
    messages = activeThread.messages;
    if (activeThread.title === "New conversation") {
      const firstUser = messages.find((message) => message.role === "user");
      if (firstUser) activeThread.title = shortTitle(firstUser.content);
      else if (activeThread.material.trim()) activeThread.title = shortTitle(activeThread.material.split(/\r?\n/).find((line) => line.trim()));
    }
    if (touch) activeThread.updatedAt = new Date().toISOString();
    conversations = conversations.filter((thread) => thread.id !== activeThread.id);
    conversations.unshift(activeThread);
    conversations = conversations.slice(0, MAX_THREADS_PER_AGENT);
    store.conversations[AGENT] = conversations;
    store.active[AGENT] = activeThread.id;
    const saved = writeMemoryStore(store);
    updateMemoryLabel(saved);
    renderHistory();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => syncThread(), 350);
  }

  function updateMemoryLabel(saved = memoryAvailable) {
    const meaningfulCount = conversations.filter(isMeaningfulThread).length;
    $("#memoryCount").textContent = saved ? `Memory · ${meaningfulCount}` : "Memory unavailable";
    const note = document.querySelector(".autosave-note");
    if (note) {
      note.innerHTML = saved
        ? '<span class="save-check">✓</span> Workspace saves automatically in this browser'
        : '<span class="save-check warn">!</span> Browser storage is unavailable';
    }
  }

  function setUrlThread() {
    try {
      const url = new URL(location.href);
      url.searchParams.delete("demo");
      url.searchParams.set("workspace", activeThread.id);
      history.replaceState(null, "", url);
    } catch (_) {
      /* URL state is optional */
    }
  }

  function updateCount() {
    const length = material.value.length;
    $("#charCount").textContent = `${length.toLocaleString()} / ${MAX_MATERIAL_CHARS.toLocaleString()}`;
    $("#charCount").classList.toggle("near-limit", length > MAX_MATERIAL_CHARS * 0.88);
    $("#sampleBtn").classList.toggle("attention", !material.value.trim());
  }

  function addBubble(role, text, extraClass = "") {
    const bubble = document.createElement("div");
    bubble.className = `msg ${role}${extraClass ? ` ${extraClass}` : ""}`;
    bubble.textContent = text;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function renderTranscript() {
    log.innerHTML = "";
    addBubble("ai", cfg.greeting, "greeting");
    messages.forEach((message) => addBubble(message.role === "assistant" ? "ai" : "user", message.content));
  }

  function resetOutput() {
    lastCalendar = null;
    $("#copyBtn").hidden = true;
    $("#icsBtn").hidden = true;
    $("#modeBadge").hidden = true;
    $("#runStatus").textContent = "Ready when you are";
    $("#runModel").textContent = memoryAvailable ? "Saved locally" : "Not saved";
    output.innerHTML =
      '<div class="empty"><div class="empty-mark">✦</div><p class="empty-title">The decision will appear here.</p>' +
      '<p>Load the example or add your own material, then run the review. The recommendation comes first; evidence stays one click away.</p></div>';
  }

  function applyGuidedLayout() {
    const guided = activeThread.guided === true;
    document.body.classList.toggle("guided-view", guided);
    if (sourceToggleBtn) sourceToggleBtn.hidden = !guided;
    if (!guided && sourceCard) sourceCard.classList.remove("is-visible");
    if (sourceToggleBtn) sourceToggleBtn.textContent = sourceCard?.classList.contains("is-visible") ? "Hide source" : "View source";
  }

  function restoreThread(thread) {
    activeThread = thread;
    messages = trimMessages(thread.messages);
    material.value = thread.material || "";
    applyGuidedLayout();
    updateCount();
    renderTranscript();
    if (thread.lastRun?.result) {
      lastCalendar = { deadlines: thread.lastRun.result.deadlines || [], reminders: thread.lastRun.reminders || [] };
      renderOutput(thread.lastRun.result, thread.lastRun.reminders || [], !!thread.lastRun.demo);
      $("#runStatus").textContent = `Restored · ${formatWhen(thread.lastRun.ranAt || thread.updatedAt)}`;
      $("#runModel").textContent = thread.lastRun.demo ? "Guided demo" : thread.lastRun.model || "Private AI";
    } else {
      resetOutput();
    }
    store.active[AGENT] = thread.id;
    writeMemoryStore(store);
    updateMemoryLabel();
    renderHistory();
    setUrlThread();
  }

  function startNewThread() {
    if (busy) return toast("Let the current request finish first.");
    syncThread();
    const blank = createThread(AGENT);
    conversations.unshift(blank);
    activeThread = blank;
    messages = [];
    store.conversations[AGENT] = conversations.slice(0, MAX_THREADS_PER_AGENT);
    restoreThread(blank);
    closeMemory();
    material.focus();
    toast("New conversation ready", "info");
  }

  function renderHistory() {
    const ordered = [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    historyList.innerHTML = "";
    ordered.forEach((thread) => {
      const row = document.createElement("div");
      row.className = `history-row${thread.id === activeThread.id ? " active" : ""}`;

      const open = document.createElement("button");
      open.type = "button";
      open.className = "history-entry";
      open.dataset.threadId = thread.id;
      const title = document.createElement("strong");
      title.textContent = thread.title;
      const meta = document.createElement("span");
      const turnCount = thread.messages.filter((message) => message.role === "user").length;
      meta.textContent = `${formatWhen(thread.updatedAt)} · ${turnCount} follow-up${turnCount === 1 ? "" : "s"}`;
      open.append(title, meta);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-delete";
      remove.dataset.deleteThread = thread.id;
      remove.setAttribute("aria-label", `Delete ${thread.title}`);
      remove.textContent = "×";
      row.append(open, remove);
      historyList.appendChild(row);
    });
  }

  function openMemory() {
    memoryDrawer.classList.add("is-open");
    drawerBackdrop.classList.add("is-open");
    memoryDrawer.setAttribute("aria-hidden", "false");
    $("#memoryBtn").setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-open");
    renderHistory();
  }

  function closeMemory() {
    memoryDrawer.classList.remove("is-open");
    drawerBackdrop.classList.remove("is-open");
    memoryDrawer.setAttribute("aria-hidden", "true");
    $("#memoryBtn").setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");
  }

  material.addEventListener("input", () => {
    if (activeThread.guided) {
      activeThread.guided = false;
      applyGuidedLayout();
    }
    updateCount();
    scheduleSave();
  });

  function loadFile(file) {
    if (!file) return;
    if (!/\.(txt|md|text|markdown)$/i.test(file.name)) return toast("Use a .txt or .md file for this demo.");
    const reader = new FileReader();
    reader.onload = () => {
      const addition = `--- ${file.name} ---\n${String(reader.result || "")}`;
      const combined = `${material.value}${material.value ? "\n\n" : ""}${addition}`;
      material.value = combined.slice(0, MAX_MATERIAL_CHARS);
      activeThread.guided = false;
      applyGuidedLayout();
      if (activeThread.title === "New conversation") activeThread.title = shortTitle(file.name.replace(/\.[^.]+$/, ""));
      updateCount();
      syncThread();
      toast(combined.length > MAX_MATERIAL_CHARS ? "Loaded the first 12,000 characters" : `Loaded ${file.name}`, "info");
    };
    reader.readAsText(file);
  }

  $("#fileInput").addEventListener("change", (event) => {
    loadFile(event.target.files[0]);
    event.target.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) =>
    material.addEventListener(eventName, (event) => {
      event.preventDefault();
      material.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((eventName) =>
    material.addEventListener(eventName, (event) => {
      event.preventDefault();
      material.classList.remove("dragover");
      if (eventName === "drop" && event.dataTransfer.files.length) loadFile(event.dataTransfer.files[0]);
    })
  );

  async function loadSample() {
    try {
      const response = await fetch(`/api/sample/${AGENT}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Example unavailable");
      material.value = data.text.trim().slice(0, MAX_MATERIAL_CHARS);
      activeThread.title = cfg.sampleTitle;
      activeThread.lastRun = null;
      activeThread.guided = true;
      applyGuidedLayout();
      updateCount();
      resetOutput();
      syncThread();
      setUrlThread();
      toast(`${cfg.sampleTitle} loaded`, "info");
      return true;
    } catch (error) {
      toast(error.message);
      return false;
    }
  }

  $("#sampleBtn").addEventListener("click", loadSample);
  const samBtn = $("#samFetchBtn");
  const samInput = $("#samQueryInput");
  if (samBtn && samInput) {
    const fetchFromSam = async () => {
      const q = samInput.value.trim();
      if (!q) return toast("Enter a SAM.gov URL, Notice ID, Solicitation #, or keyword first.");
      if (busy) return toast("One moment—the workspace is still working.");
      const origLabel = samBtn.textContent;
      samBtn.disabled = true;
      samBtn.textContent = "Fetching…";
      try {
        const response = await fetch(`/api/sam?q=${encodeURIComponent(q)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `SAM.gov error (${response.status})`);
        material.value = (data.text || "").trim().slice(0, MAX_MATERIAL_CHARS);
        activeThread.title = shortTitle(data.title || data.solicitationNumber || "SAM.gov opportunity");
        activeThread.lastRun = null;
        activeThread.guided = false;
        applyGuidedLayout();
        updateCount();
        resetOutput();
        syncThread();
        setUrlThread();
        toast(`Loaded ${data.solicitationNumber || "SAM.gov opportunity"}`, "info");
      } catch (error) {
        toast(error.message);
      } finally {
        samBtn.disabled = false;
        samBtn.textContent = origLabel;
      }
    };
    samBtn.addEventListener("click", fetchFromSam);
    samInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        fetchFromSam();
      }
    });
  }
  $("#clearBtn").addEventListener("click", () => {
    material.value = "";
    activeThread.lastRun = null;
    activeThread.guided = false;
    applyGuidedLayout();
    updateCount();
    resetOutput();
    syncThread();
    material.focus();
  });

  const chips = $("#chips");
  cfg.chips.forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = label;
    button.addEventListener("click", () => {
      $("#chatText").value = label;
      $("#chatText").focus();
    });
    chips.appendChild(button);
  });

  $("#chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("#chatText");
    const question = input.value.trim();
    if (!question) return;
    if (busy) return toast("One moment—the workspace is still working.");

    input.value = "";
    busy = true;
    $("#sendBtn").disabled = true;
    messages.push({ role: "user", content: question.slice(0, MAX_MESSAGE_CHARS) });
    messages = trimMessages(messages);
    addBubble("user", question);
    if (activeThread.title === "New conversation") activeThread.title = shortTitle(question);
    syncThread();

    const answerBubble = addBubble("ai", "");
    answerBubble.classList.add("typing");
    let full = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: AGENT, messages: trimMessages(messages), context: material.value, guided: activeThread.guided === true }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Request failed (${response.status})`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        answerBubble.textContent = full;
        log.scrollTop = log.scrollHeight;
      }
      if (!full.trim()) full = "No response returned.";
      answerBubble.textContent = full;
      messages.push({ role: "assistant", content: full.slice(0, MAX_MESSAGE_CHARS) });
      messages = trimMessages(messages);
      syncThread();
    } catch (error) {
      if (full.trim()) {
        answerBubble.textContent = `${full}\n\nConnection paused before the answer finished.`;
        messages.push({ role: "assistant", content: full.slice(0, MAX_MESSAGE_CHARS) });
        messages = trimMessages(messages);
        syncThread();
      } else {
        answerBubble.textContent = `I couldn’t complete that answer. ${error.message}`;
        answerBubble.classList.add("error");
      }
    } finally {
      answerBubble.classList.remove("typing");
      busy = false;
      $("#sendBtn").disabled = false;
      log.scrollTop = log.scrollHeight;
    }
  });

  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => runAction(button)));

  const THINKING = ["Reading the source…", "Finding the decision…", "Checking risk and dates…", "Building the next moves…"];

  function renderSkeleton() {
    $("#copyBtn").hidden = true;
    $("#icsBtn").hidden = true;
    $("#modeBadge").hidden = true;
    $("#runStatus").textContent = THINKING[0];
    $("#runModel").textContent = HEALTH.ok && HEALTH.modelReady ? "Private AI" : "Guided demo";
    output.innerHTML =
      '<div class="decision-skeleton"><div class="sk sk-label"></div><div class="sk sk-title"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div><div class="sk-metrics"><i></i><i></i><i></i></div></div>';
    let index = 0;
    clearInterval(thinkingTimer);
    thinkingTimer = setInterval(() => {
      index = (index + 1) % THINKING.length;
      $("#runStatus").textContent = THINKING[index];
    }, 2200);
  }

  async function runAction(button, options = {}) {
    if (busy) return toast("One moment—the workspace is still working.");
    const source = material.value.trim();
    if (!source) {
      toast("Add source material or load the example first.");
      material.focus();
      return;
    }
    busy = true;
    const original = button.textContent;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Reviewing';
    renderSkeleton();
    const startedAt = Date.now();
    try {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: AGENT, action: button.dataset.action, text: source, guided: options.guided ?? activeThread.guided === true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      lastCalendar = { deadlines: data.result.deadlines || [], reminders: data.reminders || [] };
      activeThread.lastRun = {
        result: data.result,
        reminders: data.reminders || [],
        demo: !!data.demo,
        model: data.model || "Private AI",
        action: button.dataset.action,
        ranAt: new Date().toISOString(),
      };
      renderOutput(data.result, data.reminders || [], !!data.demo);
      $("#runStatus").textContent = `Brief ready · ${duration}s`;
      $("#runModel").textContent = data.demo ? "Guided demo scenario" : data.model || "Private AI";
      syncThread();
    } catch (error) {
      output.innerHTML =
        `<div class="analysis-unavailable"><div class="empty-mark">!</div><p class="empty-title">Live analysis is not available for this material.</p>` +
        `<p>${esc(error.message)}</p><button class="btn primary" id="loadExampleAfterError" type="button">Load the guided example</button></div>`;
      $("#runStatus").textContent = "Review not completed";
      $("#runModel").textContent = "No result saved";
      const exampleButton = $("#loadExampleAfterError");
      if (exampleButton) exampleButton.addEventListener("click", loadSample);
      toast("The guided demo only analyzes its matching example. Start the private AI for custom material.");
    } finally {
      clearInterval(thinkingTimer);
      busy = false;
      button.disabled = false;
      button.textContent = original;
    }
  }

  function riskLevel(risk) {
    if (/high/i.test(risk.level || "")) return "high";
    if (/low/i.test(risk.level || "")) return "low";
    return "medium";
  }

  function decisionHeadline(result) {
    const insights = result.agent_insights || {};
    const highCount = (result.risks || []).filter((risk) => riskLevel(risk) === "high").length;
    if (AGENT === "bizdev" && typeof insights.bid_recommendation === "string") {
      return insights.bid_recommendation.split(/(?<=\.)\s/)[0].replace(/\.$/, "");
    }
    if (AGENT === "legal") return highCount ? "Review before approval" : "Commitments are clear";
    if (AGENT === "technical") return highCount ? "The current plan is at risk" : "Delivery plan is ready";
    if (AGENT === "hr") return highCount ? "Escalation risk needs action" : "The case can move forward";
    return "Decision brief ready";
  }

  function summaryExcerpt(value) {
    const text = String(value || "").trim();
    if (text.length <= 520) return text;
    const slice = text.slice(0, 520);
    const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "));
    return `${slice.slice(0, lastStop > 260 ? lastStop + 1 : 517).trim()}…`;
  }

  function renderOutput(result, reminders, isDemo) {
    result = {
      summary: typeof result.summary === "string" ? result.summary : "",
      deadlines: Array.isArray(result.deadlines) ? result.deadlines : [],
      risks: Array.isArray(result.risks) ? result.risks : [],
      missing_info: Array.isArray(result.missing_info) ? result.missing_info : [],
      next_steps: Array.isArray(result.next_steps) ? result.next_steps : [],
      agent_insights: result.agent_insights && typeof result.agent_insights === "object" ? result.agent_insights : {},
    };
    const highRisks = result.risks.filter((risk) => riskLevel(risk) === "high");
    const decisionDates = result.deadlines.filter((deadline) => /due|deadline|notice|cutover|proposal|Q&A|ends|expir/i.test(deadline.label || ""));
    const nextDeadline = result.deadlines.length
      ? [...(decisionDates.length ? decisionDates : result.deadlines)].sort((a, b) => String(a.date).localeCompare(String(b.date)))[0]
      : null;
    const pwin = Number(result.agent_insights.p_win);
    const metrics = [];
    if (Number.isFinite(pwin)) metrics.push(`<div class="decision-metric"><strong>${Math.max(0, Math.min(100, Math.round(pwin)))}%</strong><span>P-Win estimate</span></div>`);
    metrics.push(`<div class="decision-metric"><strong>${highRisks.length}</strong><span>High-risk item${highRisks.length === 1 ? "" : "s"}</span></div>`);
    if (nextDeadline) metrics.push(`<div class="decision-metric"><strong>${esc(nextDeadline.date)}</strong><span>Critical date</span></div>`);
    else metrics.push(`<div class="decision-metric"><strong>${result.missing_info.length}</strong><span>Open information gap${result.missing_info.length === 1 ? "" : "s"}</span></div>`);
    if (metrics.length < 3) metrics.push(`<div class="decision-metric"><strong>${result.next_steps.length}</strong><span>Prioritized next moves</span></div>`);

    const topMoves = result.next_steps.slice(0, 3);
    const panels = [];
    if (result.risks.length) {
      panels.push(
        detailPanel(
          `Risks and evidence · ${result.risks.length}`,
          `<div class="risk-list">${result.risks
            .map((risk) => `<div class="risk-row"><span class="badge ${riskLevel(risk)}">${esc(risk.level || "Medium")}</span><p>${esc(risk.text)}</p></div>`)
            .join("")}</div>`
        )
      );
    }
    if (result.deadlines.length || reminders.length) {
      const deadlineRows = result.deadlines
        .map((deadline) => `<div class="evidence-row"><span class="date-chip">${esc(deadline.date)}</span><span>${esc(deadline.label)}</span></div>`)
        .join("");
      const reminderRows = reminders
        .map((reminder) => `<div class="evidence-row muted-row"><span class="date-chip">${esc(reminder.date)}</span><span>${esc(reminder.label)}</span></div>`)
        .join("");
      panels.push(
        detailPanel(
          `Dates · ${result.deadlines.length} deadline${result.deadlines.length === 1 ? "" : "s"} · ${reminders.length} reminders prepared`,
          `<div class="evidence-list">${deadlineRows}${reminderRows}</div>`
        )
      );
    }
    if (result.missing_info.length) {
      panels.push(
        detailPanel(
          `Missing information · ${result.missing_info.length}`,
          `<div class="tag-list">${result.missing_info.map((item) => `<span class="tag">${esc(item)}</span>`).join("")}</div>`
        )
      );
    }
    const insights = renderInsights(result.agent_insights);
    if (insights) panels.push(detailPanel("Supporting analysis", insights));

    output.innerHTML =
      `<section class="executive-answer"><p class="answer-label">RECOMMENDATION</p><h3>${esc(decisionHeadline(result))}</h3>` +
      `<p class="answer-summary">${esc(summaryExcerpt(result.summary))}</p><div class="decision-metrics">${metrics.join("")}</div></section>` +
      (topMoves.length
        ? `<section class="top-moves"><div class="section-title-row"><p class="answer-label">NEXT THREE MOVES</p><span>In order</span></div><ol>${topMoves
            .map((step) => `<li><span></span><p>${esc(step)}</p></li>`)
            .join("")}</ol></section>`
        : "") +
      `<div class="evidence-panels">${panels.join("")}</div>`;

    $("#modeBadge").hidden = !isDemo;
    $("#modeBadge").textContent = "Guided demo";
    $("#copyBtn").hidden = false;
    $("#icsBtn").hidden = !(lastCalendar && (lastCalendar.deadlines.length || lastCalendar.reminders.length));
  }

  function detailPanel(label, content) {
    return `<details class="evidence-panel"><summary><span>${esc(label)}</span><i aria-hidden="true"></i></summary><div class="evidence-content">${content}</div></details>`;
  }

  function renderInsights(insights) {
    if (!insights || typeof insights !== "object") return "";
    const parts = [];
    if (insights.swot && typeof insights.swot === "object") {
      const swotCell = (key, label) => {
        const items = Array.isArray(insights.swot[key]) ? insights.swot[key] : [];
        return `<div class="swot-cell"><h4>${label}</h4><ul>${items.map((item) => `<li>${esc(item)}</li>`).join("") || "<li>—</li>"}</ul></div>`;
      };
      parts.push(`<div class="swot">${swotCell("strengths", "Strengths")}${swotCell("weaknesses", "Weaknesses")}${swotCell("opportunities", "Opportunities")}${swotCell("threats", "Threats")}</div>`);
    }
    if (Array.isArray(insights.timeline) && insights.timeline.length) {
      parts.push(
        `<div class="timeline-list">${insights.timeline
          .map((item) => `<div><span>${esc(item.phase || String(item))}</span><strong>${esc(item.days ?? "?")}d + ${esc(item.buffer_days ?? 0)}d buffer</strong></div>`)
          .join("")}</div>`
      );
    }
    const skip = new Set(["p_win", "bid_recommendation", "swot", "timeline"]);
    const generic = [];
    Object.entries(insights).forEach(([key, value]) => {
      if (skip.has(key)) return;
      const label = key.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
      if (Array.isArray(value) && value.length) {
        generic.push(`<div class="insight-block"><h4>${esc(label)}</h4><ul>${value.map((item) => `<li>${esc(typeof item === "object" ? JSON.stringify(item) : item)}</li>`).join("")}</ul></div>`);
      } else if (typeof value === "string" && value.trim()) {
        generic.push(`<div class="insight-block"><h4>${esc(label)}</h4><p>${esc(value)}</p></div>`);
      }
    });
    if (generic.length) parts.push(`<div class="insight-grid">${generic.join("")}</div>`);
    return parts.join("");
  }

  function formatResultText(run) {
    if (!run?.result) return "";
    const result = run.result;
    const lines = [decisionHeadline(result), "", result.summary || ""];
    if (result.next_steps?.length) lines.push("", "NEXT MOVES", ...result.next_steps.map((step, index) => `${index + 1}. ${step}`));
    if (result.risks?.length) lines.push("", "RISKS", ...result.risks.map((risk) => `- [${risk.level || "Medium"}] ${risk.text}`));
    if (result.deadlines?.length) lines.push("", "DEADLINES", ...result.deadlines.map((deadline) => `- ${deadline.date}: ${deadline.label}`));
    if (run.reminders?.length) lines.push("", "REMINDERS PREPARED", ...run.reminders.map((reminder) => `- ${reminder.date}: ${reminder.label}`));
    if (result.missing_info?.length) lines.push("", "MISSING INFORMATION", ...result.missing_info.map((item) => `- ${item}`));
    return lines.join("\n");
  }

  $("#copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(formatResultText(activeThread.lastRun));
      toast("Decision brief copied", "info");
    } catch (_) {
      toast("Copy is unavailable. Select the text manually.");
    }
  });

  $("#icsBtn").addEventListener("click", () => {
    if (!lastCalendar) return;
    const events = [
      ...lastCalendar.deadlines.map((deadline) => ({ date: deadline.date, title: `DEADLINE: ${deadline.label}` })),
      ...lastCalendar.reminders.map((reminder) => ({ date: reminder.date, title: `Reminder: ${reminder.label}` })),
    ].filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date));
    const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
    const runId = Math.random().toString(36).slice(2, 8);
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ops Hub//EN"];
    events.forEach((event, index) => {
      lines.push(
        "BEGIN:VEVENT",
        `UID:ops-${stamp}-${runId}-${index}@opshub.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`,
        `SUMMARY:${event.title.replace(/\\/g, "\\\\").replace(/[\r\n]+/g, " ").replace(/,/g, "\\,").replace(/;/g, "\\;")}`,
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    const fold = (line) => {
      const folded = [];
      let remaining = line;
      while (remaining.length > 73) {
        folded.push(remaining.slice(0, 73));
        remaining = ` ${remaining.slice(73)}`;
      }
      folded.push(remaining);
      return folded.join("\r\n");
    };
    const blob = new Blob([lines.map(fold).join("\r\n")], { type: "text/calendar" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${AGENT}-decision-reminders.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast(`${events.length} calendar items prepared`, "info");
  });

  $("#memoryBtn").addEventListener("click", openMemory);
  $("#closeMemoryBtn").addEventListener("click", closeMemory);
  drawerBackdrop.addEventListener("click", closeMemory);
  $("#newChatBtn").addEventListener("click", startNewThread);
  $("#drawerNewBtn").addEventListener("click", startNewThread);
  if (sourceToggleBtn) {
    sourceToggleBtn.addEventListener("click", () => {
      const visible = sourceCard.classList.toggle("is-visible");
      sourceToggleBtn.textContent = visible ? "Hide source" : "View source";
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && memoryDrawer.classList.contains("is-open")) closeMemory();
  });

  historyList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-thread]");
    if (deleteButton) {
      const id = deleteButton.dataset.deleteThread;
      const thread = conversations.find((item) => item.id === id);
      if (!thread || !confirm(`Delete “${thread.title}” from this browser?`)) return;
      conversations = conversations.filter((item) => item.id !== id);
      store.conversations[AGENT] = conversations;
      if (id === activeThread.id) {
        const replacement = conversations[0] || createThread(AGENT);
        if (!conversations.length) conversations.push(replacement);
        restoreThread(replacement);
      } else {
        writeMemoryStore(store);
        renderHistory();
        updateMemoryLabel();
      }
      toast("Conversation deleted", "info");
      return;
    }
    const openButton = event.target.closest("[data-thread-id]");
    if (!openButton) return;
    syncThread();
    const selected = conversations.find((thread) => thread.id === openButton.dataset.threadId);
    if (selected) {
      restoreThread(selected);
      closeMemory();
    }
  });

  $("#clearHistoryBtn").addEventListener("click", () => {
    if (!confirm(`Delete every saved ${cfg.name} conversation from this browser?`)) return;
    const blank = createThread(AGENT);
    conversations = [blank];
    store.conversations[AGENT] = conversations;
    activeThread = blank;
    restoreThread(blank);
    closeMemory();
    toast("Workspace history cleared", "info");
  });

  activeThread.messages = messages;
  restoreThread(activeThread);
  syncThread({ touch: false });

  if (shouldLoadDemo) {
    (async () => {
      if (isMeaningfulThread(activeThread) && !activeThread.guided) startNewThread();
      const ready = activeThread.guided && material.value.trim() ? true : await loadSample();
      if (ready && !activeThread.lastRun?.result) await runAction($("#primaryAction"), { guided: true });
    })();
  }
}

function toast(message, kind) {
  const element = $("#toast");
  if (!element) return;
  element.textContent = message;
  element.className = `toast${kind === "info" ? " info" : ""}`;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (element.hidden = true), 4200);
}
