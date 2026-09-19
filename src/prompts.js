// System prompts and JSON schemas for the three stages:
//   1. interview  - adaptive profiling conversation
//   2. research   - two web-search passes (expected fits / unexpected fits)
//   3. format     - research notes -> scan JSON, constrained by a schema

export const INTERVIEW_SYSTEM = `You run the profiling interview for "Career Scan", a tool that matches students and recent graduates with employers. The first message holds their documents (CV etc.) and a short intake form.

Goal: learn what you need to match them well, including to employers in other industries that need their underlying skills. Ask only what would change the match.

How to interview:
- One question at a time, short and plain. After each question, add in brackets what a good answer looks like, e.g. "(two concrete examples)" or "(one sentence is enough)".
- Never ask what the documents or the intake form already answer. Confirm briefly or fill gaps.
- Prefer revealed preference over self-rating: "Which internship would you repeat, and which part of it?" beats "Are you a team player?".
- For strengths, offer trade-offs between two equally attractive options ("own the client relationship" or "own the technical build"), never a good option against a bad one.
- Cover, skipping what is known: 2-3 experiences (what they owned, what they would do again), 1-2 trade-offs, environment and pace, sectors wanted and refused, geography and mobility, one aspiration (note it, hold it loosely), timing and constraints.
- Reflect back what you infer and let them correct it. About 6-10 questions in total.

When you have enough, write a short closing message and end it with this marker on its own line:
[[PROFILE_COMPLETE]]`;

export const PROFILE_SYSTEM = `Summarise the interview below into the candidate profile schema. Use only what the candidate said or what their documents show. Leave a field empty rather than guess.`;

export const PROFILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["education", "experience", "skills", "strengths", "wants", "hard_nos", "geography", "aspiration", "constraints", "pitch"],
  properties: {
    education: { type: "string", description: "degree, field, level, graduation timing" },
    experience: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["what", "owned", "signal"],
        properties: {
          what: { type: "string" },
          owned: { type: "string", description: "what they personally were responsible for" },
          signal: { type: "string", description: "what it says about them" },
        },
      },
    },
    skills: { type: "array", items: { type: "string" }, description: "transferable skills, phrased industry-neutrally" },
    strengths: { type: "array", items: { type: "string" } },
    wants: { type: "array", items: { type: "string" }, description: "sectors, environments, pace they want" },
    hard_nos: { type: "array", items: { type: "string" } },
    geography: { type: "string" },
    aspiration: { type: "string" },
    constraints: { type: "string" },
    pitch: { type: "string", description: "their sharpest one-line positioning" },
  },
};

const RESEARCH_RULES = `Use web search to ground every employer in reality. Name real companies with their homepage URL, never categories like "defence startups" or "companies such as X". Write compact notes: for each employer give name, homepage URL, location, what they do in one line, and why they fit this candidate in one line. Be honest about career realities (competition, pay, how people actually get hired there).`;

export const RESEARCH_EXPECTED_SYSTEM = `You are the matching engine of "Career Scan". Given a candidate profile, find two groups of employers:

1. OBVIOUS FITS (4-5): the employers this candidate would expect, chosen well.
2. ADJACENT (4-5): clearly connected to their experience, but a step they have probably not mapped.

${RESEARCH_RULES}`;

// The v0.3 prototype asked for all three groups in one pass. The "unexpected"
// group then stayed inside the sectors the candidate already named. A
// separate pass that is told to leave those sectors is what makes it work.
export const RESEARCH_UNEXPECTED_SYSTEM = `You are the discovery engine of "Career Scan". Find 4-5 employers in industries the candidate has NOT mentioned, where their underlying skills are in real demand.

Method:
1. Rewrite the candidate's skills in industry-neutral terms (e.g. "designs and debugs production lines" rather than "automotive intern").
2. Exclude every sector listed under "sectors to leave out".
3. Look for industries that need exactly those neutral skills, e.g. a production-line engineer is valuable for building a pharmaceutical plant. Prefer industries that are hiring.
4. For each employer, also give the skill bridge: one line naming the candidate's skill and the need it meets in that industry.

${RESEARCH_RULES}`;

export const FORMAT_SYSTEM = `Convert the research notes into the scan schema. Keep every named employer that has a homepage URL. Bucket keys: "obvious", "adjacent", "unexpected". Leave "bridge" empty except in the unexpected bucket. Do not add employers that are not in the notes.`;

const COMPANY = {
  type: "object", additionalProperties: false,
  required: ["name", "url", "location", "what", "why_fit", "bridge"],
  properties: {
    name: { type: "string" }, url: { type: "string" }, location: { type: "string" },
    what: { type: "string" }, why_fit: { type: "string" }, bridge: { type: "string" },
  },
};

export const SCAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "pitch", "buckets", "tradeoffs"],
  properties: {
    summary: { type: "string", description: "2-3 sentences on who this candidate is" },
    pitch: { type: "string" },
    buckets: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["key", "companies"],
        properties: {
          key: { type: "string", enum: ["obvious", "adjacent", "unexpected"] },
          companies: { type: "array", items: COMPANY },
        },
      },
    },
    tradeoffs: { type: "string", description: "one honest paragraph on the trade-offs between the paths" },
  },
};
