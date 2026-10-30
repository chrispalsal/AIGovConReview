// demo.js — offline demo mode for the AI Operations Hub.
// When Ollama is unreachable (or DEMO=1 is set), the server answers from this
// curated content instead of failing. Outputs match the bundled demo-data samples,
// so "Load sample → run action" tells the full story even with no model installed.

// ---------- structured action results (one rich result per agent) ----------

const RESULTS = {
  legal: {
    summaries: {
      summary:
        "Staffing services agreement between Harbor Point Staffing Group and the Ohio Community Care Authority. Base period runs 2027-03-01 through 2028-02-29 with one option year; the Authority must give written notice to exercise it by 2027-12-01 (Section 1.2). Recurring deliverables: monthly status reports by the 7th business day and quarterly compliance reports within 20 days of quarter end. The Exhibit B NDA survives until 2029-06-30. Key exposure is nurse classification: the contract requires LPN and RN staff whose duties must conform to Ohio licensing law.",
      risks:
        "Risk scan of the Ohio staffing agreement: the dominant exposures are worker-classification compliance under Ohio licensing law (Section 3), the option-year notice window closing 2027-12-01 (Section 1.2), and recurring deliverable deadlines that generate compliance findings when missed (Section 2). The mutual 90-day termination clause (Section 5) is standard but worth monitoring.",
      actions:
        "Action plan for the Ohio staffing agreement: every extracted date has 6/3/1-month reminders prepared for calendar export. The critical path is the option-year exercise notice due 2027-12-01 (Section 1.2) — miss it and the contract ends 2028-02-29. Recurring monthly and quarterly deliverables need standing reminders, and the Exhibit B NDA needs an expiration tracker for 2029-06-30.",
    },
    deadlines: [
      { date: "2027-03-01", label: "Base period begins (Section 1)" },
      { date: "2027-12-01", label: "Written notice to exercise option year due (Section 1.2)" },
      { date: "2028-02-29", label: "Base period ends (Section 1)" },
      { date: "2029-06-30", label: "NDA expiration — Exhibit B (Section 4)" },
    ],
    risks: [
      { level: "High", text: "Classification exposure: contract requires LPN and RN staff at Ohio facilities — an LPN performing RN-scope duties violates Ohio licensing law, and classification drives pay (Section 3)." },
      { level: "Medium", text: "Option-year continuity: if the Authority's written notice (due 2027-12-01, Section 1.2) slips, performance ends 2028-02-29 with no follow-on." },
      { level: "Medium", text: "Recurring deliverables: monthly status reports (7th business day) and quarterly compliance reports (20 days after quarter end) are audit points — late submission is a findable compliance gap (Section 2)." },
      { level: "Low", text: "Mutual 90-day termination for convenience (Section 5) — standard, but track any client signals that could precede notice." },
    ],
    missing_info: [
      "Contract dollar value / funding ceiling",
      "Named contracting officer and required notice delivery method",
      "Staffing volumes — number of LPN and RN positions",
      "Whether option-year pricing is pre-negotiated",
    ],
    next_steps: [
      "Add the prepared 6/3/1-month reminders for the 2027-12-01 option-exercise notice to the calendar",
      "Create a standing reminder for monthly status reports (7th business day of each month)",
      "Audit each placed nurse's duty statement against their Ohio license scope (LPN vs RN)",
      "File the Exhibit B NDA in the repository with a 2029-06-30 expiration tracker",
      "Confirm the notice procedure and recipient for the 90-day termination clause",
    ],
    agent_insights: {
      option_years: ["Option Year 1: 2028-03-01 → 2029-02-28 — exercise notice due 2027-12-01 (Section 1.2)"],
      nda_expirations: ["Exhibit B NDA — in force until 2029-06-30 (Section 4)"],
      classification_flags: [
        "Ohio licensing law governs nurse scope (Section 3) — verify LPN duty statements do not include RN-scope tasks",
        "Classification drives pay — a misclassified placement is both a licensing and a wage issue",
      ],
    },
  },

  bizdev: {
    summaries: {
      summary:
        "RFP #FHSA-2027-0118 — Federal Health Services Administration, Region 3, IT help desk and cybersecurity operations support across 2 regional service centers. 1 base + 3 option years, est. $9M. Proposals due 2027-02-26; Q&A closes 2027-01-14. Evaluation: technical approach 40%, past performance 35%, price 25%. We hold two similar federal IT support contracts (Regions 5 and 8, both rated Exceptional) — a strong match on past performance. The incumbent, Alder Peak Technologies, has held the work 6 years; rumored slow after-hours ticket resolution is unconfirmed but could be our discriminator.",
      risks:
        "Pursuit-risk scan for RFP #FHSA-2027-0118: the technical volume (40%, the heaviest factor) cannot be credibly written without a cybersecurity operations SME, and none is identified. The Q&A window closing 2027-01-14 is the only sanctioned channel to validate the rumored after-hours pain point. Zero pricing intelligence on a 6-year incumbent makes the 25% price factor a blind spot.",
      actions:
        "Capture plan for RFP #FHSA-2027-0118, working back from proposals due 2027-02-26: calendar reminders are prepared for export. Gate 1 is the Q&A deadline 2027-01-14 — questions must be drafted to confirm the after-hours resolution pain point. In parallel: source the cybersecurity SME, pull incumbent CPARS, and package the Region 5/8 past-performance write-ups.",
    },
    deadlines: [
      { date: "2027-01-14", label: "Q&A deadline — RFP #FHSA-2027-0118" },
      { date: "2027-02-26", label: "Proposals due — RFP #FHSA-2027-0118" },
    ],
    risks: [
      { level: "High", text: "No cybersecurity operations SME identified — the technical approach (40% of evaluation, the heaviest factor) cannot be written credibly without one. Sourcing must start now." },
      { level: "Medium", text: "Customer pain point (slow after-hours ticket resolution) is rumor — must be validated via Q&A before 2027-01-14 or dropped as a discriminator." },
      { level: "Medium", text: "No incumbent pricing intel or CPARS data — price (25%) and P-Win estimates carry wide error bars." },
      { level: "Low", text: "6-year incumbency means entrenched relationships — expect a strong defense and possible buy-in pricing." },
    ],
    missing_info: [
      "Cybersecurity operations SME",
      "Incumbent CPARS ratings",
      "Pricing intelligence / IGCE estimate",
      "Key decision makers in Region 3",
      "Recompete history and protest record",
      "Current team burn rate — capacity to staff the proposal",
    ],
    next_steps: [
      "Draft Q&A questions that validate the after-hours resolution pain point — submit before 2027-01-14",
      "Source the cybersecurity SME this week (internal first, then teaming partners)",
      "Pull CPARS on Alder Peak Technologies and request a pricing-intel workup",
      "Package Region 5 and Region 8 past-performance write-ups against the 35% factor",
      "Hold bid/no-bid Gate 2 within two weeks with SME and pricing status as entry criteria",
    ],
    agent_insights: {
      p_win: 55,
      bid_recommendation:
        "BID — pursue, with conditions. Past performance (35%) is a strong card, but the heaviest factor, technical approach (40%), cannot be written without a cybersecurity SME. Confirm the SME and validate the after-hours pain point before committing full proposal resources at Gate 2.",
      swot: {
        strengths: [
          "Two similar federal IT support contracts (Regions 5 & 8), both rated Exceptional — direct past-performance match at 35% weight",
          "Existing federal IT support infrastructure and cleared-staff pipeline",
        ],
        weaknesses: [
          "No cybersecurity operations SME identified for the technical volume (40% weight)",
          "No pricing intelligence on the incumbent",
        ],
        opportunities: [
          "Rumored incumbent after-hours ticket-resolution misses — a targeted staffing-model discriminator if confirmed via Q&A",
          "3 option years — $9M ceiling rewards a strong transition story",
        ],
        threats: [
          "6-year incumbent (Alder Peak Technologies) with entrenched customer relationships",
          "Price shootout at 25% weight if the incumbent defends with buy-in pricing",
        ],
      },
    },
  },

  technical: {
    summaries: {
      summary:
        "County Benefits Portal Migration sync (Feb 9). Baseline: migrate to the new identity provider by 2027-03-19 with zero downtime, existing SSO support, and testing across all 4 client environments. The integration is 70% done but blocked 5 days on client test-tenant access. QA has only 3 days of testing for 4 environments with 3 testers, and the PM's 2027-03-15 cutover compresses that further. Of three proposed ideas, only the login-revert feature flag aligns with the requirements; the logging-vendor switch and icon redesign do not. Bug #207 (password-reset email fails on mobile Safari) has had no update in 3 days.",
      risks:
        "Timeline-risk scan for the County Benefits Portal Migration: the plan as stated cannot meet its own quality bar. Three days of testing for 4 environments with 3 testers is the single largest threat to the zero-downtime requirement, and the artificial 2027-03-15 cutover makes it worse. The 5-day test-tenant blocker is silently consuming the schedule, and bug #207 is unowned in practice.",
      actions:
        "Recovery plan for the County Benefits Portal Migration, working back from the 2027-03-19 hard deadline (calendar reminders prepared for export): escalate the test-tenant blocker today, move the cutover to protect a real testing window, adopt the login-revert feature flag into the cutover plan, and park the two misaligned ideas until after go-live.",
    },
    deadlines: [
      { date: "2027-03-15", label: "PM-set cutover date — artificial; compresses testing (Feb 9 sync)" },
      { date: "2027-03-19", label: "Identity provider migration hard deadline (requirement baseline)" },
    ],
    risks: [
      { level: "High", text: "Testing plan gives 3 days for 4 client environments with 3 testers — realistic need is ~7 days plus buffer. Zero-downtime requirement is not achievable on the current window." },
      { level: "High", text: "Client test-tenant access blocked 5 days and counting — every further day comes directly out of the testing window." },
      { level: "Medium", text: "Cutover set to 2027-03-15 'to build in margin' — an artificial deadline that spends the margin it claims to create. Recommend cutover 2027-03-17 with testing protected." },
      { level: "Medium", text: "Bug #207 (password-reset email fails on mobile Safari) assigned but silent for 3 days — account recovery is directly in scope for an identity migration." },
    ],
    missing_info: [
      "Owner and ETA for client test-tenant access",
      "Revert time budget — how long a failed cutover may take to reverse",
      "Whether SSO regression tests exist or must be written",
      "Client-side freeze windows around the cutover date",
    ],
    next_steps: [
      "Escalate test-tenant access to the client PM today — blocker is 5 days old",
      "Move cutover from 2027-03-15 to protect a full testing window before 2027-03-19",
      "Adopt Alex's login-revert feature flag into the cutover plan (aligned with zero-downtime)",
      "Demand a status on bug #207 — account recovery intersects the identity migration",
      "Park the logging-vendor switch and icon redesign as post-migration backlog items",
    ],
    agent_insights: {
      timeline: [
        { phase: "Unblock test tenant + finish IdP integration (70% → 100%)", days: 6, buffer_days: 2 },
        { phase: "Integration + SSO regression verification", days: 4, buffer_days: 2 },
        { phase: "Testing — 4 client environments, 3 testers", days: 7, buffer_days: 3 },
        { phase: "Cutover + revert dry-run", days: 2, buffer_days: 1 },
      ],
      blockers: [
        "Client test-tenant access — dev lead waiting 5 days",
        "Bug #207 password-reset email on mobile Safari — assigned, no update in 3 days",
      ],
      aligned_ideas: [
        "Login-revert feature flag (Alex) — directly supports the zero-downtime requirement",
      ],
      misaligned_ideas: [
        "Logging-stack vendor switch (Jordan) — not in requirements; adds risk before 2027-03-19",
        "Dashboard icon redesign (Morgan) — cosmetic, unrelated to the identity migration baseline",
      ],
    },
  },

  hr: {
    summaries: {
      summary:
        "Modified-schedule accommodation request from an IT help-desk analyst placed at a county agency client — a joint-employer ADA case. Provider note (received Oct 9) confirms a condition exists but omits functional limitations and duration; clarification has been pending since Oct 13. The client claims the role requires fixed 8:00–4:30 coverage, but our own job requisition lists it as flexible-start eligible — a direct documentation conflict. The employee has asked for status twice and mentioned 'looking at other options,' an explicit escalation signal. The interactive process is open and documented since Oct 5, which is protective as long as it keeps moving.",
      risks:
        "Escalation-risk scan: this case is drifting toward an EEOC charge. The employee has signaled external escalation, the file contains a discoverable contradiction (flexible-start requisition vs. the client's fixed-coverage claim), and both outstanding dependencies — provider clarification and client confirmation — are aging without response-by dates. The documented interactive process is the main protective factor.",
      actions:
        "Case plan: convert both open dependencies into dated requests — a structured clarification form to the provider and a written coverage-requirements confirmation from the client via the PM liaison — and give the employee a concrete status update with a real date now. No verifiable deadlines exist in the material, so none were extracted; set response-by dates as the next action.",
    },
    deadlines: [],
    risks: [
      { level: "High", text: "Employee has requested status twice and mentioned 'looking at other options' — explicit signal of escalation toward an EEOC charge or counsel." },
      { level: "High", text: "Our job requisition lists the role as flexible-start eligible while the client claims fixed coverage is required — a discoverable contradiction that undercuts any essential-function defense." },
      { level: "Medium", text: "Provider note lacks functional limitations and duration — any determination made on the current file would be procedurally weak." },
      { level: "Low", text: "Interactive process opened Oct 5 and documented in the tracker — protective, provided momentum is maintained and every touch is logged." },
    ],
    missing_info: [
      "Functional limitations and expected duration from the provider",
      "Client's written confirmation of actual coverage requirements",
      "Signed accommodation-request form from the employee (verify it is in the file)",
      "Response-by dates for both outstanding requests — none exist in the material",
    ],
    next_steps: [
      "Send the provider a structured clarification form with a specific response-by date",
      "Escalate the client confirmation through the PM liaison — cite the flexible-start requisition language",
      "Give the employee a written status update with a real date, today",
      "Log all three touches in the interactive-process tracker",
      "Evaluate an interim modified schedule pending complete documentation",
    ],
    agent_insights: {
      case_type: "ADA reasonable-accommodation request (modified schedule) — joint-employer context",
      interactive_process: [
        "1. Request received, process opened — DONE Oct 5, documented",
        "2. Medical documentation — note received Oct 9; functional limitations + duration still outstanding (clarification requested Oct 13)",
        "3. Confirm essential job functions with client — requisition says flexible-start eligible; client claims fixed coverage (requested Oct 15, pending)",
        "4. Evaluate options: 10:00 a.m. start, partial/interim schedule change, trial period",
        "5. Written decision with reasoning delivered to employee",
        "6. Follow-up check-in; document effectiveness",
      ],
      similar_cases: [
        "Schedule-modification denials where the role was already performed with flexible hours — denials routinely fail; VERIFY against current EEOC guidance",
        "Joint-employer accommodation charges: staffing agency and client can both be liable when neither completes the interactive process — VERIFY against current EEOC guidance",
        "Documentation disputes: acting on an incomplete provider note without requesting clarification is treated as failing the interactive process — VERIFY against current EEOC guidance",
      ],
      waiting_on: [
        "Provider — functional limitations & duration (requested Oct 13, ~8 days)",
        "Client — actual coverage requirements confirmation (requested Oct 15, ~6 days)",
      ],
    },
  },
};

