// Pure helpers: no DOM, no network. Everything here is unit-tested.

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Model output is untrusted. Only plain http(s) links make it into an href,
// so a "javascript:" URL in a company entry cannot run in the page.
export function safeUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

// The v0.3 prototype sometimes returned categories instead of employers:
// "Embedded systems companies (Bosch, Pilz adjacent)". Those are not actionable.
const VAGUE = /\b(companies|firms|employers|startups|programs?|programmes?|players|such as|e\.g\.|various|sector|industry)\b|[()]/i;

export function isNamedEmployer(company) {
  const name = String(company?.name ?? "").trim();
  return name.length > 1 && name.length <= 60 && !VAGUE.test(name) && safeUrl(company?.url) !== "";
}

// Drop vague or unlinked entries, de-duplicate across buckets (first bucket
// wins), and cap each bucket. Returns the cleaned scan plus what was dropped.
export function cleanScan(scan, maxPerBucket = 6) {
  const seen = new Set();
  const dropped = [];
  const buckets = (scan?.buckets ?? []).map((bucket) => {
    const companies = [];
    for (const c of bucket.companies ?? []) {
      const key = String(c.name ?? "").trim().toLowerCase();
      if (!isNamedEmployer(c)) { dropped.push({ name: c.name, reason: "vague or no link" }); continue; }
      if (seen.has(key)) { dropped.push({ name: c.name, reason: "duplicate" }); continue; }
      if (companies.length >= maxPerBucket) { dropped.push({ name: c.name, reason: "bucket full" }); continue; }
      seen.add(key);
      companies.push({ ...c, url: safeUrl(c.url) });
    }
    return { ...bucket, companies };
  });
  return { scan: { ...scan, buckets }, dropped };
}

export const PROFILE_DONE = "[[PROFILE_COMPLETE]]";

// The interviewer ends its last message with a marker. Everything before it is shown.
export function splitFinalMessage(text) {
  const i = text.indexOf(PROFILE_DONE);
  return i < 0 ? { visible: text, done: false } : { visible: text.slice(0, i).trim(), done: true };
}

// Turn the intake form into the opening lines of the conversation, so the
// interviewer can skip straight to the questions that need judgement.
export function intakeToText(intake) {
  const rows = [
    ["Studies", intake.studies],
    ["Graduating", intake.graduation],
    ["Based in / open to", intake.location],
    ["Languages", intake.languages],
    ["Sectors I'm drawn to", intake.sectors],
    ["Hard no's", intake.hardNos],
  ].filter(([, v]) => v && String(v).trim());
  return rows.map(([k, v]) => `${k}: ${String(v).trim()}`).join("\n");
}

// Plain-text transcript for download. The first user message holds the documents.
export function transcriptText(messages, profile) {
  const lines = ["Career Scan: conversation transcript", new Date().toLocaleString(), ""];
  messages.forEach((m, i) => {
    if (i === 0) { lines.push("[Documents and intake form provided]", ""); return; }
    const text = m.role === "assistant" ? splitFinalMessage(m.content).visible : m.content;
    lines.push(`${m.role === "assistant" ? "INTERVIEWER" : "YOU"}: ${text}`, "");
  });
  if (profile) lines.push("--- structured profile ---", JSON.stringify(profile, null, 2));
  return lines.join("\n").trim();
}
