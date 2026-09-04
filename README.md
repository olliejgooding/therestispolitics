# The Rest Is Politics

A turn-based "run the UK" game built on a system-dynamics model: stocks, flows and feedback loops
for the economy, society, institutions, environment and politics. You are Prime Minister from
Q1 2026. Each turn is a quarter. Win the elections of 2029, 2034, 2039 and 2044 to win.

Play it: **https://therestispolitics.olliejgooding.workers.dev**

```bash
npm install
npm run dev        # play at http://localhost:5173
npm test           # vitest sanity/calibration tests
npm run sim -- steward 30 energy-war   # headless run: strategy (passive|steward|reckless|random), seeds, scenario
npm run build      # static site in dist/
npm run deploy     # build + wrangler deploy to Cloudflare Workers (static assets)
```

## Layout

| Path | What |
|---|---|
| `docs/DESIGN.md` | The systems design: every stock, flow, loop and equation. Start here. |
| `docs/LLM.md` | Where an LLM adds narrative, advisers, free-text policy and generated content, and the architecture to do it safely. |
| `src/edu/tutorial.ts` | The guided tutorial steps. |
| `src/sim/types.ts` | State shape, levers, voter blocs. |
| `src/sim/initial.ts` | UK in Q1 2026. |
| `src/sim/model.ts` | One quarter of economy / society / institutions / environment. Pure function. |
| `src/sim/politics.ts` | Issue scores → bloc approval, party unity, unrest; the adaptive opposition; elections. |
| `src/sim/cards.ts`, `cards-extra.ts` | 43 event cards with conditions, options and encyclopedia links. |
| `src/sim/scenarios.ts` | Scenario packs: starting state + scripted cards + the lesson each teaches. |
| `src/edu/` | The encyclopedia: entries with equations, "how to win" notes and live figures from your game. |
| `src/sim/game.ts` | Turn loop, card dealing, win/lose, save/load. |
| `scripts/headless.ts` | Balance harness with scripted strategies. |
| `src/ui/` | React front end: dashboard, levers, cards, population mosaic, charts, systems map. |

The engine has no UI dependencies, so it can run headless, in a worker, or be ported to a
Python backend for heavier calibration work.

## Learning how to win

Tick **Guided tutorial** on the new-game screen for a 12-step coach through the first term: it
waits for the right moment (first headlines, the NHS drifting, election year) and spotlights the
relevant panel with a link to the encyclopedia. Every `?` in the UI opens the encyclopedia entry for that metric, card or loop. The **Learn** tab
also has a *Why is it like this?* tool that decomposes happiness, each bloc's approval and the
opposition's appeal into their contributing terms. Scenarios each state the lesson they teach.

## Balance (v0.2, 20 seeds each)

| Strategy / scenario | Wins |
|---|---|
| Steady stewardship, standard | ~85% |
| Steady stewardship, hard scenarios | 65–75% |
| Random card choices, levers untouched | 0% (lose by 2034–2039) |
| Tax cuts + spending rises | 0% (IMF or 2029 defeat) |

## Adding a system

1. Add stocks to `State` and starting values to `initial.ts`.
2. Add flows in `model.ts`, written as per-year rates × `DT`. Centre every term on the 2026 value
   so "do nothing" stays flat.
3. Expose it to voters via an issue score in `politics.ts` and weights in `BLOC_WEIGHTS`.
4. Add cards in `cards.ts` whose conditions fire when the new stock is out of range.
5. Add a tile in `ui/Metrics.tsx`, run `npm run sim -- passive 30` and check nothing drifts.