// ---------- demo chat replies ----------
// Keyed responses for the suggestion chips (exact strings known), plus a default.

const CHAT = {
  legal: {
    keyed: [
      {
        match: /extract all dates|dates and deliverables/i,
        reply:
          "From the pasted agreement:\n\n• 2027-03-01 — Base period begins (Section 1)\n• 2027-12-01 — Option-year exercise notice due (Section 1.2) ← the critical one\n• 2028-02-29 — Base period ends (Section 1)\n• 2029-06-30 — NDA expires (Exhibit B, Section 4)\n\nRecurring deliverables (Section 2): monthly status reports by the 7th business day; quarterly compliance reports within 20 days of quarter end.\n\nRun \"Create Action Items\" and I'll turn these into 6/3/1-month reminders you can export to your calendar.",
      },
      {
        match: /LPN|RN|classification/i,
        reply:
          "Yes — that is a real classification risk. An LPN performing RN-scope duties (assessments, care planning, IV push meds in most states) violates the state nurse-practice act, and classification also drives pay, so it creates wage exposure on top of licensing exposure.\n\nFor this Ohio contract: pull the duty statements for each LPN placement and compare against the Ohio Board of Nursing scope rules. Flag anything ambiguous for attorney review — I'm decision support, not legal advice.",
      },
      {
        match: /repository|similar|teaming/i,
        reply:
          "Search the contract repository on these axes:\n\n1. Contract type: teaming agreement + staffing services\n2. State: Ohio (state licensing language will match)\n3. Agency: health/human-services agencies\n4. Clause language: \"option year exercise\", \"written notice\", \"nurse classification\"\n\nAlso pull any prior agreement with this same client — renewal language tends to be reused, so past redlines predict this negotiation.",
      },
    ],
    fallback:
      "Guided demo mode is ready. Try a suggestion, or review the bundled contract to see a structured decision brief with deadline reminders prepared for calendar export.",
  },
  bizdev: {
    keyed: [
      {
        match: /should we bid|score this/i,
        reply:
          "Bid — with conditions. Score: MEDIUM.\n\nFor: two similar federal IT support contracts (Regions 5 & 8, both Exceptional) against a 35% past-performance weight — that's our strongest card.\nAgainst: no cybersecurity SME for the heaviest factor (technical, 40%), no pricing intel, 6-year incumbent.\n\nCondition for Gate 2: SME identified and the after-hours pain point validated through Q&A before 2027-01-14. If neither lands, downgrade to no-bid and save the B&P budget.",
      },
      {
        match: /p-win|drivers/i,
        reply:
          "P-Win: ~55%.\n\nDrivers up: past-performance match (35%); direct federal IT support experience; rumored incumbent after-hours resolution misses.\nDrivers down: 6-year incumbency; zero pricing intel (25% weight blind); technical volume (40%) unstaffed on the cybersecurity side.\n\nBiggest single lever: confirm the after-hours pain point via Q&A — it converts a rumor into a discriminator and could push P-Win above 70.",
      },
      {
        match: /missing|commit|waiting on|still waiting|still need/i,
        reply:
          "Before committing full proposal resources you still need:\n\n1. Cybersecurity operations SME (blocks the 40% technical volume)\n2. Incumbent CPARS ratings\n3. Pricing intelligence / IGCE\n4. Key decision makers in Region 3\n5. Recompete + protest history\n6. Current burn rate — can we even staff this proposal?\n\nItems 1–3 are gate criteria; the rest sharpen the win themes.",
      },
    ],
    fallback:
      "Guided demo mode is ready. Evaluate the bundled federal IT support opportunity for the full bid decision, P-Win, deadlines, and capture gaps—or use a suggested follow-up.",
  },
  technical: {
    keyed: [
      {
        match: /summarize this meeting|decisions/i,
        reply:
          "Meeting digest — Feb 9 sync:\n\nDECISIONS: cutover set to Mar 15 (⚠ flagged: artificial, compresses testing).\nACTION ITEMS: escalate test-tenant access (owner: PM, 5 days blocked); status on bug #207 (owner: assignee, silent 3 days).\nALIGNED: Alex's login-revert flag → supports zero-downtime.\nNOT ALIGNED: Jordan's logging-vendor switch, Morgan's icon redesign → out of scope before Mar 19.\nOPEN: revert time budget, SSO regression coverage.\n\nThis digest replaces the follow-up check-in.",
      },
      {
        match: /timeline|buffer/i,
        reply:
          "Realistic plan working back from Mar 19:\n\n1. Unblock test tenant + finish IdP integration: 6d + 2d buffer\n2. Integration + SSO regression: 4d + 2d buffer\n3. Testing (4 envs, 3 testers): 7d + 3d buffer ← protect this\n4. Cutover + revert dry-run: 2d + 1d buffer\n\nTotal ≈ 27 calendar days. The Mar-15 cutover fits only if the access blocker clears this week. Three testers across four environments means serialized test passes — fewer resources = more calendar time, there is no way around that.",
      },
      {
        match: /which of these ideas|match the requirements/i,
        reply:
          "Against the baseline (new identity provider by Mar 19, zero downtime, SSO, 4-env testing):\n\n✔ ALIGNED — login-revert feature flag: directly de-risks the zero-downtime requirement.\n✘ NOT ALIGNED — logging-vendor switch: not in requirements, adds regression surface before a hard deadline.\n✘ NOT ALIGNED — icon redesign: cosmetic, zero requirement coverage.\n\nRecommendation: adopt the revert flag into the cutover plan; park the other two in the post-migration backlog.",
      },
    ],
    fallback:
      "Guided demo mode is ready. Build the bundled migration plan to see the timeline decision, blockers, aligned scope, and next moves—or use a suggested follow-up.",
  },
  hr: {
    keyed: [
      {
        match: /classify this|next steps/i,
        reply:
          "Classification: ADA reasonable-accommodation request (modified schedule), joint-employer context — which means both we and the county agency client carry interactive-process obligations.\n\nImmediate next steps:\n1. Structured clarification form to the provider with a response-by date (note is missing functional limitations + duration)\n2. Written confirmation of actual coverage requirements from the client via the PM liaison — cite our flexible-start requisition\n3. Concrete status update to the employee today, with a real date\n4. Log everything in the tracker.",
      },
      {
        match: /EEOC|schedule/i,
        reply:
          "Comparable fact patterns (verify all against current EEOC guidance — it shifts):\n\n• Schedule-modification denials where the role was already performed with flexible hours: routinely found insufficient once flexibility is on record.\n• Joint-employer accommodation charges: staffing agency AND client can both be liable when neither completes the interactive process.\n• Incomplete provider notes: deciding without requesting clarification is treated as failing the interactive process — requesting it (as we did Oct 13) is the protective move.\n\nOur requisition listing the role as flexible-start eligible materially weakens a 'fixed coverage is essential' defense.",
      },
      {
        match: /documents am i missing|waiting on/i,
        reply:
          "Outstanding items:\n\nDOCUMENTS: provider's functional limitations + duration (requested Oct 13); client's written coverage-requirements confirmation (requested Oct 15); verify the signed accommodation-request form is in the file.\n\nWAITING ON: provider (~8 days), client (~6 days) — both aging without response-by dates. Set response-by dates and escalate through the PM liaison so you can give the employee a real date instead of 'as soon as I hear back.'",
      },
    ],
    fallback:
      "Guided demo mode is ready. Assess the bundled accommodation case to see the classification, escalation signals, missing documents, and next moves—or use a suggested follow-up.",
  },
};
 
