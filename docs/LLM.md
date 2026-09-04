# Where an LLM makes the game better

The simulation is deterministic and numeric on purpose: that is what makes it teachable and
balanceable. An LLM should never *be* the model. It should sit on top of it in three roles:

1. **Narrator** — turn numbers into a country you can feel (headlines, voices, history).
2. **Interpreter** — turn the player's words into model inputs, and the model's numbers into
   explanations (free-text policy, advisers, tutor).
3. **Author** — generate content the engine then validates (cards, scenarios, opponents).

The rule that keeps all of this safe: **the engine never trusts a number from the LLM.** Text
flows freely; effects pass through a schema, get clamped to bounds, and are applied by the same
`applyEffects` path as hand-written cards.

The endpoint you have is an OpenAI-compatible Responses API (`gpt-5.6-luna` on Azure). Use its
structured-output / JSON-schema mode for everything that feeds the engine, and plain text for
narration.

---

## 1. Features, ranked by value ÷ effort

### Tier 1 — cheap, immediate variety (do first)

**1a. The morning papers.** After each turn the engine already produces a list of deltas and
template headlines. Send the structured deltas (not the whole state) and ask for three front pages
in fixed voices: a tabloid, a broadsheet, and a satirical weekly. The same recession reads
differently in each, which is the point: the player learns that the same facts land differently
with different blocs. Fallback: the template headlines that exist today.

```
input: { quarter, deltas: [{metric, from, to, tone}], decisions: [{card, option}], approval by bloc }
output: { tabloid: {headline, standfirst}, broadsheet: {...}, satirical: {...} }
```

**1b. Vox pops from the mosaic.** Click a citizen and get two sentences from someone in that bloc,
grounded in *their* decomposition (`blocContributions`). "I'm a nurse in Doncaster. The pay deal
helped but I can't get my mum a GP appointment." The bars already say why they are unhappy; the
LLM makes it human. Cache per (bloc, top-3 contributions, sign) so the same situation yields
consistent voices and you are not paying per click.

**1c. The history book.** On game over, a one-page retrospective in the voice of a future
historian, from the full election record and the start/end table. Different every run, memorable,
shareable. Also a shorter "annual review" at each Q4 for players who want it.

### Tier 2 — education with depth

**2a. Advisers you can talk to.** A Chancellor, Home Secretary, Chief Whip and the Governor of the
Bank, each with a persona and a *tool* that lets them query the engine: current state, any
decomposition, and a "what if" that runs `stepEconomy`/`stepPolitics` forward N quarters on a
copy with proposed lever changes. The Chancellor answering "what happens if I raise income tax
2p?" with actual numbers from the model is the best tutor the game can have. Advisers disagree
by design (the Whip cares about unity, the Governor about expectations), which teaches the
trade-offs.

The what-if tool is the important piece and it is pure engine code, no LLM: expose
`simulate(levers, quarters) → trajectory` and let the model call it.

**2b. Adaptive tutor.** The static tutorial is a fixed sequence. An LLM tutor watches the
decompositions each turn and, when the player is drifting (NHS falling three quarters running,
deficit above 5 with a positive gap), writes one Socratic nudge: a question, not an answer, with a
link to the entry. Rate-limited to one nudge per two quarters so it does not nag.

**2c. Explain this chart.** Any figure in the encyclopedia gets an "explain what I'm seeing"
button that sends the series and the entry's equation and asks for a two-paragraph reading of
*this* player's data. "Your points sit above the curve from 2027 to 2029: that is the energy shock
feeding through with expectations un-anchored."

### Tier 3 — player agency

**3a. Free-text policy.** A box: "Introduce a land value tax", "Nationalise the railways",
"Four-day week for the civil service". The LLM returns a structured proposal:

```
{ summary, mechanism (prose),
  levers: {progressivity: +10},            # bounded: each lever ±20% of its range per proposal
  stocks: {businessConfidence: -4, gini: -0.005},   # from an allowlist with per-key bounds
  blocs: {business: -4, young: +3},        # ±8
  costing: "≈0.4% of GDP a year", confidence: "medium",
  precedent: "Denmark 1920s, Pennsylvania split-rate" }
```

The player sees the mapping before confirming, so the LLM's judgement is inspectable and
arguable. The engine clamps everything; a second cheap call can act as a "Treasury reviewer"
that flags implausible costings. This one feature turns the game from multiple-choice into
governing.

**3b. Prime Minister's Questions.** Every fourth quarter the opposition leader (whose platform
vector and credibility you already have) asks a question aimed at your weakest issue score.
You answer in free text. A rubric-scored judge (facts consistent with the state? addresses the
question? tone?) moves opposition credibility and your trust by at most ±2. Small stakes, big
flavour, and it forces the player to actually read the dashboard.

