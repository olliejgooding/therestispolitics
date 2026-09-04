# Roadmap: adding depth without breaking the game

The failure mode for a game like this is well known: every new system adds a slider, a tile and
three cards, and after a year the player faces forty numbers and no idea which ones matter.
This document sets the rules that keep the game playable as it grows, the machinery that
enforces them, and the queue of systems in the order they should land.

## 1. The rules

**R1. Every system must be centred on 2026.** A new equation contributes zero at the starting
state, so "do nothing" stays roughly flat and the baseline balance run does not move. The
harness enforces it: `npm run sim -- passive 30` must stay within ±5 points of its current
win rate after any change. If it moves more, the change is a difficulty change and must be
declared as one.

**R2. Complexity budget per turn.** A player should face at most three discrete decisions and
have at most one budget review per quarter. The card dealer already caps hands at two plus a
scripted card; a new system may add cards to the deck but may not raise the cap. Free-text
policy, when it lands, replaces a card slot rather than adding one.

**R3. New levers are rare.** Fourteen sliders is already a lot. A new system should express
itself through existing levers, through cards, or through one new lever at most, and only if the
system is a tier the player has opted into (see R5). Every lever needs a default that reproduces
2026 behaviour.

**R4. Visible through the existing surfaces.** A new stock gets a metric tile (marked `core`
only if it decides elections), an encyclopedia entry with a live figure, a loop in the systems
map, an issue score if voters care, and a "why" decomposition if it is a composite. If a system
cannot be explained in one entry, it is two systems.

**R5. Progressive disclosure, not removal.** Systems are grouped into tiers. Tier 0 is always on.
Higher tiers are on by default in the scenarios that teach them and switchable in an
"Advanced systems" panel elsewhere. The dashboard's Simple view shows the 14 core tiles; Full
shows everything. Nothing is ever hidden from the encyclopedia.

**R6. Cards carry the flavour, equations carry the truth.** When a system needs texture
(names, places, arguments) it goes in cards or LLM narration. Equations stay small, legible and
documented in `DESIGN.md`. If a coefficient cannot be justified in a sentence, it is a guess and
should say so.

**R7. Balance is a test, not an opinion.** Before merging any system: the passive, steward,
random and reckless strategies on the standard scenario, the steward on every other scenario,
and the vitest sanity bands. Record the numbers in the README table.

## 2. Machinery that enforces the rules

- `scripts/headless.ts`: strategies × scenarios × seeds. Extend the steward as systems arrive so
  it remains a competent generic player.
- `src/sim/model.test.ts`: sanity bands (inflation, unemployment, gap, happiness) over 20 years.
- The `core` flag on metrics and the Simple/Full dashboard toggle (done).
- To add: a `tier` field on levers, cards and metrics, and an "Advanced systems" panel that
  toggles tiers per game. Card conditions already gate on state; tier gating is one more check
  in the dealer.
- To add: a balance CI job that runs the harness on every push and fails if the standard
  steward win rate leaves 60–85%.

## 3. Tiers

**Tier 0 — core (always on).** The macro loop, fiscal arithmetic, the six blocs, the adaptive
opposition, NHS need, housing, migration and integration, institutions, unrest. This is the
game as it stands.

**Tier 1 — texture (on by default).** LLM narration (papers, vox pops, history), generated
opposition leaders, the guided tutorial, scenario packs. None of it changes the numbers.

**Tier 2 — governing (opt-in per scenario).**
- *Parliament.* Backbench factions with their own ideal points on the four axes; big lever
  moves and institutional cards need a vote; rebellions cost unity and can amend the policy.
  Expresses through the existing unity stock plus one new "majority" stock. Cards: whips, free
  votes, confidence motions.
- *Free-text policy* (LLM interpreter, see LLM.md). Replaces one card slot. Bounded effects.
- *The Chancellor's fiscal rules.* A player-chosen rule (debt falling in year five, current
  balance) that the OBR-equivalent scores each budget; breaking it costs premium and trust,
  honouring it costs flexibility. No new lever; a new card family and one tile.

**Tier 3 — the wider country (opt-in).**
- *Nations and regions.* Scotland, Wales, Northern Ireland and the English regions as sub-blocs
  with a regional inequality stock and devolution settlement cards. Independence referendum as a
  lose condition variant. One new lever (regional investment share).
- *Trade and Europe.* An openness stock with an EU-alignment axis: alignment lowers trade
  friction and raises growth and migration; divergence buys sovereignty cards. Interacts with
  sterling and business confidence. One new lever.
- *Demographics.* Explicit age structure replacing the need index: births, ageing, dependency
  ratio, state pension age as a lever, care costs. Makes the NHS treadmill and the triple lock
  legible rather than assumed.

**Tier 4 — shocks and systems (opt-in, scenario-led).**
- *Energy system.* Generation mix, grid investment, price cap mechanics, replacing the single
  energy security stock. Lever: strike price / grid capex.
- *AI and automation.* A productivity stock with a displacement flow that raises structural
  unemployment in exposed sectors unless retraining keeps pace. Cards already exist; this makes
  them a system.
- *Media ecosystem.* Press freedom split into plurality, ownership and platform regulation, with
  misinformation as a flow into cohesion. Interacts with the authoritarian trap.
- *Climate impacts.* Flood and heat events with probability rising over the game horizon,
  hitting infrastructure and the NHS, dampened by adaptation spend.

**Tier 5 — play modes.** Cabinet multiplayer (each player one department, shared outcome),
opposition mode (play the other side), and historical starts (1979, 1997, 2010) once the
demographics and trade systems exist.

## 4. Status and the next three things

Done (v0.4): fiscal rules, Parliament, free-text policy. A lesson from building them: the
bisect harness (`git stash` a file, rerun 60 seeds) found that the OBR breach card, not the rule
itself, was the balance drag. Cards that fire on a state condition are the easiest way to
accidentally add a tax on the player; give them a cooldown of 12 and a cheap option.

1. **Demographics.** Replace the NHS need index and the welfare share with an age structure:
   births, ageing, dependency ratio, pension age as a lever, care costs. Unlocks the pension-age
   and social-care debates that dominate the real 2030s.
2. **Advisers with a what-if tool** (LLM.md tier 2a). The engine already exposes pure step
   functions; wrap `simulate(levers, quarters)` and let the Chancellor and Governor answer
   questions with real numbers.
3. **Nations and regions.** Sub-blocs with a regional inequality stock and devolution cards.

## 5. What "unplayable" looks like, so we can spot it

- A new player cannot say which three numbers they should watch. (Simple view must answer this.)
- The steward strategy's win rate drops below 60% without a deliberate difficulty change.
- Any turn where the right move is not findable from the "why" decomposition plus one entry.
- More than one crisis card in the same quarter, more than three quarters in a row.
- Any stock that moves more than 10 points in a quarter without a card explaining it.
