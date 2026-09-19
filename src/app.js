import { DEMO_SCAN, DEMO_TRANSCRIPT } from "./demo.js";
import { cleanScan, esc, intakeToText, safeUrl, splitFinalMessage, transcriptText } from "./lib.js";

const $ = (id) => document.getElementById(id);
const BUCKETS = {
  obvious: { label: "Obvious fits", blurb: "What you'd expect, chosen well." },
  adjacent: { label: "Adjacent", blurb: "Connected to what you've done, one step further." },
  unexpected: { label: "Unexpected", blurb: "Different industry, same underlying skills." },
};

const state = { engine: null, messages: [], files: [], profile: null };

// ---------------------------------------------------------------- log

const LOG = [];
function log(tag, data) {
  const line = `[${new Date().toLocaleTimeString()}] ${tag}` +
    (data === undefined ? "" : `\n   ${typeof data === "string" ? data : JSON.stringify(data)}`.slice(0, 4000));
  LOG.push(line);
  $("logbox").textContent = LOG.join("\n\n");
}

function show(section) {
  for (const id of ["setup", "chat", "processing", "results"]) $(id).hidden = id !== section;
  $("composer").hidden = section !== "chat";
  $("restartBtn").hidden = section === "setup";
}

function showError(where, err) {
  log("error", err.message);
  $(where).innerHTML = `<div class="err">${esc(err.message)}</div>`;
}

// ---------------------------------------------------------------- setup

function restoreKey() {
  try {
    const key = sessionStorage.getItem("cs_key") || localStorage.getItem("cs_key");
    if (key) { $("apiKey").value = key; $("rememberKey").checked = !!localStorage.getItem("cs_key"); }
  } catch { /* storage blocked: the user just types the key again */ }
}

function storeKey(key) {
  try {
    sessionStorage.setItem("cs_key", key);
    if ($("rememberKey").checked) localStorage.setItem("cs_key", key);
    else localStorage.removeItem("cs_key");
  } catch { /* ignore */ }
}

async function readFile(file) {
  if (file.type !== "application/pdf") return file.text();
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    // Keep the PDF's line breaks; joining every text item with spaces garbled headings.
    pages.push(content.items.map((it) => it.str + (it.hasEOL ? "\n" : "")).join(""));
  }
  return pages.join("\n");
}

$("cvFile").addEventListener("change", async (e) => {
  for (const f of [...e.target.files]) {
    if (state.files.length >= 5) break;
    try {
      state.files.push({ name: f.name, text: (await readFile(f)).trim() });
      log(`read ${f.name}`, `${state.files.at(-1).text.length} chars`);
    } catch (err) {
      log(`could not read ${f.name}`, err.message);
    }
  }
  e.target.value = "";
  renderFiles();
});

function renderFiles() {
  $("files").innerHTML = state.files.map((f, i) =>
    `<li>${esc(f.name)} <button type="button" data-i="${i}" class="link">remove</button></li>`).join("");
  $("files").querySelectorAll("button").forEach((b) => b.onclick = () => {
    state.files.splice(Number(b.dataset.i), 1);
    renderFiles();
  });
}

$("setupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("setupErr").innerHTML = "";
  const key = $("apiKey").value.trim();
  const intake = intakeToText(Object.fromEntries(new FormData($("setupForm"))));
  const docs = state.files.map((f) => `### ${f.name}\n${f.text}`).join("\n\n");
  const notes = $("notes").value.trim();
  const background = [docs, notes && `### Notes\n${notes}`].filter(Boolean).join("\n\n");

  if (!key) return showError("setupErr", new Error("Enter an Anthropic API key, or try the sample scan."));
  if (background.length < 40) return showError("setupErr", new Error("Add a CV or a few lines about yourself first."));

  storeKey(key);
  const { Engine } = await import("./engine.js");
  state.engine = new Engine(key, $("model").value, log);
  state.messages = [{
    role: "user",
    content: `Intake form:\n${intake || "(not filled in)"}\n\nDocuments:\n${background}\n\nPlease begin the interview.`,
  }];
  show("chat");
  await nextQuestion();
});

// ---------------------------------------------------------------- interview

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  $("msgs").appendChild(div);
  div.scrollIntoView({ behavior: "smooth", block: "end" });
}

async function nextQuestion() {
  $("typing").hidden = false;
  try {
    const reply = await state.engine.interview(state.messages);
    state.messages.push({ role: "assistant", content: reply });
    const { visible, done } = splitFinalMessage(reply);
    if (visible) addMessage(visible, "ai");
    $("progress").textContent = `Interview · question ${state.messages.filter((m) => m.role === "assistant").length}`;
    if (done) await runScan();
  } catch (err) {
    addMessage(`Something went wrong: ${err.message}`, "ai");
    log("interview error", err.message);
  } finally {
    $("typing").hidden = true;
  }
}

