// server.js — AI Operations Hub backend
// Zero dependencies: Node 18+ built-in http + fetch. One Ollama install, four agents (prompts.js).
// Auto-detects the best installed model; falls back to offline demo mode (demo.js) when
// Ollama is unreachable — the demo never dies. Force it with DEMO=1.
// Run: node server.js   →   http://localhost:3000

const http = require("http");
const fs = require("fs");
const path = require("path");
const { AGENTS, ACTIONS, SCHEMA_INSTRUCTIONS } = require("./prompts");
const { demoAction, demoChatReply } = require("./demo");

const PORT = process.env.PORT || 3000;
// Keep the hub private to this computer unless the operator deliberately opts in
// to another interface (for example HOST=0.0.0.0 on a trusted network).
const HOST = (process.env.HOST || "127.0.0.1").trim() || "127.0.0.1";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL_ENV = (process.env.MODEL || "").trim(); // optional pin; otherwise auto-detect
// trim: `set DEMO=1 && node ...` in cmd yields "1 " (trailing space) — accept it
const FORCE_DEMO = (process.env.DEMO || "").trim() === "1";
const OPEN_BROWSER = (process.env.OPEN || "").trim() === "1";
const MAX_CONTEXT_CHARS = 12000;
const MAX_ACTION_CHARS = 12000;
const MAX_CHAT_MESSAGES = 40;
const MAX_CHAT_MESSAGE_CHARS = 6000;
const MAX_CHAT_AGGREGATE_CHARS = 24000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DEMO_DATA_DIR = path.join(__dirname, "demo-data");

// Preferred models, best-first. Anything installed beats demo mode.
const MODEL_PREFERENCE = ["llama3.1:8b", "llama3.1", "llama3.2", "llama3", "qwen2.5", "mistral", "gemma"];

const SAMPLE_FILES = {
  legal: "1-legal-sample-contract.txt",
  bizdev: "2-bizdev-sample-rfp.txt",
  technical: "3-technical-sample-meeting.txt",
  hr: "4-hr-sample-case.txt",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

// ---------- helpers ----------

function applySecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
  );
}

function cleanPlainText(value) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

function validationError(error, status = 400) {
  return { ok: false, error, status };
}

function sanitizeChatMessages(input) {
  if (!Array.isArray(input)) return validationError("messages must be an array.");
  if (input.length === 0) return validationError("Send at least one user message.");
  if (input.length > MAX_CHAT_MESSAGES) {
    return validationError(`Conversation exceeds the ${MAX_CHAT_MESSAGES}-message limit.`, 413);
  }

  const messages = [];
  let aggregateChars = 0;
  for (let i = 0; i < input.length; i += 1) {
    const message = input[i];
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return validationError(`messages[${i}] must be an object.`);
    }
    if (message.role !== "user" && message.role !== "assistant") {
      return validationError(`messages[${i}].role must be "user" or "assistant".`);
    }
    if (typeof message.content !== "string") {
      return validationError(`messages[${i}].content must be a string.`);
    }

    const content = cleanPlainText(message.content);
    if (!content) return validationError(`messages[${i}].content cannot be empty.`);
    if (content.length > MAX_CHAT_MESSAGE_CHARS) {
      return validationError(
        `messages[${i}].content exceeds the ${MAX_CHAT_MESSAGE_CHARS}-character limit.`,
        413
      );
    }
    aggregateChars += content.length;
    if (aggregateChars > MAX_CHAT_AGGREGATE_CHARS) {
      return validationError(
        `Conversation exceeds the ${MAX_CHAT_AGGREGATE_CHARS}-character total limit.`,
        413
      );
    }
    messages.push({ role: message.role, content });
  }

  if (messages[messages.length - 1].role !== "user") {
    return validationError("The final message must be from the user.");
  }
  return { ok: true, value: messages };
}

function sanitizeLimitedText(value, field, maxChars, allowEmpty = true) {
  if (typeof value !== "string") return validationError(`${field} must be a string.`);
  const text = cleanPlainText(value);
  if (!allowEmpty && !text) return validationError("Paste or upload some material first.");
  if (text.length > maxChars) {
    return validationError(`${field} exceeds the ${maxChars}-character limit.`, 413);
  }
  return { ok: true, value: text };
}

