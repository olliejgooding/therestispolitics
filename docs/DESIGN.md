# The Rest Is Politics — Systems Design

A turn-based game where you are Prime Minister of the UK from Q1 2026. Each turn is one
quarter. General elections fall in Q2 of 2029, 2034, 2039 and 2044. **You win by winning all
four.** You lose by losing an election, being toppled by your own party, being forced out by
mass protest, or by a gilt-market crisis that ends in an IMF programme.

The simulation is a **system-dynamics model**: a set of *stocks* (things that accumulate),
*flows* (rates that change stocks each quarter), and *feedback loops* (reinforcing "R" loops that
amplify, balancing "B" loops that stabilise). Every metric on the dashboard is either a stock or
a function of stocks. Player choices change flows, never stocks directly (with a couple of
deliberate exceptions for one-off shocks).

The macroeconomic core follows the same textbook logic Econland uses (output gap, Phillips curve,
Okun's law, Taylor rule, fiscal arithmetic), then extends outward into distribution, migration,
housing, public services, institutions, environment and politics.

---

## 1. Time and the turn loop

1. **Decide.** The player adjusts continuous *levers* (tax rates, spending shares, migration
   openness, planning policy, etc.) and picks one option from each *event card* dealt this turn.
2. **Simulate.** The engine advances one quarter: economy → society → institutions → politics.
3. **Report.** Metrics, charts, the population mosaic and headlines update. New cards are drawn
   based on the new state (cards have conditions, so crises produce crisis cards).
4. **Check.** Election in Q2 of an election year; lose conditions checked every turn.

Large lever changes carry a "policy friction" cost (a hit to approval and party unity) so the
optimal strategy is steady stewardship rather than slider-flipping.

---

## 2. Stocks (state variables)

### Economy
| Stock | Unit | Notes |
|---|---|---|
| `potentialGdp` | £bn/yr real | Supply side. Grows with productivity + labour force. |
| `outputGap` | % of potential | Demand relative to supply. Drives inflation and unemployment. |
| `productivity` | index (100 = 2026) | Slow-moving. Fed by human capital, infrastructure, business investment. |
| `infrastructure` | index | Public capital stock. Depreciates ~3%/yr. |
| `humanCapital` | index | Skills of the workforce. Education spending acts with a ~10 year lag. |
| `inflation` | % annualised | Phillips curve + supply shocks. |
| `inflationExpectations` | % | Anchored to 2% target with weight = central bank credibility. |
| `bankRate` | % | Set by the Bank of England via a Taylor rule (unless independence is eroded). |
| `debt` | £bn | Accumulates the deficit. |
| `avgDebtRate` | % | Effective interest on debt; moves slowly toward the gilt yield. |
| `riskPremium` | pp | Gilt yield over bank rate. Rises with debt, deficit, weak institutions. |
| `sterling` | index | Depreciation feeds import inflation, helps exports. |
| `energyPrice` | index | Exogenous shocks; energy security dampens them. |
| `businessConfidence` | 0–100 | Investment appetite. Hurt by instability, corp tax, unrest. |

### People
| Stock | Unit | Notes |
|---|---|---|
| `population` | m | |
| `workingAgePop` | m | Native ageing is a drag; migration is the inflow. |
| `netMigration` | k/yr | A flow, but shown as a headline metric. |
| `integration` | 0–100 | How well recent migrants are integrated. Falls when inflow outpaces absorption. |
| `cohesion` | 0–100 | Social trust between groups. |
| `gini` | 0–1 | Income/wealth inequality. |
| `housePriceToIncome` | ratio | Affordability. Supply vs demand (population, credit). |
| `housingStock` | m homes | Built by the construction flow. |
| `nhsQuality` | 0–100 | Capacity relative to need. Need grows with ageing + population. |
| `educationQuality` | 0–100 | Feeds human capital with a lag. |
| `crime` | index | Falls with policing and low unemployment/inequality. |
| `happiness` | 0–100 | Composite of the above (Gross National Happiness). |

### Institutions
| Stock | Notes |
|---|---|
| `pressFreedom` | Scrutiny. Weakening it hides scandals now, and makes them explode later. |
| `judicialIndependence` | Rule of law. Investor confidence, corruption control. |
| `cbIndependence` | Anchors inflation expectations. |
| `corruption` | Grows in the dark; exposed by press/courts. |
| `trust` | Trust in government. Slow to build, fast to lose. |
| `internationalStanding` | Trade, investment, soft power. |

### Environment
| Stock | Notes |
|---|---|
| `emissions` | Mt CO2e/yr; falls with green investment. |
| `energySecurity` | 0–100; reduces exposure to energy price shocks. |
| `sustainability` | composite index shown to player. |

### Politics
| Stock | Notes |
|---|---|
| `approval[bloc]` | Per voter bloc, 0–100. |
| `partyUnity` | 0–100. Below 30 triggers a leadership challenge. |
| `unrest` | 0–100. Above 80 for three consecutive quarters forces resignation. |
| `fatigue` | "Time for a change" pressure that rises every term in office. |

---

## 3. Flows and key equations (quarterly, dt = 0.25)

### 3.1 Supply side
```
laborGrowth        = working-age population growth
productivityGrowth = base
                   + a1*(humanCapital - 100)/100
                   + a2*(infrastructure - 100)/100
                   + a3*(businessConfidence - 50)/50
                   - a4*(corpTax - 25)/100
potentialGdp      += potentialGdp * (productivityGrowth + laborGrowth) * dt
```

### 3.2 Demand side (output gap)
```
fiscalImpulse    = multiplier_spend * Δ(spending/GDP) - multiplier_tax * Δ(tax/GDP)
monetaryDrag     = m * (realRate - neutralRate)
externalDemand   = x * worldGrowth + s * (sterling depreciation)
confidenceEffect = c * (businessConfidence - 50)/50
outputGap       += (-decay*outputGap + fiscalImpulse + externalDemand + confidenceEffect - monetaryDrag) * dt
gdp              = potentialGdp * (1 + outputGap/100)
```

### 3.3 Labour market (Okun)
```
nairu         = 4.5 + welfare effect - humanCapital effect + regulation effect
unemployment -> nairu - okun * outputGap   (with smoothing)
```

### 3.4 Prices (Phillips curve)
```
supplyShock   = e*(Δ energyPrice) + f*(Δ sterling)
inflation     = inflationExpectations + kappa*outputGap + supplyShock
expectations += (credibility*(2 - E) + (1-credibility)*(inflation - E)) * speed * dt
credibility   = cbIndependence/100
```

### 3.5 Monetary policy (Taylor rule, BoE independent)
```
target    = neutral + inflation + 0.5*(inflation - 2) + 0.5*outputGap
bankRate += (target - bankRate) * 0.5  (smoothed), floored at 0.1
```
If `cbIndependence` is eroded the government leans on the Bank, rates are held lower than the
rule implies, and expectations de-anchor.

### 3.6 Fiscal arithmetic
```
revenue   = incomeTax*wageBase + corpTax*profitBase + vat*consumptionBase + other
            (bases shrink slightly at high rates — a mild Laffer effect)
spending  = Σ programme shares * GDP + debtInterest + unemployment benefit(unemployment)
deficit   = spending - revenue                      (% of GDP shown)
debt     += deficit * dt
giltYield = bankRate + riskPremium
riskPremium -> base + k1*max(0, debt/GDP - 90) + k2*max(0, deficit% - 3) + k3*(institutional weakness)
avgDebtRate -> giltYield  (slowly: ~8 year average maturity)
```
**Debt spiral (R):** high debt → higher premium → more interest → higher deficit → more debt.
The balancing loop is the player cutting the primary deficit. A `riskPremium` above the crisis
threshold deals the *Gilt Strike* card; failing to respond ends in the IMF lose condition.

### 3.7 Migration
```
pull          = f(GDP growth, unemployment low)                # UK attractiveness
netMigration  = openness * pull * globalPush  (k/yr)
workingAgePop += netMigration * 0.8 * dt / 1000
absorption    = base + integrationFunding
integration  += (absorption - strain(netMigration/pop, housing pressure, unemployment)) * dt
cohesion     += (g1*(integration - 50) - g2*(gini - 0.35) - g3*(unemployment - 5) + g4*(trust - 50)) * dt
```
**Loops:**
- R: migration → labour force → growth → attractiveness → more migration.
- B: migration → housing pressure → affordability ↓ → young approval ↓ → pressure to build/close.
- B: integration strain → cohesion ↓ → anti-immigration sentiment → political pressure to close.
- Migration raises the fiscal balance and potential growth; low integration lowers cohesion,
  which lowers happiness and raises unrest.

### 3.8 Housing
```
construction   = base * planningLiberalisation * (1 - creditDrag(bankRate))
housingStock  += construction * dt
demandPressure = populationGrowth - (construction/housingStock) + creditBoost(-Δ bankRate)
housePriceToIncome += (demandPressure*h1 - meanReversion*(ratio - 5)) * dt
```
Affordability feeds happiness, gini (asset owners vs renters), and young bloc approval.

### 3.9 Public services
```
need         = population growth + ageing + (unemployment for welfare)
nhsQuality  += (nhsSpend/needIndex - depreciation) * dt
educationQuality similar; humanCapital += (educationQuality - 50) * lagRate * dt
crime       += (c1*unemployment + c2*gini + c3*(50 - cohesion) - c4*policing - decay*crime) * dt
```

### 3.10 Distribution
```
gini += ( +i1*unemployment_excess + i2*housePriceGrowth - i3*welfare
          - i4*progressivity - i5*educationQuality - reversion ) * dt
```

### 3.11 Institutions
```
corruption += (base - pressFreedom effect - judicial effect) * dt   # grows in the dark
scandalProb = corruption * pressFreedom                            # exposed only if press can expose
trust      += (governance - scandals - inflation pain - decay) * dt
businessConfidence <- judicialIndependence, stability, corpTax, unrest, riskPremium
```
**Authoritarian trap (R):** weaken press → fewer bad headlines → approval ↑ (short run) →
corruption ↑ (unseen) → investor confidence ↓, and when eventually exposed trust collapses.
Weakening institutions also raises `riskPremium`.

### 3.12 Environment
```
emissions      += (activity growth - greenInvestment*abatement) * dt
energySecurity += (greenInvestment*k - decay) * dt
energy shock exposure = (1 - energySecurity/100)
sustainability  = f(emissions trend, energySecurity, debt path)   # intergenerational
```

### 3.13 Happiness (GNH)
Weighted sum of: real income growth, unemployment (−), inflation (−), NHS quality, crime (−),
housing affordability (−), inequality (−), cohesion, trust, environment. Smoothed (adaptation).

### 3.14 Politics
Six voter blocs with sizes and preference weights:

| Bloc | Size | Cares most about |
|---|---|---|
| Working class | 24% | Jobs, prices, NHS, migration/cohesion, crime |
| Professional middle class | 20% | Growth, NHS, education, institutions, tax |
| Business & investors | 8% | Growth, corp tax, stability, rule of law, debt |
| Young renters | 16% | Housing, jobs, climate, education, cohesion |
| Pensioners | 22% | NHS, inflation, welfare, crime, stability |
| Public sector | 10% | Service funding, institutions |

```
blocApproval += ( target(Σ w_i * score_i) + cardMemory - blocApproval ) * adjustSpeed * dt - fatigue
partyUnity   += ( (nationalApproval - 40)*k - friction ) * dt
unrest       += ( inflow(inflation, unemployment, cohesion, trust, austerity cuts) - outflow(policing, decay) ) * dt
fatigue      += 0.4/yr while in office; partly reset by a fresh mandate
```
### 3.14a The fairness issue
Beyond the sixteen issue scores in 3.14 there is `fairness`: progressivity above 50, corporation
tax above 25 and a falling Gini all score positively for most blocs (workers, young, public
sector most; pensioners least), the mirror image of `businessClimate`. It captures the 2026
mood that the wealthy should pay to fix services, and gives the player a real choice between
the business bloc and everyone else.

### 3.15 The opposition
The opposition is an agent with a platform on four axes (tax & spend, migration, climate,
law & order), a leader, and a credibility stock. Each bloc has an ideal point on the axes; the
government's position is inferred from its levers and institutional record.
```
appeal_b = 38 + 5·(dist(gov, ideal_b) − dist(opp, ideal_b))     # spatial competition
             + 0.5·Σ w_b,i·max(0, −score_i)                    # capitalising on failures
             + 0.15·(credibility − 45) + 0.6·fatigue (+3 new-leader bounce)
```
Every Q4 the platform moves 25% toward the size-weighted ideal of the blocs most unhappy with
the government: **a balancing loop on tenure** — the longer you govern, the better positioned
they get. Leaders change when trailing badly and after election defeats.

**Election:** per bloc, gov share = 0.8·approval + 4 + campaign + swing; opp share =
0.8·appeal + 6 − swing. Win if size-weighted gov > opp. A win cuts `fatigue` by 40% and gives a
fading honeymoon.

### 3.16 Scenarios
A scenario is a starting-state override plus scripted cards on fixed turns, each with a stated
lesson and encyclopedia links: Britain 2026, Energy war, Fiscal cliff, Populist wave, Boom times,
Pandemic again. See `src/sim/scenarios.ts`.

### 3.17 Learning layer
`src/edu/entries.tsx` holds ~27 encyclopedia entries (what it is / in the model / how to win),
each with figures drawn from the player's own history (Phillips scatter, Okun scatter, Taylor
rule vs actual, Laffer curve, r-vs-g, etc.). `happinessComponents` and `blocContributions` /
`oppositionContributions` expose decompositions for the "Why is it like this?" tool. Metric
tiles, cards and loops link to entries with a `?`.