async function sendAnswer() {
  const text = $("answer").value.trim();
  if (!text || !state.engine) return;
  $("answer").value = "";
  addMessage(text, "me");
  state.messages.push({ role: "user", content: text });
  await nextQuestion();
}

$("sendBtn").onclick = sendAnswer;
$("answer").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); }
});

// ---------------------------------------------------------------- scan

async function runScan() {
  show("processing");
  const steps = ["Summarising the interview…", "Searching employers that fit…", "Looking outside your sectors…", "Checking every employer is real and linked…"];
  let i = 0;
  const tick = setInterval(() => { $("procStatus").textContent = steps[Math.min(i++, steps.length - 1)]; }, 6000);
  try {
    $("procStatus").textContent = steps[0];
    state.profile = await state.engine.profile(transcriptText(state.messages));
    log("profile", state.profile);
    const raw = await state.engine.scan(state.profile);
    const { scan, dropped } = cleanScan(raw);
    if (dropped.length) log("dropped entries", dropped);
    renderResults(scan, false);
  } catch (err) {
    show("processing");
    $("procStatus").innerHTML = `<div class="err">The scan failed: ${esc(err.message)}. Open the panel on the right for the log. Your conversation is saved there.</div>`;
  } finally {
    clearInterval(tick);
  }
}

// ---------------------------------------------------------------- results

function companyCard(c) {
  const url = safeUrl(c.url);
  const name = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}</a>` : esc(c.name);
  return `<article class="company">
    <header><h3>${name}</h3>${c.location ? `<span class="loc">${esc(c.location)}</span>` : ""}</header>
    ${c.what ? `<p class="what">${esc(c.what)}</p>` : ""}
    ${c.why_fit ? `<p class="why">${esc(c.why_fit)}</p>` : ""}
    ${c.bridge ? `<p class="bridge"><b>Skill bridge:</b> ${esc(c.bridge)}</p>` : ""}
  </article>`;
}

function renderResults(scan, isDemo) {
  const banner = isDemo
    ? `<p class="banner">Sample scan for a fictional candidate. The companies are real; the fit notes are illustrative, not from a live search.</p>`
    : `<p class="banner ok">Built from a live web search. Openings change, so check each careers page.</p>`;
  const buckets = ["obvious", "adjacent", "unexpected"].map((key) => {
    const b = scan.buckets.find((x) => x.key === key);
    if (!b || !b.companies.length) return "";
    return `<section class="bucket ${key}">
      <h2><span class="chip">${BUCKETS[key].label}</span></h2>
      <p class="blurb">${BUCKETS[key].blurb}</p>
      ${b.companies.map(companyCard).join("")}
    </section>`;
  }).join("");

  $("results").innerHTML = `${banner}
    <section class="profile-box">
      <h2>Your profile</h2>
      <p>${esc(scan.summary)}</p>
      ${scan.pitch ? `<p class="pitch"><b>Your pitch:</b> ${esc(scan.pitch)}</p>` : ""}
    </section>
    ${buckets}
    ${scan.tradeoffs ? `<p class="note"><b>Trade-offs:</b> ${esc(scan.tradeoffs)}</p>` : ""}
    <div class="actions no-print">
      <button type="button" class="ghost" onclick="window.print()">Print or save as PDF</button>
      <button type="button" class="ghost" onclick="location.reload()">Start over</button>
    </div>`;
  show("results");
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- demo

$("demoBtn").onclick = () => {
  state.messages = [{ role: "user", content: "(sample documents)" }, ...DEMO_TRANSCRIPT];
  show("chat");
  $("progress").textContent = "Sample interview (fictional candidate)";
  for (const m of DEMO_TRANSCRIPT) addMessage(splitFinalMessage(m.content).visible, m.role === "user" ? "me" : "ai");
  $("composer").hidden = true;
  const go = document.createElement("button");
  go.type = "button";
  go.className = "primary";
  go.textContent = "Show the sample scan →";
  go.onclick = () => renderResults(cleanScan(DEMO_SCAN).scan, true);
  $("msgs").appendChild(go);
};

// ---------------------------------------------------------------- panel

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

$("panelToggle").onclick = () => $("panel").classList.toggle("open");
$("dlTranscript").onclick = () => download("career-scan-transcript.txt", transcriptText(state.messages, state.profile));
$("copyLog").onclick = () => navigator.clipboard.writeText(LOG.join("\n\n"));
$("restartBtn").onclick = () => { if (confirm("Start over? The current conversation will be cleared.")) location.reload(); };

restoreKey();
show("setup");
log("ready");
// ?demo opens the sample scan directly, e.g. for a link in the README.
if (new URLSearchParams(location.search).has("demo")) renderResults(cleanScan(DEMO_SCAN).scan, true);