function isAllowedRequestHost(hostHeader) {
  if (!hostHeader) return false;
  if (HOST === "0.0.0.0" || HOST === "::") return true;
  try {
    const requested = new URL(`http://${hostHeader}`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const configured = HOST.replace(/^\[|\]$/g, "").toLowerCase();
    const loopbackNames = new Set(["127.0.0.1", "::1", "localhost", "localhost."]);
    if (loopbackNames.has(configured)) return loopbackNames.has(requested);
    return requested === configured;
  } catch (_) {
    return false;
  }
}

function isSameOriginPost(req) {
  if ((req.headers["sec-fetch-site"] || "").toLowerCase() === "cross-site") return false;
  const origin = req.headers.origin;
  if (!isAllowedRequestHost(req.headers.host)) return false;
  if (!origin) return true; // permit local scripts/curl; browsers send Origin on POST
  try {
    const source = new URL(origin);
    const target = new URL(`http://${req.headers.host}`);
    return source.protocol === target.protocol && source.host === target.host;
  } catch (_) {
    return false;
  }
}

function normalizeSampleText(value) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

const sampleTextCache = new Map();
function matchesBundledSample(agent, text) {
  const file = SAMPLE_FILES[agent];
  if (!file) return false;
  try {
    if (!sampleTextCache.has(agent)) {
      const sample = fs.readFileSync(path.join(DEMO_DATA_DIR, file), "utf8");
      sampleTextCache.set(agent, normalizeSampleText(sample));
    }
    return normalizeSampleText(text) === sampleTextCache.get(agent);
  } catch (err) {
    console.error(`Could not read bundled sample for ${agent}:`, err.message);
    return false;
  }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on("data", (c) => {
      if (tooLarge) return;
      size += c.length;
      if (size > limit) {
        tooLarge = true;
        reject(new Error("Payload too large"));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!tooLarge) resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

// Probe Ollama and pick the best installed model. Cached 5s so chat/action
// requests don't pay a probe round-trip each time.
// Returns { online, model, installed }; model is null if nothing usable is installed.
let probeCache = { at: 0, value: null };
async function probeOllama() {
  if (FORCE_DEMO) return { online: false, model: null, installed: [] };
  if (probeCache.value && Date.now() - probeCache.at < 5000) return probeCache.value;
  const result = await doProbe();
  probeCache = { at: Date.now(), value: result };
  return result;
}

async function doProbe() {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
    const data = await r.json();
    const installed = (data.models || []).map((m) => m.name);
    let model = null;
    if (MODEL_ENV) {
      const base = MODEL_ENV.split(":")[0];
      model = installed.find((n) => n === MODEL_ENV || n.startsWith(base + ":")) || null;
    }
    if (!model) {
      for (const pref of MODEL_PREFERENCE) {
        model = installed.find((n) => n === pref || n.startsWith(pref)) || null;
        if (model) break;
      }
    }
    if (!model && installed.length) model = installed[0];
    return { online: true, model, installed };
  } catch (_) {
    return { online: false, model: null, installed: [] };
  }
}

function buildSystem(agentKey, context) {
  const agent = AGENTS[agentKey];
  if (!agent) return null;
  let sys = agent.system;
  if (context && context.trim()) {
    sys += `\n\n=== REFERENCE MATERIAL PROVIDED BY THE USER ===\n${context.slice(0, MAX_CONTEXT_CHARS)}\n=== END REFERENCE MATERIAL ===`;
  }
  return sys;
}

// Extract a JSON object even if the model wrapped it in prose/fences.
function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

// Deterministic reminder math: 6 / 3 / 1 months before each deadline (skip past dates).
function computeReminders(deadlines) {
  const reminders = [];
  const now = new Date();
  for (const d of deadlines || []) {
    const due = new Date(`${d.date}T12:00:00`);
    if (isNaN(due.getTime())) continue;
    for (const months of [6, 3, 1]) {
      const r = new Date(due);
      const day = r.getDate();
      r.setMonth(r.getMonth() - months);
      if (r.getDate() !== day) r.setDate(0); // clamp overflow (Aug 31 − 6mo → Feb 28, not Mar 3)
      if (r > now) {
        reminders.push({
          date: r.toISOString().slice(0, 10),
          label: `${months} month${months > 1 ? "s" : ""} before: ${d.label}`,
        });
      }
    }
  }
  reminders.sort((a, b) => a.date.localeCompare(b.date));
  return reminders;
}

function normalizeResult(raw) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    deadlines: arr(raw.deadlines).filter((d) => d && d.date && d.label),
    risks: arr(raw.risks).filter((r) => r && r.text),
    missing_info: arr(raw.missing_info).filter((m) => typeof m === "string"),
    next_steps: arr(raw.next_steps).filter((s) => typeof s === "string"),
    agent_insights:
      raw.agent_insights && typeof raw.agent_insights === "object" ? raw.agent_insights : {},
  };
}

// ---------- API handlers ----------

async function handleHealth(res) {
  const probe = await probeOllama();
  sendJson(res, 200, {
    app: "ops-hub", // identity marker so a second launch can detect us and reuse instead of duplicating
    ok: probe.online,
    demo: !probe.online || !probe.model,
    forced: FORCE_DEMO,
    model: probe.model || MODEL_ENV || "auto",
    modelReady: !!probe.model,
    installed: probe.installed,
    limits: {
      maxChatMessages: MAX_CHAT_MESSAGES,
      maxChatMessageChars: MAX_CHAT_MESSAGE_CHARS,
      maxChatAggregateChars: MAX_CHAT_AGGREGATE_CHARS,
      maxContextChars: MAX_CONTEXT_CHARS,
      maxActionChars: MAX_ACTION_CHARS,
    },
  });
}

// Stream text to the client in small chunks so demo chat feels alive.
function streamDemoText(res, text) {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Ops-Hub-Mode": "demo",
  });
  const words = text.split(/(?<=\s)/);
  let i = 0;
  const tick = () => {
    if (i >= words.length) return res.end();
    res.write(words[i++]);
    setTimeout(tick, 14);
  };
  tick();
}

