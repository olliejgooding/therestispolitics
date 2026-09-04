/**
 * The encyclopedia. Each entry: what the idea is, how the game models it, and how to use it to win.
 * Figures are drawn from the player's own history so theory and play are the same picture.
 */
import type { ReactNode } from 'react';
import { happinessComponents, structuralRevenue, taylorRate } from '../sim/model';
import type { Levers, State } from '../sim/types';
import { Curve, Lines, Scatter } from './figures';

export type EntryCategory = 'Primer' | 'Macro' | 'Fiscal' | 'Society' | 'Institutions' | 'Politics';

export interface Entry {
  id: string;
  title: string;
  category: EntryCategory;
  summary: string;
  body: string[];
  model: string;
  toWin: string[];
  related?: string[];
  metrics?: string[];
  levers?: (keyof Levers)[];
  figure?: (history: State[]) => ReactNode;
  figureCaption?: string;
}

const C = { blue: '#5b8cff', green: '#3ddc84', red: '#ff5c6c', amber: '#ffb347', purple: '#a06bff' };

export const ENTRIES: Entry[] = [
  // ------------------------------------------------------------------ primer
  {
    id: 'stocks-flows',
    title: 'Stocks and flows',
    category: 'Primer',
    summary: 'Everything on the dashboard is a bathtub. Levers change the taps, not the water level.',
    body: [
      'A stock is something that accumulates: the national debt, the housing stock, NHS capacity, trust in government. A flow is a rate that fills or drains it: the deficit, construction, funding minus need, scandals. Stocks change only through flows, so they lag. Turn a tap and the level responds over quarters or years, not instantly.',
      'This is why so much in the game feels slow and then sudden. Human capital takes a decade to build. Trust drains for years and then a scandal tips it. Debt compounds quietly until the bond market notices.',
      'When a number is going the wrong way, ask two questions. Which flow is draining it? And which flow could refill it? Every lever in the game is a tap on one or more flows.',
    ],
    model: 'stock[t+1] = stock[t] + (inflows − outflows) × dt      with dt = one quarter',
    toWin: ['Look at trends, not levels. A stock that is falling slowly will keep falling until you change a flow.', 'Fix flows early. Refilling a drained stock takes far longer than keeping it topped up.'],
    related: ['feedback-loops', 'nhs-need', 'human-capital'],
  },
  {
    id: 'feedback-loops',
    title: 'Feedback loops',
    category: 'Primer',
    summary: 'Balancing loops resist change; reinforcing loops run away. Most losses are a reinforcing loop nobody was watching.',
    body: [
      'A balancing loop pushes a system back toward some level. Inflation rises, the Bank raises rates, demand cools, inflation falls: the overheating loop. A reinforcing loop amplifies: debt raises the interest bill, which raises the deficit, which raises debt.',
      'The game is built from about a dozen named loops (see the Systems tab). Balancing loops make it forgiving: leave things alone and most metrics drift back toward normal. Reinforcing loops make it dangerous: the debt spiral, the austerity trap, the authoritarian trap, and the growth-migration loop all accelerate once started.',
      'Reinforcing loops usually have a threshold. Below it the balancing loops win and the system looks stable; above it the reinforcing loop dominates and the numbers get away from you. The risk premium at 2.5 and unrest at 60 are two such thresholds.',
    ],
    model: 'R loop: x → +y → +x (gain > 1 runs away)    B loop: x → +y → −x (settles at a goal)',
    toWin: ['Know where the thresholds are: debt premium 2.5, unrest 60 and 80, party unity 30, approval about 43 at the poll.', 'Break a reinforcing loop by hitting the weakest link, not the symptom.'],
    related: ['stocks-flows', 'debt-dynamics', 'institutions'],
  },
  // ------------------------------------------------------------------ macro
  {
    id: 'output-gap',
    title: 'The output gap',
    category: 'Macro',
    summary: 'Actual GDP versus what the economy could sustainably produce. Positive gaps mean inflation; negative gaps mean unemployment.',
    body: [
      'Potential GDP is the supply side: how much the country can produce with its workers, skills and capital. Actual GDP is demand. The gap between them, as a percentage of potential, is the single most important number in the macro model because both inflation and unemployment hang off it.',
      'Demand is pushed up by fiscal stimulus, business confidence, a weaker pound and world growth, and pushed down by real interest rates above neutral. Left alone the gap decays back toward zero at about half its size each year.',
      'Growth you see on the dashboard is a mix of two things: potential growth (productivity plus labour force, slow and structural) and changes in the gap (fast and cyclical). A 4% growth year during a boom is mostly the gap opening, and it will close again.',
    ],
    model: 'gap += (−0.5·gap + 0.25·(world − 2.8) + 1.2·(confidence − 50)/50 − 0.45·(realRate − 0.5)) × dt + fiscalImpulse\nGDP = potential × (1 + gap/100)',
    toWin: ['A gap above +1.5 will bring inflation and rate rises within a year. Cool it before the Bank does it for you.', 'A gap below −1.5 is a recession card waiting to happen. Stimulus works, but costs debt.'],
    related: ['phillips-curve', 'okun', 'fiscal-multiplier', 'productivity'],
    metrics: ['growth'],
    figure: (h) => <Lines history={h} yLabel="%" series={[{ name: 'Output gap', color: C.blue, get: (s) => s.outputGap }, { name: 'Growth (ann.)', color: C.green, get: (s) => s.growth }, { name: 'Potential growth', color: C.amber, get: (s) => s.productivityGrowth - 0.25 + (s.netMigration * 0.8) / s.workingAgePop / 10 }]} />,
    figureCaption: 'Your output gap against measured growth. Growth swings; the gap tells you why.',
  },
  {
    id: 'productivity',
    title: 'Productivity and potential growth',
    category: 'Macro',
    summary: 'The slow engine. Skills, infrastructure, investment and the rule of law compound into how fast the country can grow.',
    body: [
      'Potential growth is productivity growth plus labour force growth. Labour force growth is negative in an ageing country unless migration fills the gap; productivity growth is what everything else feeds into.',
      'In the model productivity grows at a base 0.8% a year, plus contributions from human capital (education, with a long lag), the public infrastructure stock, business confidence, and judicial independence, minus corporation tax and corruption.',
      'Nothing here moves fast. A big education push takes ten years to reach productivity. That is precisely why governments under-invest in it, and why a player thinking four elections ahead has an edge.',
    ],
    model: 'productivityGrowth = 0.8 + 0.03·(humanCapital − 100) + 0.02·(infrastructure − 100) + 0.5·(confidence − 50)/50 − 0.02·(corpTax − 25) + 0.01·(judiciary − 80) − 0.01·(corruption − 20)',
    toWin: ['Infrastructure at 2.5% of GDP just maintains the stock. Above that, it grows and so does potential.', 'Every point of corporation tax above 25 costs 0.02% growth a year, forever. Every point of judicial independence lost costs half that.'],
    related: ['human-capital', 'business-confidence', 'output-gap'],
    metrics: ['productivityGrowth'],
    levers: ['infrastructure', 'education', 'corpTax'],
    figure: (h) => <Lines history={h} yLabel="index / %" series={[{ name: 'Human capital', color: C.blue, get: (s) => s.humanCapital }, { name: 'Infrastructure', color: C.amber, get: (s) => s.infrastructure }, { name: 'Productivity growth ×20', color: C.green, get: (s) => 80 + s.productivityGrowth * 20 }]} />,
  },
  {
    id: 'phillips-curve',
    title: 'The Phillips curve',
    category: 'Macro',
    summary: 'Hot economies push prices up. Inflation = expectations + a slope times the output gap + supply shocks.',
    body: [
      'A. W. Phillips noticed in 1958 that wages rose faster when unemployment was low. The modern version says inflation rises with the output gap, on top of whatever people already expect, plus shocks from energy and import prices.',
      'The slope matters. In the model each point of output gap adds half a point to inflation. The intercept matters more: if expectations drift up, the whole curve shifts and you get inflation without a boom. That is what happened in the 1970s and briefly in 2022.',
      'Supply shocks are the nasty case. An energy spike raises inflation while shrinking demand, so the Bank has to choose between fighting prices and protecting jobs. The scatter below will show your points moving off the curve during shocks and back on afterwards.',
    ],
    model: 'inflation → expectations + 0.5·gap + energyShock·(1 − energySecurity/100) + importShock',
    toWin: ['Inflation above 4 unsettles voters and expectations. Act on the gap early rather than waiting for the Bank.', 'Energy security shrinks the size of supply shocks. Green investment is inflation insurance.'],
    related: ['inflation-expectations', 'output-gap', 'taylor-rule', 'energy-security'],
    metrics: ['inflation'],
    figure: (h) => <Scatter history={h} x={(s) => s.outputGap} y={(s) => s.inflation} xLabel="Output gap (%)" yLabel="Inflation (%)" line={(x) => h[h.length - 1].inflationExpectations + 0.5 * x} />,
    figureCaption: 'Every quarter of your game as a point. The dashed line is today\'s curve; distance from it is expectations drift or supply shocks.',
  },
  {
    id: 'inflation-expectations',
    title: 'Expectations and credibility',
    category: 'Macro',
    summary: 'What people expect inflation to be becomes what it is. A credible central bank anchors expectations at 2%.',
    body: [
      'Wage claims, price lists and contracts are set on what people expect inflation to be. If they expect 2%, a shock washes out. If they expect 6%, they build 6% into everything and the shock becomes permanent.',
      'Credibility is the Bank of England\'s independence. At full independence expectations are pulled back toward the 2% target; as independence erodes they chase actual inflation instead. Leaning on the Bank buys a lower rate today and a higher intercept on the Phillips curve tomorrow.',
      'This is the reinforcing loop behind stagflation: inflation up, expectations up, inflation stays up even as the economy weakens.',
    ],
    model: 'E += (cred·(2 − E)·0.6 + (1 − cred)·(inflation − E)·1.2) × dt      cred = cbIndependence/100',
    toWin: ['Never take the "lean on the Governor" options unless you have already lost the inflation fight. The cost persists for years.', 'When expectations are above 3, inflation will not come down on its own. You need a negative gap or luck.'],
    related: ['phillips-curve', 'taylor-rule', 'institutions'],
    metrics: ['inflation', 'cbIndependence'],
    figure: (h) => <Lines history={h} yLabel="%" series={[{ name: 'Inflation', color: C.red, get: (s) => s.inflation }, { name: 'Expectations', color: C.amber, get: (s) => s.inflationExpectations }, { name: 'Target', color: '#3a4050', get: () => 2 }]} />,
  },
  {
    id: 'okun',
    title: "Okun's law and the NAIRU",
    category: 'Macro',
    summary: 'Unemployment tracks the output gap around a structural rate that policy can move.',
    body: [
      'Arthur Okun observed that each point of output gap moves unemployment by roughly half a point the other way. The centre of that relationship is the NAIRU, the unemployment rate the economy settles at when the gap is zero.',
      'The NAIRU is not fixed. Generous welfare raises it (people can wait longer for a job); skills lower it (people match jobs faster); high crime raises it. Minimum-wage rises nudge it up a little.',
      'So there are two kinds of unemployment problem. Cyclical unemployment is fixed with demand. Structural unemployment is fixed with skills, welfare design and time, and stimulus will only cause inflation.',
    ],
    model: 'NAIRU = 4.5 + 0.25·(welfare − 11) − 0.03·(humanCapital − 100) + 0.01·max(0, crime − 100)\nunemployment → NAIRU − 0.5·gap',
    toWin: ['Before you stimulate, check the gap. If it is near zero and unemployment is high, the problem is structural.', 'Every 0.4% of GDP on welfare adds 0.1 to structural unemployment. Balance that against the inequality and unrest it buys down.'],
    related: ['output-gap', 'human-capital', 'inequality'],
    metrics: ['unemployment'],
    levers: ['welfare', 'education'],
    figure: (h) => <Scatter history={h} x={(s) => s.outputGap} y={(s) => s.unemployment} xLabel="Output gap (%)" yLabel="Unemployment (%)" line={(x) => h[h.length - 1].nairu - 0.5 * x} />,
    figureCaption: 'The dashed line is Okun\'s law around your current NAIRU.',
  },
  {
    id: 'taylor-rule',
    title: 'The Taylor rule',
    category: 'Macro',
    summary: 'How the Bank sets rates: neutral, plus a strong response to inflation, plus a response to the gap.',
    body: [
      'John Taylor wrote down a rule that describes what good central banks do: set the policy rate at neutral (real neutral plus target inflation), raise it 1.5 points for every point inflation is above target, and 0.5 points for every point of positive output gap. Because the inflation response is more than one for one, real rates rise when inflation rises, which is what actually cools the economy.',
      'In the game the Bank moves 40% of the way toward the rule rate each quarter, so it lags. If Bank independence falls below 60, the government leans on it and the rate is held below the rule.',
      'The rule is also why fiscal stimulus in a hot economy achieves nothing: the Bank offsets it with higher rates, and you are left with the debt.',
    ],
    model: 'rule = 2.5 + 1.5·(inflation − 2) + 0.5·gap\nbankRate → rule (40% per quarter), floor 0.1',
    toWin: ['You can predict next quarter\'s rate from the rule. If inflation is 4, the rule says 5.5%: expect mortgage pain and plan for it.', 'Rates above 5 upset young voters and workers. The way to lower them is lower inflation, not pressure on the Bank.'],
    related: ['phillips-curve', 'inflation-expectations', 'output-gap'],
    metrics: ['bankRate'],
    figure: (h) => <Lines history={h} yLabel="%" series={[{ name: 'Bank rate', color: C.blue, get: (s) => s.bankRate }, { name: 'Taylor rule', color: C.amber, get: (s) => taylorRate(s) }, { name: 'Inflation', color: C.red, get: (s) => s.inflation }]} />,
    figureCaption: 'Where the Bank is against where the rule says it should be. A persistent gap means political pressure.',
  },
  {
    id: 'sterling',
    title: 'Sterling and the trade channel',
    category: 'Macro',
    summary: 'The pound follows interest rates and confidence. A fall makes exports cheaper and imports dearer.',
    body: [
      'Currency traders chase yield and safety. Higher UK rates and strong business confidence pull sterling up; a rising gilt risk premium and high inflation push it down.',
      'A weaker pound helps demand through exports, then hurts through import prices, which feed straight into inflation. The 1992 and 2022 episodes both show how fast confidence can move it.',
      'A sterling crisis card fires when the index falls below 85. The options force you to choose between a rate rise (defend the currency, hurt growth) and letting it float (accept the inflation).',
    ],
    model: 'sterling → 100 + 2.5·(bankRate − 4) + 0.2·(confidence − 50) − 4·max(0, premium − 1.5) − 0.2·max(0, inflation − 4)\nimportShock = 3·(fall in sterling)/100',
    toWin: ['Watch the risk premium: it moves sterling, and sterling moves inflation. Fiscal credibility is currency policy.'],
    related: ['risk-premium', 'phillips-curve'],
    figure: (h) => <Lines history={h} yLabel="index / %" series={[{ name: 'Sterling', color: C.blue, get: (s) => s.sterling }, { name: 'Bank rate ×10', color: C.amber, get: (s) => s.bankRate * 10 + 60 }, { name: 'Risk premium ×10', color: C.red, get: (s) => s.riskPremium * 10 + 60 }]} />,
  },
  {
    id: 'business-confidence',
    title: 'Business confidence',
    category: 'Macro',
    summary: 'Animal spirits. Confidence drives both demand today and investment for productivity tomorrow.',
    body: [
      'Keynes called it animal spirits: firms invest when they feel the future is predictable and profitable. In the model, confidence rises with growth, strong courts, trust and international standing, and falls with corporation tax, unrest, inflation, a rising gilt premium and a punitive tax on top incomes.',
      'It matters twice. Confidence above 50 adds to demand this quarter, and it adds to productivity growth every quarter it stays high.',
      'It is also the channel through which institutional damage reaches the economy. Override the courts and confidence falls, then productivity, then revenue.',
    ],
    model: 'target = 50 + 0.3·(judiciary − 80) − 0.8·(corpTax − 25) − 0.25·(unrest − 20) + 0.15·(trust − 40) − 6·max(0, premium − 1.5) + 2·(growth − 1.3) − 0.5·max(0, inflation − 4) + 0.1·(standing − 65)',
    toWin: ['Cutting corporation tax below 25 buys confidence but costs revenue. The trade is close to neutral for the deficit if growth follows.', 'Stability is worth more to business than any tax rate. Do not churn policy.'],
    related: ['productivity', 'institutions', 'risk-premium'],
    metrics: ['businessConfidence'],
    levers: ['corpTax', 'progressivity'],
  },
  // ------------------------------------------------------------------ fiscal
  {
    id: 'fiscal-multiplier',
    title: 'The fiscal multiplier',
    category: 'Fiscal',
    summary: 'A pound of spending moves demand by more than a pound of tax cuts. Both move the deficit by the same pound.',
    body: [
      'When the government spends, the money is spent in full. When it cuts taxes, households save some of it. So the spending multiplier is larger, roughly 1 against 0.6 in the model. The impulse hits the output gap the quarter you change the levers, then decays as the Bank and the gap\'s own dynamics respond.',
      'Automatic stabilisers are the fiscal system\'s built-in balancing loop: in a slump revenue falls and benefits rise without anyone deciding anything, and the deficit widens to cushion demand. The dashboard deficit includes these cyclical effects; the structural deficit in the levers panel does not.',
      'The multiplier is only useful when there is slack. In a hot economy the Bank offsets your stimulus with rates and you simply add debt.',
    ],
    model: 'fiscalImpulse = 1.0·Δ(spending % GDP) − 0.6·Δ(tax % GDP)      (added to the output gap once)\ncyclical revenue = −0.35·gap;  cyclical benefits = 0.5·max(0, unemployment − NAIRU)',
    toWin: ['Stimulate in a recession, consolidate in a boom. Doing it the other way round is the classic way to lose.', 'A 1% of GDP investment package adds a point to the gap now and, via infrastructure, to potential later.'],
    related: ['output-gap', 'debt-dynamics', 'okun'],
    metrics: ['deficit'],
    levers: ['infrastructure', 'incomeTax'],
  },
  {
    id: 'debt-dynamics',
    title: 'Debt dynamics: r versus g',
    category: 'Fiscal',
    summary: 'If the interest rate on debt exceeds the growth rate of the economy, debt compounds unless you run a primary surplus.',
    body: [
      'The debt ratio changes by the primary deficit plus (r − g) times the existing ratio, where r is the average nominal interest rate on debt and g is nominal GDP growth. When g is above r, you can run modest deficits forever and the ratio still falls. When r is above g, even a balanced primary budget sees debt grow.',
      'The average rate on debt moves slowly because gilts have long maturities: in the model it converges on the current gilt yield over about eight years. That is a mercy when yields rise and a trap when they stay high.',
      'The reinforcing loop: higher debt raises the risk premium, which raises the yield, which raises r, which raises the deficit, which raises debt. It is slow at 95% of GDP and fast at 120%.',
    ],
    model: 'Δ(debt/GDP) ≈ primaryDeficit + (r − g)·debt/GDP\nr = avgDebtRate → giltYield (1/32 per quarter);  g = growth + inflation',
    toWin: ['Keep the primary deficit below (g − r) × debt ratio. With g ≈ 3.5% nominal and r ≈ 4%, at 100% debt that means a small primary surplus.', 'Growth is the best fiscal policy. Every point of nominal growth is worth a point of the debt ratio a year at 100%.'],
    related: ['risk-premium', 'fiscal-multiplier', 'laffer'],
    metrics: ['debtRatio', 'deficit', 'giltYield'],
    figure: (h) => <Lines history={h} yLabel="%" series={[{ name: 'r: avg rate on debt', color: C.red, get: (s) => s.avgDebtRate }, { name: 'g: nominal growth', color: C.green, get: (s) => s.growth + s.inflation }, { name: 'Primary deficit', color: C.amber, get: (s) => s.primaryDeficit }]} />,
    figureCaption: 'When the red line is above the green one, debt grows on its own.',
  },
  {
    id: 'risk-premium',
    title: 'The gilt market and the risk premium',
    category: 'Fiscal',
    summary: 'Investors charge more to lend to a government that looks unlikely to pay. That premium can spike overnight.',
    body: [
      'The gilt yield is the Bank rate plus a risk premium. The premium rises with debt above 90% of GDP, deficits above 3%, weak institutions and high inflation. In normal times it is a fraction of a point; in a crisis it can be several.',
      'Above 2.5 the Gilt Strike card appears. Fiscal consolidation brings the premium down fast but hurts voters; asking the Bank to buy gilts works briefly and erodes its independence; toughing it out is a bet that markets blink first. If the premium is above 6 for two quarters the IMF arrives and the game ends.',
      'The 2022 mini-budget is the textbook case: unfunded tax cuts, a spike in yields, pension funds in trouble, and a Prime Minister gone in 49 days.',
    ],
    model: 'premium → 0.3 + 0.05·max(0, debt − 90) + 0.2·max(0, deficit − 3) + 0.03·max(0, institutionalWeakness − 18) + 0.02·max(0, inflation − 4)',
    toWin: ['The premium is a leading indicator. When it passes 1.5, business confidence and sterling start to suffer before any card appears.', 'Institutional damage shows up here too. Overriding the courts is a fiscal decision.'],
    related: ['debt-dynamics', 'sterling', 'institutions'],
    metrics: ['giltYield', 'debtRatio'],
  },
  {
    id: 'laffer',
    title: 'The Laffer curve and tax bases',
    category: 'Fiscal',
    summary: 'Higher rates shrink the base a little. In the model the peak is far above any rate you would set, but the drag is real.',
    body: [
      'Arthur Laffer\'s napkin sketch says revenue is zero at a 0% rate and zero at a 100% rate, so somewhere in between there is a peak. The political question is which side of the peak you are on. Evidence for the UK puts the revenue-maximising income tax rate well above current levels; the game agrees.',
      'Each tax has its own base. Income tax and National Insurance raise about 16% of GDP at current rates, VAT about 7%, corporation tax about 3.5%. Raising a rate above its default shrinks its base by about 1.2% per point, so the last few points raise less than the first.',
      'Progressivity is separate: taxing top incomes and wealth harder raises a little revenue, lowers inequality meaningfully, and irritates business.',
    ],
    model: 'revenue = 16·(incomeTax/20)·laffer + 3.5·(corpTax/25)·laffer + 7·(vat/20)·laffer + progressivity term + 13 (other)\nlaffer = 1 − 0.012·max(0, rate − default)',
    toWin: ['Income tax is your biggest lever: one point is about 0.8% of GDP. VAT is 0.35% per point but hits prices.', 'Tax rises cost more approval per pound than spending cuts cost unrest. Mix both when consolidating.'],
    related: ['debt-dynamics', 'fiscal-multiplier', 'inequality'],
    levers: ['incomeTax', 'vat', 'corpTax', 'progressivity'],
    figure: (h) => {
      const s = h[h.length - 1];
      return <Curve from={10} to={35} marker={s.levers.incomeTax} fn={(r) => structuralRevenue({ ...s, levers: { ...s.levers, incomeTax: r } })} xLabel="Income tax rate (%)" yLabel="Revenue (% GDP)" />;
    },
    figureCaption: 'Total structural revenue as you move only the income tax rate. Flattening, not falling: you are on the left of the peak.',
  },
  // ------------------------------------------------------------------ society
  {
    id: 'migration',
    title: 'Migration and the labour force',
    category: 'Society',
    summary: 'Migrants add workers, growth and tax; they also add housing demand and, if arrivals outpace absorption, strain.',
    body: [
      'Net migration is openness times the pull of the UK economy: strong growth and low unemployment attract more people at any visa setting. At the default openness of 50 you get about 300,000 a year.',
      'Eighty percent of arrivals are working age, so migration raises potential growth directly. In an ageing country with a shrinking native workforce, it is the main reason the labour force grows at all.',
      'The costs are elsewhere: households need homes, so house prices rise unless construction keeps up; and integration is a stock that drains when the inflow is large relative to the resources put into absorbing it.',
    ],
    model: 'pull = 1 + 0.12·(growth − 1.3) − 0.08·(unemployment − 4.6)\nnetMigration → (openness/50)·300·pull      workingAgePop += 0.8·netMigration',
    toWin: ['Migration and planning go together. Raise openness without raising construction and young voters pay in rent.', 'Integration funding is cheap (0.1% of GDP) and it is the difference between growth and a populist wave.'],
    related: ['integration', 'housing', 'productivity'],
    metrics: ['netMigration'],
    levers: ['migrationOpenness', 'integration', 'planning'],
    figure: (h) => <Lines history={h} yLabel="k / index" series={[{ name: 'Net migration (k)', color: C.blue, get: (s) => s.netMigration }, { name: 'Integration', color: C.green, get: (s) => s.integration }, { name: 'Cohesion', color: C.amber, get: (s) => s.cohesion }]} />,
  },
  {
    id: 'integration',
    title: 'Integration and social cohesion',
    category: 'Society',
    summary: 'Integration is absorption minus strain. Cohesion is what a country can do together; it feeds happiness and holds off unrest.',
    body: [
      'Integration rises with programme funding and falls with the size of the inflow, housing pressure and unemployment. It is not about numbers alone: 300,000 arrivals with plentiful housing and jobs integrate; 300,000 into a housing shortage and a recession do not.',
      'Cohesion depends on integration, inequality, unemployment, trust and crime. Low cohesion raises crime, lowers happiness, feeds unrest and makes the migration issue politically toxic for the working class and pensioner blocs.',
      'Integration strain is a balancing loop on the growth-migration loop: it is how the system stops the country from growing its population faster than it can absorb. Ignore it and the correction arrives through politics instead.',
    ],
    model: 'integration += (6 + 6·(integrationSpend/0.1) − 8·(migration/300)·housingPressure − 0.6·max(0, unemployment − 5) − 0.3·(integration − 52)) × dt\ncohesion += (0.12·(integration − 55) − 40·(gini − 0.35) − (unemployment − 4.6) + 0.08·(trust − 40) − 0.3·(cohesion − 55) − 0.05·max(0, crime − 100)) × dt',
    toWin: ['Cohesion under 45 deals the riots card and starts the unrest clock. Cohesion under 50 invites a populist insurgency.', 'The migration issue score depends on integration, not just numbers. Fund integration and the same inflow becomes politically cheap.'],
    related: ['migration', 'unrest', 'inequality', 'happiness'],
    metrics: ['integration', 'cohesion'],
    levers: ['integration', 'migrationOpenness'],
  },
  {
    id: 'housing',
    title: 'Housing: supply, demand and credit',
    category: 'Society',
    summary: 'Prices relative to incomes rise when households form faster than homes get built, and when credit is cheap.',
    body: [
      'Households needed each year come from natural growth plus migration divided by household size, plus a backlog. Construction depends on planning liberalisation, mortgage rates and infrastructure. The gap between the two moves the house price to income ratio.',
      'Cheap credit adds a second channel: lower Bank rates raise what buyers can borrow, pushing prices up without any change in supply. Booms feel good to owners and terrible to renters.',
      'Affordability is the young bloc\'s biggest issue by far, and it feeds inequality (asset owners versus renters) and happiness. It is also the slowest social stock to fix, because homes take years to build.',
    ],
    model: 'construction = 0.2·(planning/50)^0.7·(1 − creditDrag)\nratio += (10·(householdsNeeded − construction) − 0.2·(bankRate − 4) − 0.15·(ratio − 8)) × dt',
    toWin: ['Planning at 100 roughly doubles construction and brings the ratio down about a point a year. Shire voters and pensioners will grumble; the young will notice.', 'Demand-side subsidies (help to buy) raise prices. They are a gift to owners paid for by the people you are trying to help.'],
    related: ['migration', 'inequality', 'voter-blocs'],
    metrics: ['housePriceToIncome'],
    levers: ['planning'],
    figure: (h) => <Lines history={h} yLabel="ratio / m homes" series={[{ name: 'Price / income', color: C.red, get: (s) => s.housePriceToIncome }, { name: 'Construction (m/yr) ×20', color: C.green, get: (s) => s.construction * 20 }, { name: 'Bank rate', color: C.amber, get: (s) => s.bankRate }]} />,
  },
  {
    id: 'nhs-need',
    title: 'The NHS and the ageing treadmill',
    category: 'Society',
    summary: 'Need grows about 1.5% a year with ageing. The same share of GDP buys a worse service every year unless the economy grows.',
    body: [
      'NHS quality in the model is funding relative to need. Need is an index that grows with the age structure and the population. Real funding is the NHS share of GDP times real GDP. So quality drifts down unless the share rises, the economy grows, or both.',
      'This is the Baumol problem in one line: health care is labour-intensive and demand rises with age, so it takes a rising share of a rich country\'s income to stand still. Every real-world government discovers this in its second year.',
      'Pensioners weight the NHS at a quarter of their whole judgement of you, and workers at a seventh. Quality below 45 deals the winter crisis card.',
    ],
    model: 'need ×= 1 + 0.015·dt + population growth\ntarget = 50 + 60·((nhsSpend/8)·(GDP/GDP₂₀₂₆)/need − 1)      quality → target slowly',
    toWin: ['Raise the NHS share by about 0.1 to 0.15% of GDP a year to hold quality. Growth does part of the work.', 'A one-off cash injection is a level shift; the treadmill keeps running. Budget for the trend.'],
    related: ['stocks-flows', 'voter-blocs', 'fiscal-multiplier'],
    metrics: ['nhsQuality'],
    levers: ['nhs'],
    figure: (h) => <Lines history={h} yLabel="index" series={[{ name: 'NHS quality', color: C.green, get: (s) => s.nhsQuality }, { name: 'Need index ×50', color: C.red, get: (s) => s.nhsNeed * 50 }, { name: 'NHS spend (% GDP) ×6', color: C.blue, get: (s) => s.levers.nhs * 6 }]} />,
  },
  {
    id: 'human-capital',
    title: 'Human capital and the long lag',
    category: 'Society',
    summary: 'Education quality today is productivity in ten years. Nothing in the game pays off more slowly or more surely.',
    body: [
      'Education quality is funding per pupil relative to 2026. Human capital is the stock it fills: it rises when quality is above 50 and falls when it is below, at a rate that means a decade of good schools adds a few points.',
      'Each point of human capital adds 0.03% a year to productivity growth and lowers the NAIRU. Small numbers, compounding forever.',
      'Cutting education is the most tempting consolidation because nothing visible happens for years. Then the productivity puzzle card arrives and the answer is that you cut the schools in 2027.',
    ],
    model: 'eduQuality → 50 + 60·((eduSpend/4.5)·(GDP/GDP₂₀₂₆)/(pop/pop₂₀₂₆) − 1)\nhumanCapital += 0.03·(eduQuality − 50) × dt',
    toWin: ['Education at 5% of GDP instead of 4.5% pushes quality to about 57 and human capital up a point every few years. Do it early.', 'Young voters and the public sector reward it now; business rewards it later.'],
    related: ['productivity', 'okun', 'stocks-flows'],
    metrics: ['educationQuality'],
    levers: ['education'],
  },
  {
    id: 'inequality',
    title: 'Inequality',
    category: 'Society',
    summary: 'The Gini coefficient: 0 is perfect equality, 1 is one person owning everything. The UK sits around 0.35.',
    body: [
      'Inequality rises with unemployment (the bottom loses first) and with house price growth (owners gain, renters do not). It falls with welfare spending, progressive taxation and, slowly, with education.',
      'Its effects run through cohesion, crime and happiness. Sixty points of happiness per unit of Gini sounds like a lot; a change from 0.35 to 0.38 costs about two points, comparable to a point of unemployment.',
      'It is a slow stock with strong mean reversion in the model, which means big changes need sustained policy, not one budget.',
    ],
    model: 'gini += (0.003·(unemployment − 4.6) + 0.004·Δ(house price ratio) − 0.004·(welfare − 11) − 0.01·(progressivity − 50)/50 − 0.0004·(eduQuality − 50) − 0.15·(gini − 0.35)) × dt',
    toWin: ['Progressivity is the cheapest lever on inequality, at the cost of business confidence. Push it to 70 and gini drifts down 0.01 or so.', 'A housing boom raises inequality quietly. Build.'],
    related: ['integration', 'happiness', 'laffer'],
    metrics: ['gini'],
    levers: ['progressivity', 'welfare'],
  },
  {
    id: 'happiness',
    title: 'Gross national happiness',
    category: 'Society',
    summary: 'A composite of what actually makes people\'s lives go well. It feeds every bloc\'s approval and the trust stock.',
    body: [
      'Bhutan measures Gross National Happiness; the UK\'s ONS measures wellbeing. The game builds a single index from real income growth, unemployment, inflation, NHS quality, crime, housing affordability, inequality, cohesion, trust and energy security.',
      'Everything is centred on 2026, and there is a 0.7 adaptation factor: people get used to things, so a permanent improvement gives less than its full first-year value. Happiness also moves only 30% of the way to its target each quarter.',
      'The decomposition below is the most useful tool in the game: it tells you which flow to fix.',
    ],
    model: 'target = 50 + 0.7·Σ contributions (each zero in 2026);  happiness → target (30%/quarter)',
    toWin: ['Read the decomposition. The largest negative bar is your next policy.', 'Unemployment and inflation dominate the short run; housing and the NHS dominate the long run.'],
    related: ['voter-blocs', 'inequality', 'nhs-need', 'housing'],
    metrics: ['happiness'],
    figure: (h) => {
      const s = h[h.length - 1];
      const items = happinessComponents(s);
      return <DecompFigure items={items} base={50} total={50 + items.reduce((a, c) => a + c.value, 0)} />;
    },
    figureCaption: 'Why happiness is what it is right now.',
  },
  {
    id: 'energy-security',
    title: 'Energy security and the climate lever',
    category: 'Society',
    summary: 'Green investment cuts emissions, but its game-changing effect is shrinking the inflation hit from global energy shocks.',
    body: [
      'Energy prices spike at random, about once every six years, and decay back over a year. The inflation effect is scaled by (1 − energySecurity/100), so a country with 80 energy security feels less than half the shock of one at 55.',
      'Green investment at 0.5% of GDP holds energy security flat; every extra 0.5% adds 2.5 points a year. Emissions fall 2% a year at the default and faster with more investment. The sustainability index combines both with the debt you leave behind.',
      'Politically the young care a lot and workers and pensioners care a little, negatively, about the cost. International standing rewards it.',
    ],
    model: 'energySecurity += (2.5·(green/0.5) − 2.5 − 0.02·(energySecurity − 55)) × dt\ninflation shock = 6·Δenergy/100·(1 − energySecurity/100)',
    toWin: ['Green at 1.0% of GDP for a decade is inflation insurance that pays for itself in the first energy shock.', 'The net zero backlash card is where you can lose the young for a term. Hold the course if you can afford to.'],
    related: ['phillips-curve', 'voter-blocs'],
    metrics: ['energySecurity', 'sustainability', 'emissions'],
    levers: ['green'],
  },
  // ------------------------------------------------------------------ institutions
  {
    id: 'institutions',
    title: 'Institutions and the authoritarian trap',
    category: 'Institutions',
    summary: 'A free press, independent courts and an independent Bank cost you in the short run and save you in the long run.',
    body: [
      'Institutional stocks only move through cards, because weakening them is a discrete political act. Each one is tempting: muzzle the press and hostile headlines fade; override the courts and your policy goes through; lean on the Bank and rates fall.',
      'The bill arrives later through three channels. Corruption grows faster in the dark and is exposed as scandals only when the press is free to expose it, so a muzzled press hides a growing stock that eventually detonates. Business confidence and the gilt premium respond to judicial independence. And expectations de-anchor when the Bank is not independent.',
      'This is the reinforcing loop: each step makes the next cheaper and the reckoning larger. Countries that go down it rarely walk back.',
    ],
    model: 'corruption += (2.5 − 0.02·press − 0.01·judiciary − 0.05·(corruption − 20)) × dt\nscandal chance = f(corruption × press)      premium += 0.03·max(0, institutionalWeakness − 18)',
    toWin: ['Take the boring option on institutional cards unless you are one quarter from an election you would otherwise lose.', 'The professional middle class and the young punish institutional damage directly; everyone else pays through the economy later.'],
    related: ['corruption', 'risk-premium', 'inflation-expectations', 'feedback-loops'],
    metrics: ['pressFreedom', 'judicialIndependence', 'cbIndependence'],
    figure: (h) => <Lines history={h} yLabel="index" series={[{ name: 'Press freedom', color: C.blue, get: (s) => s.pressFreedom }, { name: 'Judiciary', color: C.purple, get: (s) => s.judicialIndependence }, { name: 'Corruption', color: C.red, get: (s) => s.corruption }, { name: 'Trust', color: C.green, get: (s) => s.trust }]} />,
  },
  {
    id: 'corruption',
    title: 'Corruption, scandals and trust',
    category: 'Institutions',
    summary: 'Corruption accumulates unseen. Scandals are how it becomes visible, and trust is what they cost.',
    body: [
      'Corruption is a stock that grows at a base rate and is held down by press scrutiny and independent courts. It lowers productivity, international standing and trust directly, but its main effect is through scandals.',
      'A scandal card appears when corruption is above 25 and the press is free enough to find it. Cleaning house costs trust now and lowers corruption; loyalty costs more trust and lets the stock keep growing.',
      'Trust in government is the slowest political stock. It rises with happiness and press freedom, falls with inflation, corruption and policy churn, and reverts toward 40. Trust above 50 makes everything easier: attacks on the opposition land, and blocs forgive more.',
    ],
    model: 'trust += (0.08·(happiness − 50) − 0.8·max(0, inflation − 3) + 0.03·(press − 75) − 0.05·(corruption − 20) − 0.2·(trust − 40)) × dt − 0.3·policyFriction',
    toWin: ['Sack the minister. Always. The alternative is a bigger story next year.', 'Policy churn drains trust: every point of tax moved costs about 0.2 trust. Make changes rarely and explain them.'],
    related: ['institutions', 'happiness'],
    metrics: ['corruption', 'trust'],
  },
  // ------------------------------------------------------------------ politics
  {
    id: 'voter-blocs',
    title: 'The six voter blocs',
    category: 'Politics',
    summary: 'Voters are not one thing. Each bloc weighs the issues differently, and your approval is their size-weighted average.',
    body: [
      'Working class (24%) care about jobs, prices, the NHS, migration and crime. Professionals (20%) about growth, services, tax and institutions. Business (8%) about growth, the business climate and the public finances. Young renters (16%) about housing, jobs, climate and education. Pensioners (22%) about the NHS, prices, welfare, crime and migration. Public sector workers (10%) about service funding.',
      'Each bloc\'s approval chases a target of 45 plus a weighted sum of issue scores, plus its memory of your decisions (which fades by 12% a quarter), plus a honeymoon after wins, minus tenure fatigue. It moves 30% of the way each quarter.',
      'You cannot please everyone: business wants lower corporation tax, the public sector wants more spending, pensioners want less migration and business wants more. Winning is about assembling enough blocs, not all of them.',
    ],
    model: 'target_b = 45 + Σ w_b,i · score_i + 0.15·(happiness − 50) + 0.08·(trust − 40) + memory_b + honeymoon − fatigue\napproval = Σ size_b · approval_b',
    toWin: ['Open the "why" panel for your two weakest blocs. Their biggest negative bars are the issues the opposition is about to own.', 'Workers plus pensioners are 46% of the electorate. You do not have to win them, but you cannot lose both.'],
    related: ['opposition', 'elections', 'happiness'],
    metrics: ['nationalApproval'],
  },
  {
    id: 'opposition',
    title: 'The opposition',
    category: 'Politics',
    summary: 'The other party has a platform on four axes, a leader with credibility, and a strategy: chase the blocs you are losing.',
    body: [
      'Each bloc has an ideal position on tax-and-spend, migration, climate and law-and-order. The government\'s position is inferred from your levers and institutional record; the opposition\'s is its platform. A bloc leans toward whichever party is closer, and the opposition also gains from every issue where you are doing badly.',
      'Every fourth quarter the opposition moves its platform a quarter of the way toward the ideal of the blocs most unhappy with you. It is a balancing loop on your tenure: the longer you govern, the better positioned they become. Their credibility builds slowly, falls when they trail badly, and resets on a change of leader.',
      'This is why simply holding approval at 45 is not enough forever. The opposition adapts.',
    ],
    model: 'appeal_b = 38 + 5·(dist(gov, ideal_b) − dist(opp, ideal_b)) + 0.5·Σ w·max(0, −score) + 0.15·(cred − 45) + 0.6·fatigue (+3 new leader)',
    toWin: ['Watch the platform table. If they are moving toward the working class on migration, that bloc is your weak flank.', 'A new opposition leader gets a bounce. Attacking works only if your trust is above 45.'],
    related: ['voter-blocs', 'elections'],
  },
  {
    id: 'elections',
    title: 'Elections',
    category: 'Politics',
    summary: 'A contest, bloc by bloc, between your approval and the opposition\'s appeal, with a swing and campaign effects.',
    body: [
      'At each election every bloc splits between you (0.8 × approval + 4), the opposition (0.8 × appeal + 6) and others, with a national swing and bloc noise. You win if your size-weighted share beats theirs. In practice you need roughly four points of approval over their appeal.',
      'The campaign card in the election-year Q1 offers a tax cut (a sugar rush that raises the gilt premium), running on the record (a bonus scaled by happiness), or a culture-war campaign (turns out your base, poisons cohesion).',
      'A win halves nothing and resets little: fatigue drops by 40%, you get a four-point honeymoon that fades in a year, and the opposition changes leader. Then the clock starts again.',
    ],
    model: 'govShare = Σ size·(0.8·approval_b + 4 + campaign + swing)      oppShare = Σ size·(0.8·appeal_b + 6 − swing)',
    toWin: ['The last year before an election is when stocks cash out. Do the painful things in year one.', 'Do not run a culture-war campaign twice. Cohesion does not come back in time.'],
    related: ['voter-blocs', 'opposition', 'unrest'],
    metrics: ['nationalApproval', 'fatigue'],
  },
  {
    id: 'unrest',
    title: 'Unrest, party unity and the other ways to lose',
    category: 'Politics',
    summary: 'Elections are not the only exit. Your party can remove you, the streets can remove you, and the bond market can remove you.',
    body: [
      'Unrest is a stock fed by inflation above 4, unemployment above 6, low cohesion, low trust, low happiness and spending cuts. Policing drains it. Above 60 the disorder and emergency-powers cards appear; above 80 for three quarters you resign.',
      'Party unity rises with approval above 42 and falls with policy churn. Below 38 leadership rumbles begin; below 30 the letters go in. A confidence vote called early can buy a year of safety, if you can win it.',
      'The IMF condition is the gilt premium above 6 for two consecutive quarters. That only happens if you ignore a gilt strike.',
    ],
    model: 'unrest += 0.8·max(0, inflation − 4) + 1.2·max(0, unemployment − 6) + 0.12·max(0, 50 − cohesion) + 0.1·max(0, 35 − trust) + 0.08·max(0, 40 − happiness) + 3·cuts − 0.12·unrest − 1.5·(policing/2 − 1)\nunity += 0.2·(approval − 42) − 0.1·(unity − 55) − 0.8·friction',
    toWin: ['Austerity in a recession is the fastest route to 80 unrest: cuts add three points each per percent of GDP, on top of the unemployment.', 'Big lever changes hurt unity. Spread consolidation over several budgets.'],
    related: ['feedback-loops', 'integration', 'elections'],
    metrics: ['unrest', 'partyUnity'],
  },
];

// The decomposition figure needs the Decomp component but entries.tsx is imported by Learn; keep a thin wrapper here.
import { Decomp } from './figures';
function DecompFigure(props: { items: { label: string; value: number }[]; base: number; total: number }) {
  return <Decomp {...props} />;
}

export function entryById(id: string): Entry | undefined {
  return ENTRIES.find((e) => e.id === id);
}

export const CATEGORIES: EntryCategory[] = ['Primer', 'Macro', 'Fiscal', 'Society', 'Institutions', 'Politics'];