**3c. Cabinet negotiations on cards.** Instead of three fixed options, a card can offer "propose
your own" which is 3a scoped to that event.

### Tier 4 — authored content

**4a. Generated event cards.** The engine decides *when* a card is needed and *what shape* it
should have (a crisis card with a fiscal, a monetary and an institutional option; a society card
with a costly-but-popular and a cheap-but-unpopular option). The LLM writes title, body and option
text *and* proposes effects within the schema; the engine clamps them and rejects any option whose
net approval effect is outside the band for that shape. This keeps balance where it is now while
making the deck effectively infinite. Ship the hand-written 43 as the model's few-shot examples.

**4b. Generated scenarios.** "What if Scotland votes to leave in 2031?" → a `Scenario` object:
state overrides (bounded), scripted cards (from the deck or newly generated via 4a), a lesson and
reading list. Run the headless harness on the result before offering it, and show the player the
steward win-rate as a difficulty rating.

**4c. Opposition leaders with personalities.** Generate a leader profile (background, style, a
signature line) from the platform vector when they change. Their PMQs questions and manifesto at
election time are written in that voice. Costs one call per leader change.

### Tier 5 — realism, offline

**5a. Calibration assistant.** Not in the game loop. A notebook that gives the model the equations
in `DESIGN.md` and asks it to propose coefficients with citations from ONS/OBR/BoE literature, then
runs the harness. Humans decide. Cheap way to sanity-check the 200 magic numbers in `model.ts`.

**5b. Card and entry review.** Ask the model to review each encyclopedia entry for economic errors
and each card for implausible effects, once, in CI.

---

## 2. Architecture

```
browser (React) ──► /api/*  (tiny backend, holds the key) ──► Azure OpenAI Responses API
     │                      │
     │                      └── validate JSON against schema, clamp, cache
     └── engine runs locally; LLM output applied via applyEffects()
```

- **Never put the key in the browser.** A ~150-line FastAPI (Python, matching your snippet) or
  Express server with one route per feature. Deploy anywhere that runs a container. The static
  site stays static; if the backend is down every feature falls back to templates.
- **Structured outputs.** For anything that touches the engine, pass a JSON schema and validate
  again server-side (pydantic / zod). Bounds live in one file shared by the validator and the
  UI's preview, e.g. `llm/bounds.ts`.
- **Context, not state.** Send the model a curated view (deltas, decompositions, the relevant
  entry text), never the raw 80-field state. Smaller, cheaper, and it cannot leak flags or RNG.
- **Latency.** Fire narration calls when the turn ends and render when they arrive; the deltas
  and template headlines show instantly. Advisers and free-text policy are interactive and can
  stream.
- **Cost.** Tier 1 is 1–2 calls per turn (~80 per game). Advisers are on demand. Cache vox pops
  and chart explanations by content hash. Budget maybe £0.10–0.30 per full game at current prices.
- **Determinism and saves.** Store generated text in the save file so reloads do not re-roll the
  papers. Generated cards get a stable id from a hash of their JSON.
- **Prompt injection.** Free-text policy is user input going to a model whose output feeds the
  engine. The schema and bounds are the defence; additionally, never let the model choose which
  lever keys exist, only values for known keys.

### Minimal interface in the client

```ts
export interface LlmProvider {
  papers(ctx: TurnContext): Promise<Papers | null>;
  voxPop(bloc: BlocId, contributions: Contribution[]): Promise<string | null>;
  advise(adviser: AdviserId, question: string, tools: EngineTools): AsyncIterable<string>;
  proposePolicy(text: string, ctx: PolicyContext): Promise<PolicyProposal | null>;
  writeCard(shape: CardShape, ctx: TurnContext): Promise<Card | null>;
}
export const NullProvider: LlmProvider = { /* every method resolves null */ };
```

Every call site handles `null` by using what exists today. That keeps the offline game intact
and makes each feature independently switchable.

---

## 3. Suggested order

1. Backend proxy + `papers` (1a). Half a day, and the game immediately feels alive.
2. `voxPop` (1b) and the history book (1c). Same plumbing.
3. Engine `simulate()` what-if tool, then advisers (2a). This is the educational leap.
4. Free-text policy (3a) with the preview-and-confirm UI.
5. Generated cards (4a) behind a "wild deck" toggle, validated by the harness.
6. PMQs (3b) and leader personalities (4c) once the opposition has a voice.

What I would not do: let the model set interest rates, simulate voters, or replace the equations.
The moment the numbers come from prose, the encyclopedia stops being true.