async function handleChat(res, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sendJson(res, 400, { error: "Request body must be a JSON object." });
  }
  const { agent, messages: rawMessages, context: rawContext = "", guided = false } = body;
  if (typeof agent !== "string") return sendJson(res, 400, { error: "agent must be a string." });
  if (typeof guided !== "boolean") return sendJson(res, 400, { error: "guided must be a boolean." });

  const checkedMessages = sanitizeChatMessages(rawMessages);
  if (!checkedMessages.ok) {
    return sendJson(res, checkedMessages.status, { error: checkedMessages.error });
  }
  const checkedContext = sanitizeLimitedText(rawContext, "context", MAX_CONTEXT_CHARS);
  if (!checkedContext.ok) return sendJson(res, checkedContext.status, { error: checkedContext.error });

  const messages = checkedMessages.value;
  const context = checkedContext.value;
  const system = buildSystem(agent, context);
  if (!system) return sendJson(res, 400, { error: `Unknown agent "${agent}"` });

  if (guided) {
    if (!matchesBundledSample(agent, context)) {
      return sendJson(res, 400, { error: "Guided mode requires this agent's bundled sample." });
    }
    return streamDemoText(res, demoChatReply(agent, messages));
  }

  const probe = await probeOllama();

  // Offline / no model → demo chat
  if (!probe.online || !probe.model) {
    return streamDemoText(res, demoChatReply(agent, messages));
  }

  let upstream;
  try {
    upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: probe.model,
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!upstream.ok || !upstream.body) throw new Error(`Ollama HTTP ${upstream.status}`);
  } catch (err) {
    // Mid-request failure → degrade to demo instead of erroring
    console.error("Ollama chat error, falling back to demo:", err.message);
    return streamDemoText(res, demoChatReply(agent, messages));
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
  });

  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for await (const chunk of upstream.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const piece = json.message && json.message.content;
          if (piece) res.write(piece);
        } catch (_) {
          /* skip malformed line */
        }
      }
    }
  } catch (err) {
    console.error("Stream interrupted:", err.message);
  }
  res.end();
}