---

## 4. The loop map (what balances what)

| Loop | Type | Chain |
|---|---|---|
| Overheating | B | Gap ↑ → inflation ↑ → BoE rate ↑ → gap ↓ |
| Automatic stabilisers | B | Recession → unemployment ↑ → benefits ↑, tax ↓ → deficit ↑ → demand supported |
| Debt spiral | R | Debt ↑ → premium ↑ → interest ↑ → deficit ↑ → debt ↑ |
| Growth-migration | R | Growth → attractiveness → migration → labour → growth |
| Integration strain | B | Migration ↑ → integration ↓ → cohesion ↓ → political pressure → openness ↓ |
| Housing pressure | B | Population ↑ → prices ↑ → young anger, gini ↑ → pressure to build |
| Austerity trap | R | Cuts → services ↓ → happiness ↓ → unrest/approval ↓ → weaker mandate |
| Authoritarian trap | R | Press ↓ → corruption ↑ → confidence ↓ & delayed trust crash |
| Skills dividend | R | Education → human capital → productivity → revenue → education |
| Time-for-a-change | B | Tenure → fatigue ↑ → approval ↓ (limits dynasties) |
| Legitimacy | B | Approval low → unity ↓ → coup |

---

## 5. Levers (continuous)

Tax: income tax (basic effective), progressivity (higher-rate/wealth), corporation tax, VAT.
Spend (% GDP): NHS, education, welfare, infrastructure, defence, policing, green investment, integration.
Policy: migration openness (0–100), planning liberalisation (0–100).