function demoAction(agent, action) {
  const r = RESULTS[agent];
  if (!r) return null;
  return {
    summary: r.summaries[action] || r.summaries.summary,
    deadlines: r.deadlines,
    risks: r.risks,
    missing_info: r.missing_info,
    next_steps: r.next_steps,
    agent_insights: r.agent_insights,
  };
}

const MEMORY_DIRECTIVE =
  /^\s*(?:(?:please|can you|could you)\s+)?(?:remember(?:\s+that)?|keep\s+in\s+mind(?:\s+that)?|save\s+(?:this|that)(?:\s+memory)?(?:\s*[:\-]|\s+that)?)\s+([\s\S]+)/i;

const RECALL_REQUEST =
  /\b(?:do you remember|can you recall|what do you remember|what did i (?:say|tell you|ask you to remember)|what have i told you|what was (?:it|that)|remind me (?:what|who|when|where)|tell me (?:what|who|when|where|my|our)|what(?:'s| is) (?:my|our)|who(?:'s| is) (?:my|our)|do you know (?:my|our)|recall)\b/i;

const MEMORY_STOP_WORDS = new Set([
  "a",
  "about",
  "am",
  "an",
  "and",
  "are",
  "did",
  "do",
  "have",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "our",
  "please",
  "remember",
  "tell",
  "that",
  "the",
  "to",
  "was",
  "what",
  "when",
  "where",
  "who",
  "you",
]);