async function handleAction(res, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sendJson(res, 400, { error: "Request body must be a JSON object." });
  }
  const { agent, action, text: rawText, guided = false } = body;
  if (typeof agent !== "string") return sendJson(res, 400, { error: "agent must be a string." });
  if (typeof action !== "string") return sendJson(res, 400, { error: "action must be a string." });
  if (typeof guided !== "boolean") return sendJson(res, 400, { error: "guided must be a boolean." });

  const checkedText = sanitizeLimitedText(rawText, "text", MAX_ACTION_CHARS, false);
  if (!checkedText.ok) return sendJson(res, checkedText.status, { error: checkedText.error });
  const text = checkedText.value;
  const system = buildSystem(agent, "");
  const instruction = ACTIONS[action];
  if (!system) return sendJson(res, 400, { error: `Unknown agent "${agent}"` });
  if (!instruction) return sendJson(res, 400, { error: `Unknown action "${action}"` });

  if (guided) {
    if (!matchesBundledSample(agent, text)) {
      return sendJson(res, 400, { error: "Guided mode requires this agent's bundled sample." });
    }
    const demo = demoAction(agent, action);
    if (!demo) return sendJson(res, 400, { error: `Unknown agent "${agent}"` });
    const result = normalizeResult(demo);
    return sendJson(res, 200, {
      result,
      reminders: computeReminders(result.deadlines),
      model: "guided demo",
      demo: true,
    });
  }

  const probe = await probeOllama();

  // Offline / no model → curated demo result
  if (!probe.online || !probe.model) {
    if (!matchesBundledSample(agent, text)) {
      return sendJson(res, 503, {
        error:
          "Live local AI is unavailable, so custom material cannot be analyzed right now. Load this agent's bundled sample to preview the workflow, or start Ollama and try again.",
        code: "LOCAL_AI_UNAVAILABLE",
        sample: `/api/sample/${agent}`,
      });
    }
    const demo = demoAction(agent, action);
    if (!demo) return sendJson(res, 400, { error: `Unknown agent "${agent}"` });
    const result = normalizeResult(demo);
    return sendJson(res, 200, {
      result,
      reminders: computeReminders(result.deadlines),
      model: "offline demo",
      demo: true,
    });
  }

  let data;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: probe.model,
        stream: false,
        format: "json",
        options: { temperature: 0.2 },
        messages: [
          { role: "system", content: system + "\n" + SCHEMA_INSTRUCTIONS },
          {
            role: "user",
            content: `${instruction}\n\n=== MATERIAL ===\n${text}\n=== END MATERIAL ===`,
          },
        ],
      }),
    });
    if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
    data = await r.json();
  } catch (err) {
    console.error("Ollama action error:", err.message);
    return sendJson(res, 502, {
      error: `Could not reach the local AI model (${err.message}). Is Ollama running? Try "ollama serve".`,
    });
  }

  const raw = parseModelJson((data.message && data.message.content) || "");
  if (!raw) {
    return sendJson(res, 502, {
      error: "The model returned malformed output. Try again (smaller models occasionally do this).",
    });
  }

  const result = normalizeResult(raw);
  const reminders = computeReminders(result.deadlines);
  sendJson(res, 200, { result, reminders, model: probe.model, demo: false });
}

function handleSample(res, agent) {
  const file = SAMPLE_FILES[agent];
  if (!file) return sendJson(res, 404, { error: `No sample for agent "${agent}"` });
  fs.readFile(path.join(DEMO_DATA_DIR, file), "utf8", (err, content) => {
    if (err) return sendJson(res, 500, { error: "Sample file missing on disk" });
    sendJson(res, 200, { name: file, text: content });
  });
}

// ---------- static files ----------

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(content);
  });
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);
  const urlPath = req.url.split("?")[0];

  try {
    if (req.method === "GET" && urlPath === "/api/health") return await handleHealth(res);

    if (req.method === "GET" && urlPath.startsWith("/api/sample/")) {
      return handleSample(res, urlPath.slice("/api/sample/".length));
    }

    if (req.method === "POST" && (urlPath === "/api/chat" || urlPath === "/api/action")) {
      if (!isSameOriginPost(req)) {
        return sendJson(res, 403, { error: "Cross-origin requests are not allowed." });
      }
      const contentType = (req.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
      if (contentType !== "application/json") {
        return sendJson(res, 415, { error: "Content-Type must be application/json." });
      }
      let body;
      try {
        body = JSON.parse((await readBody(req)) || "{}");
      } catch (err) {
        const tooLarge = err && err.message === "Payload too large";
        return sendJson(res, tooLarge ? 413 : 400, {
          error: tooLarge ? "Request payload is too large." : "Invalid JSON body.",
        });
      }
      if (urlPath === "/api/chat") return await handleChat(res, body);
      return await handleAction(res, body);
    }

    if (req.method === "GET") return serveStatic(req, res, urlPath);

    res.writeHead(405);
    res.end("Method not allowed");
  } catch (err) {
    console.error("Server error:", err);
    if (!res.headersSent) sendJson(res, 500, { error: "Internal server error" });
    else res.end();
  }
});