## 6. Event cards

Cards are dealt by condition (e.g. `inflation > 6` deals *Cost of Living*, `riskPremium > 2.5`
deals *Gilt Strike*). Each option changes flows or stocks and has bloc-specific reactions.
Some cards are the *only* way to move institutional stocks (press, judiciary, BoE), because those
are discrete political acts.

## 7. Win / lose

- **Win:** win the 2029, 2034, 2039 and 2044 elections.
- **Lose — election:** vote share below the opposition at an election.
- **Lose — leadership challenge:** `partyUnity` < 30.
- **Lose — forced resignation:** `unrest` ≥ 80 for three consecutive quarters.
- **Lose — IMF bailout:** `riskPremium` ≥ 6 for two consecutive quarters (gilt strike unresolved).

## 8. Roadmap

v0.1: core loop, 6 blocs, ~30 cards, population mosaic, charts, headless harness.
v0.2: adaptive opposition, 6 scenarios, 43 cards, encyclopedia with live figures and
decomposition tools.
v0.3 (this build): realistic 2026 calibration with a populist opposition and the fairness issue,
guided tutorial, Simple/Full dashboard, Cloudflare Worker with the LLM narration layer (papers,
vox pops, history book). See ROADMAP.md for tiers and rules for further systems. Later: a real Parliament with rebels and votes, devolved nations, trade
deals, a Python calibration notebook against ONS/OBR series, guided tutorials per scenario, and
multiplayer "cabinet" mode.
