// Talks to the Claude API through the official SDK, straight from the browser
// with the user's own key. No backend: the key never leaves this tab except
// to go to api.anthropic.com.

import Anthropic from "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.127.0/+esm";
import {
  FORMAT_SYSTEM, INTERVIEW_SYSTEM, PROFILE_SCHEMA, PROFILE_SYSTEM,
  RESEARCH_EXPECTED_SYSTEM, RESEARCH_UNEXPECTED_SYSTEM, SCAN_SCHEMA,
} from "./prompts.js";

const WEB_SEARCH = { type: "web_search_20260209", name: "web_search", max_uses: 5 };

export class Engine {
  constructor(apiKey, model, log = () => {}) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    this.model = model;
    this.log = log;
  }

  async #create(params, effort) {
    const body = { model: this.model, max_tokens: 16000, ...params };
    // Haiku 4.5 does not take an effort setting; the other models do.
    if (effort && !this.model.startsWith("claude-haiku")) {
      body.output_config = { ...body.output_config, effort };
    }
    // On Opus 5, fall back to another model instead of failing if a request is declined.
    const request = this.model === "claude-opus-5"
      ? this.client.beta.messages.create({ ...body, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : this.client.messages.create(body);
    const msg = await request;
    this.log(`← ${msg.stop_reason}`, msg.usage);
    if (msg.stop_reason === "refusal") throw new Error("The model declined this request.");
    return msg;
  }

  static text(msg) {
    return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  }

  // One interview turn. `messages` is the whole conversation so far.
  async interview(messages) {
    const msg = await this.#create({ system: INTERVIEW_SYSTEM, messages }, "medium");
    return Engine.text(msg);
  }

  // A schema-constrained call: the API guarantees the text is valid JSON for `schema`.
  async #structured(system, content, schema) {
    const msg = await this.#create({
      system,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema } },
    }, "low");
    return JSON.parse(Engine.text(msg));
  }

  profile(transcript) {
    return this.#structured(PROFILE_SYSTEM, transcript, PROFILE_SCHEMA);
  }

  // Web-search turns can pause mid-way; resume until the model is done.
  async #research(system, content) {
    const messages = [{ role: "user", content }];
    for (let turn = 0; turn < 4; turn++) {
      const msg = await this.#create({ system, messages, tools: [WEB_SEARCH] });
      if (msg.stop_reason !== "pause_turn") return Engine.text(msg);
      messages.push({ role: "assistant", content: msg.content });
    }
    throw new Error("Research did not finish after several resumed turns.");
  }

  async scan(profile) {
    const profileText = JSON.stringify(profile, null, 2);
    const leaveOut = [...(profile.wants ?? []), ...(profile.hard_nos ?? [])].join("; ") || "none stated";
    const [expected, unexpected] = await Promise.all([
      this.#research(RESEARCH_EXPECTED_SYSTEM, `Candidate profile:\n${profileText}`),
      this.#research(RESEARCH_UNEXPECTED_SYSTEM,
        `Candidate profile:\n${profileText}\n\nSectors to leave out: ${leaveOut}`),
    ]);
    this.log("research done", { expected: expected.length, unexpected: unexpected.length });
    return this.#structured(FORMAT_SYSTEM,
      `Candidate profile:\n${profileText}\n\n## Expected and adjacent\n${expected}\n\n## Unexpected\n${unexpected}`,
      SCAN_SCHEMA);
  }
}