// ---------- resilient startup ----------
// The demo must boot on any PC, every time. Console output is plain ASCII —
// cmd.exe windows render Unicode as garbage.
//
// Before binding we probe the port over BOTH IPv4 and IPv6 loopback:
//  - our own app already there  -> just open the browser and exit (double-click twice = one server)
//  - someone else's server      -> walk to the next port (Windows can otherwise let two
//                                  processes share a port across IPv4/IPv6 without an error)
//  - free                       -> bind, with EADDRINUSE walking as a final safety net

function openBrowser(url) {
  const cmd = process.platform === "win32" ? `start ${url}` : process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`;
  require("child_process").exec(cmd);
}

function publicUrl(port) {
  const host = ["127.0.0.1", "0.0.0.0", "::"].includes(HOST) ? "localhost" : HOST;
  const urlHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return `http://${urlHost}:${port}`;
}

async function portOccupant(port) {
  const configured = HOST.toLowerCase();
  const loopback = ["127.0.0.1", "[::1]"];
  const hosts = ["127.0.0.1", "::1", "localhost", "0.0.0.0", "::"].includes(configured)
    ? loopback
    : [HOST.includes(":") && !HOST.startsWith("[") ? `[${HOST}]` : HOST];
  for (const host of hosts) {
    try {
      const r = await fetch(`http://${host}:${port}/api/health`, { signal: AbortSignal.timeout(800) });
      const j = await r.json().catch(() => null);
      return j && j.app === "ops-hub" ? "ours" : "foreign";
    } catch (_) {
      /* nothing on this host — try the other */
    }
  }
  return "free";
}

async function startServer(port, attemptsLeft) {
  const occupant = await portOccupant(port);
  if (occupant === "ours") {
    const url = publicUrl(port);
    console.log(`\n  AI Operations Hub is ALREADY running at ${url}`);
    if (OPEN_BROWSER) {
      console.log(`  Opening the browser to the running copy. (Close this window - the hub stays up.)\n`);
      openBrowser(url);
    } else {
      console.log(`  Open ${url} in your browser. (Close this window - the hub stays up.)\n`);
    }
    process.exit(0);
  }
  if (occupant === "foreign" && attemptsLeft > 0) {
    console.log(`  Port ${port} is used by another program - trying ${port + 1}`);
    return startServer(port + 1, attemptsLeft - 1);
  }

  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      server.removeAllListeners("listening"); // drop the stale listen callback from the failed attempt
      console.log(`  Port ${port} is busy - trying ${port + 1}`);
      startServer(port + 1, attemptsLeft - 1);
    } else {
      throw err;
    }
  });

  server.listen(port, HOST, async () => {
    server.removeAllListeners("error");
    const url = publicUrl(port);
    const probe = await probeOllama();
    console.log(`\n  AI Operations Hub`);
    console.log(`  ${url}`);
    if (FORCE_DEMO) {
      console.log(`  Mode: built-in analysis (forced via DEMO=1)\n`);
    } else if (probe.online && probe.model) {
      console.log(`  AI engine online | model: ${probe.model} (auto-detected, zero npm dependencies)\n`);
    } else if (probe.online) {
      console.log(`  Ollama is online but no model is installed - using built-in analysis.`);
      console.log(`  Pull one to go live:  ollama pull llama3.1:8b\n`);
    } else {
      console.log(`  AI engine unreachable at ${OLLAMA_URL} - using built-in analysis.`);
      console.log(`  Start Ollama ("ollama serve" or open the Ollama app) and the hub goes live automatically.\n`);
    }
    if (OPEN_BROWSER) openBrowser(url);
  });
}

startServer(Number(PORT), 10);
