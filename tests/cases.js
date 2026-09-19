// Shared by the Node runner (lib.test.mjs) and the browser runner (tests/index.html).
import { DEMO_SCAN } from "../src/demo.js";
import { cleanScan, esc, intakeToText, isNamedEmployer, safeUrl, splitFinalMessage } from "../src/lib.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export const cases = [
  ["esc neutralises markup and quotes", () => {
    assert(esc(`<img src=x onerror="a('b')">`) === "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;", esc(`<img src=x onerror="a('b')">`));
    assert(esc(null) === "", "null should become an empty string");
  }],

  ["safeUrl keeps http(s) and rejects everything else", () => {
    assert(safeUrl("https://www.bosch.com") === "https://www.bosch.com/", "https");
    assert(safeUrl("javascript:alert(1)") === "", "javascript: must be rejected");
    assert(safeUrl("data:text/html,hi") === "", "data: must be rejected");
    assert(safeUrl("www.bosch.com") === "", "relative URL must be rejected");
  }],

  ["vague categories are not employers", () => {
    assert(!isNamedEmployer({ name: "Embedded systems companies (Bosch, Pilz adjacent)", url: "https://x.com" }), "category");
    assert(!isNamedEmployer({ name: "German modernization programs", url: "https://x.com" }), "program");
    assert(!isNamedEmployer({ name: "Siemens", url: "" }), "no link");
    assert(isNamedEmployer({ name: "Siemens Energy", url: "https://www.siemens-energy.com" }), "real one");
  }],

  ["cleanScan drops vague, unlinked and duplicate entries", () => {
    const { scan, dropped } = cleanScan({
      buckets: [
        { key: "obvious", companies: [
          { name: "Bosch", url: "https://www.bosch.com" },
          { name: "Various automotive suppliers", url: "https://example.com" },
        ] },
        { key: "adjacent", companies: [
          { name: "bosch", url: "https://www.bosch.com" },
          { name: "Festo", url: "javascript:alert(1)" },
          { name: "TRUMPF", url: "https://www.trumpf.com" },
        ] },
      ],
    });
    assert(scan.buckets[0].companies.map((c) => c.name).join() === "Bosch", "obvious bucket");
    assert(scan.buckets[1].companies.map((c) => c.name).join() === "TRUMPF", "adjacent bucket");
    assert(dropped.length === 3, `dropped ${dropped.length}`);
  }],

  ["the demo scan survives its own validation", () => {
    const { dropped } = cleanScan(DEMO_SCAN);
    assert(dropped.length === 0, JSON.stringify(dropped));
  }],

  ["final interview message is split at the marker", () => {
    const r = splitFinalMessage("Thanks, that's all.\n[[PROFILE_COMPLETE]]");
    assert(r.done && r.visible === "Thanks, that's all.", JSON.stringify(r));
    assert(!splitFinalMessage("Next question?").done, "no marker");
  }],

  ["intake form skips empty fields", () => {
    assert(intakeToText({ studies: "M.Sc. ME", sectors: "", hardNos: " travel " }) ===
      "Studies: M.Sc. ME\nHard no's: travel", intakeToText({ studies: "M.Sc. ME", sectors: "", hardNos: " travel " }));
  }],
];
