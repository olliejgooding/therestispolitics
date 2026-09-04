/**
 * Guided tutorial: a sequence of coach steps for a first term in office.
 * Each step waits for a trigger, points at a panel, and links to the encyclopedia.
 */
import type { Game } from '../sim/game';
import type { State } from '../sim/types';

export type TourTarget = 'policy' | 'dashboard' | 'levers' | 'cards' | 'headlines' | 'opposition' | 'endturn' | 'tabs' | 'metric-nhs' | 'metric-inflation' | 'metric-deficit' | 'metric-approval';

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
  /** which tab the step wants open */
  tab?: 'decisions' | 'people' | 'charts' | 'systems' | 'learn';
  target?: TourTarget;
  learn?: string;
  /** step only becomes available when this holds; earlier steps show first */
  when: (s: State, g: Game) => boolean;
}

export const TUTORIAL: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Number 10',
    text: 'You govern one quarter at a time. The left column is the state of the nation: every tile is a stock the model tracks, with an arrow for last quarter\'s change. Hover a tile for what drives it, and press its ? to read the full entry.',
    target: 'dashboard',
    when: () => true,
  },
  {
    id: 'levers',
    title: 'The budget is on the right',
    text: 'Tax rates and spending shares are sliders. The structural deficit updates as you move them. Big swings cost trust and party unity, so change things gently and rarely. Nothing happens until you end the quarter.',
    target: 'levers',
    learn: 'fiscal-multiplier',
    when: () => true,
  },
  {
    id: 'cards',
    title: 'Events demand decisions',
    text: 'Each quarter deals cards. Every option shows its effects as chips: green is good, red is bad, and the bloc chips show who will remember it. Pick one option per card, then end the quarter.',
    target: 'cards',
    when: () => true,
  },
  {
    id: 'headlines',
    title: 'Read the news, then the arrows',
    text: 'The headlines summarise what moved. The tiles now show deltas. Most stocks move slowly, so a small arrow in the wrong direction every quarter is the thing to worry about, not a big number today.',
    target: 'headlines',
    learn: 'stocks-flows',
    when: (s) => s.turn >= 1,
  },
  {
    id: 'nhs',
    title: 'The NHS treadmill',
    text: 'Watch the NHS tile. Need grows about 1.5% a year with ageing, so the same share of GDP buys a worse service every year. Plan to nudge NHS spending up by about 0.1% of GDP a year, or grow the economy faster than need.',
    target: 'metric-nhs',
    learn: 'nhs-need',
    when: (s) => s.turn >= 2,
  },
  {
    id: 'opposition',
    title: 'Someone wants your job',
    text: 'The opposition panel shows the poll, their leader, and both parties\' positions on four axes. Every year they shift toward the voters you are losing. Winning needs roughly four points of approval over their appeal.',
    target: 'opposition',
    learn: 'opposition',
    when: (s) => s.turn >= 3,
  },
  {
    id: 'policy',
    title: 'Or write your own',
    text: 'Below the cards you can propose any policy in your own words. The Treasury translates it into the model within strict limits, shows you the mapping and the costing, and you choose whether to enact it. One per quarter.',
    target: 'policy',
    when: (s) => s.turn >= 3,
  },
  {
    id: 'inflation',
    title: 'Prices and the Bank',
    text: 'Inflation follows expectations plus the output gap plus shocks. When it rises the Bank raises rates on a Taylor rule and demand cools. You cannot set rates, but you can avoid overheating the economy with stimulus when the gap is already positive.',
    target: 'metric-inflation',
    learn: 'phillips-curve',
    when: (s) => s.turn >= 4 || s.inflation > 4,
  },
  {
    id: 'why',
    title: 'Ask why',
    text: 'Open the Learn tab and choose "Why is it like this?". It breaks happiness and each bloc\'s mood into bars. The biggest red bar for your weakest bloc is the policy the opposition is about to own.',
    tab: 'learn',
    target: 'tabs',
    learn: 'why',
    when: (s) => s.turn >= 5,
  },
  {
    id: 'debt',
    title: 'The bond market is watching',
    text: 'Keep the deficit near 3% of GDP and the gilt premium below 2.5. If the average interest rate on debt is above nominal growth, debt compounds on its own. Consolidate in good years, not in recessions.',
    target: 'metric-deficit',
    learn: 'debt-dynamics',
    when: (s) => s.turn >= 7,
  },
  {
    id: 'charts',
    title: 'See the trends',
    text: 'The Charts tab shows every series since 2026 with elections marked. Slow drifts are easy to miss on tiles and obvious on charts.',
    tab: 'charts',
    target: 'tabs',
    when: (s) => s.turn >= 9,
  },
  {
    id: 'election-year',
    title: 'Election year',
    text: 'The election is next quarter. A campaign card lets you choose how to fight it. Stocks cash out now: whatever you fixed in year one is what voters see. Check the poll and the approval tile.',
    target: 'metric-approval',
    learn: 'elections',
    when: (s) => s.year === 2029 && s.quarter === 1,
  },
  {
    id: 'after-election',
    title: 'One down, three to go',
    text: 'Fatigue dropped by 40% and you have a short honeymoon, but the opposition has a new leader and a platform aimed at your weakest blocs. The same steady approach wins again: fund need, hold the deficit, keep institutions intact. You have finished the tutorial.',
    learn: 'voter-blocs',
    when: (s, g) => g.elections.length >= 1,
  },
];