function trimMemoryFact(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,-]+/, "")
    .replace(/[\s.!?]+$/, "")
    .trim()
    .slice(0, 500);
}

function explicitMemoryFact(text) {
  const match = text.match(MEMORY_DIRECTIVE);
  return match ? trimMemoryFact(match[1]) : "";
}

function implicitMemoryFacts(text) {
  const facts = [];
  const compact = text.replace(/\s+/g, " ");
  const patterns = [
    /\b(?:my|our)\s+[a-z][a-z0-9 '\-]{0,60}?\s+(?:is|are)\s+[^.!?]{1,180}/gi,
    /\bi\s+(?:am|prefer|like|work\s+(?:at|for)|use)\s+[^.!?]{1,180}/gi,
  ];
  for (const pattern of patterns) {
    for (const match of compact.matchAll(pattern)) {
      const fact = trimMemoryFact(match[0]);
      if (fact) facts.push(fact);
    }
  }
  return facts;
}

function rememberedFacts(messages, beforeIndex) {
  const facts = [];
  for (let i = 0; i < beforeIndex; i += 1) {
    const message = messages[i];
    if (!message || message.role !== "user" || typeof message.content !== "string") continue;
    const explicit = explicitMemoryFact(message.content);
    const candidates = explicit ? [explicit] : implicitMemoryFacts(message.content);
    for (const fact of candidates) {
      const key = fact.toLowerCase();
      const duplicate = facts.findIndex((item) => item.key === key);
      if (duplicate !== -1) facts.splice(duplicate, 1);
      facts.push({ key, fact, explicit: !!explicit });
    }
  }
  return facts;
}

function memoryWords(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (word) => word.length > 1 && !MEMORY_STOP_WORDS.has(word)
  );
}

