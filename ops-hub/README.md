# AI Operations Hub

A private, decision-first workspace for Legal, Business Development, Technical, and HR.

It turns source material into an executive recommendation, critical date, highest risks, and next three moves. Conversations, source material, results, and prepared reminders return exactly as you left them in the same browser.

## Start the demo

1. Extract the complete `ops-hub` folder.
2. Double-click **`start-hub.bat`**.
3. Keep the small server window open while presenting.

Node.js 18+ is the only app requirement. No npm install is needed.

## The 90-second CEO walkthrough

1. On the home page, choose **Review the $18M decision**.
2. The guided brief opens automatically with a deterministic result—no waiting for a model.
3. Lead with the first screen: **BID — pursue, with conditions · 58% P-Win estimate · Q&A due October 5**.
4. Open only the evidence the CEO asks for. Risks, dates, reminders, missing information, and SWOT stay collapsed by default.
5. Ask **“What are we still waiting on?”** The workspace names the allied-health SME, CPARS, and pricing gaps.
6. Say **“Remember that the capture owner is Maya.”** Refresh the page, then ask **“Who is the capture owner?”** The conversation, source, and brief all return.
7. Open **Legal** from the top navigation. Review the sample contract, then choose **Download reminders** to export the prepared calendar file.
8. Close on **Memory**: saved in this browser, scoped by department, and deletable at any time.

## Two operating modes

| Mode | What happens |
|---|---|
| Private AI available | The best installed Ollama model is detected automatically and analyzes custom material locally. |
| Guided demo | The four matching bundled examples produce curated, truthful demo briefs. Custom material is not given an unrelated canned answer. |

For live private AI, install [Ollama](https://ollama.com) and run `ollama pull llama3.1:8b` (or a smaller local model). The hub detects it without a restart.

## Saved conversation memory

- The home page shows up to four recent decisions, and each agent card resumes its latest saved conversation.
- Each department keeps its own saved conversations.
- Source text, the last structured brief, reminders, and up to 40 recent chat messages are restored after reload or navigation.
- Storage is local to the current browser profile. It is not encrypted and should be cleared on a shared computer.
- The demo does not claim organization-wide knowledge or automatic fact extraction. Production memory needs identity, access controls, provenance, retention rules, and an encrypted per-user database.

## Trust model

- The server binds to `127.0.0.1` by default.
- API responses are not cached and include browser security headers.
- Chat roles and payload sizes are validated before reaching the local model.
- The workspace is decision support. Human review remains required, especially for legal, HR, and compliance work.

Network and pilot deployment guidance is in **`DEPLOY.md`**.

## Project map

```text
public/        Executive UI and browser-local saved conversations
server.js      Zero-dependency Node server and local Ollama proxy
prompts.js     Department instructions and structured output contract
demo.js        Curated guided-demo scenarios and offline recall
demo-data/     The four matching example documents
```