function relevantMemories(facts, question) {
  if (facts.length <= 1) return facts;
  const wanted = new Set(memoryWords(question));
  const scored = facts.map((item, index) => ({
    ...item,
    index,
    score: memoryWords(item.fact).reduce((sum, word) => sum + (wanted.has(word) ? 1 : 0), 0),
  }));
  const best = Math.max(...scored.map((item) => item.score));
  if (best > 0) return scored.filter((item) => item.score === best).slice(-3);
  return facts.slice(-3);
}

function bestMemoryScore(facts, question) {
  const wanted = new Set(memoryWords(question));
  return facts.reduce(
    (best, item) =>
      Math.max(
        best,
        memoryWords(item.fact).reduce((sum, word) => sum + (wanted.has(word) ? 1 : 0), 0)
      ),
    0
  );
}

function secondPerson(fact) {
  return fact
    .replace(/\bI am\b/gi, "you are")
    .replace(/\bI'm\b/gi, "you're")
    .replace(/\bI have\b/gi, "you have")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bour\b/gi, "your")
    .replace(/\bme\b/gi, "you")
    .replace(/\bI\b/g, "you");
}

function punctuate(text) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function demoChatReply(agent, history) {
  const c = CHAT[agent];
  if (!c) return "Unknown agent.";

  // Accept the former string signature as a compatibility courtesy, but the
  // server passes the complete, validated conversation so demo mode can recall.
  const messages = Array.isArray(history)
    ? history
    : [{ role: "user", content: typeof history === "string" ? history : "" }];
  let currentIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i] && messages[i].role === "user") {
      currentIndex = i;
      break;
    }
  }
  const userText = currentIndex >= 0 ? messages[currentIndex].content : "";

  const facts = rememberedFacts(messages, currentIndex);
  const directRecall = RECALL_REQUEST.test(userText);
  const factQuestion =
    /\?$/.test(userText.trim()) && facts.some((item) => item.explicit) && bestMemoryScore(facts, userText) > 0;
  if (directRecall || factQuestion) {
    if (!facts.length) {
      return "I don't have that saved in our conversation yet. Say “Remember that …” and I'll keep it with this chat.";
    }
    const relevant = relevantMemories(facts, userText);
    if (relevant.length === 1) return `I remember: ${punctuate(secondPerson(relevant[0].fact))}`;
    return `I remember:\n\n${relevant
      .map((item) => `• ${punctuate(secondPerson(item.fact))}`)
      .join("\n")}`;
  }

  const newMemory = explicitMemoryFact(userText);
  if (newMemory) return `Got it — I'll remember: ${punctuate(secondPerson(newMemory))}`;

  for (const k of c.keyed) {
    if (k.match.test(userText)) return k.reply;
  }
  return c.fallback;
}

module.exports = { demoAction, demoChatReply };
