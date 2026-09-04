import type { Effects } from '../sim/cards';
import type { DealtCard } from '../sim/game';
import { BLOC_INFO, LEVER_META, type BlocId, type Levers } from '../sim/types';
import { entryById } from '../edu/entries';

const STOCK_LABEL: Record<string, string> = {
  outputGap: 'Demand', inflation: 'Inflation', inflationExpectations: 'Inflation expectations', debt: 'Debt £bn', riskPremium: 'Gilt premium',
  businessConfidence: 'Business confidence', netMigration: 'Migration', integration: 'Integration', cohesion: 'Cohesion', gini: 'Inequality',
  housePriceToIncome: 'House prices', nhsQuality: 'NHS', educationQuality: 'Education', crime: 'Crime', happiness: 'Happiness',
  pressFreedom: 'Press freedom', judicialIndependence: 'Judiciary', cbIndependence: 'Bank independence', corruption: 'Corruption', trust: 'Trust',
  internationalStanding: 'Standing', energySecurity: 'Energy security', emissions: 'Emissions', partyUnity: 'Party unity', unrest: 'Unrest',
  sterling: 'Sterling', humanCapital: 'Skills', infrastructure: 'Infrastructure', honeymoon: 'Honeymoon', fatigue: 'Fatigue', energyPrice: 'Energy price',
};
const LOWER_IS_GOOD = new Set(['inflation', 'inflationExpectations', 'debt', 'riskPremium', 'gini', 'housePriceToIncome', 'crime', 'corruption', 'emissions', 'unrest', 'fatigue', 'energyPrice']);

/** Turn an Effects object into little coloured chips so the player can see the trade-off. */
function effectChips(e: Effects) {
  const chips: { text: string; tone: 'up' | 'down' | '' }[] = [];
  for (const [k, v] of Object.entries(e.stocks ?? {})) {
    const good = LOWER_IS_GOOD.has(k) ? (v as number) < 0 : (v as number) > 0;
    chips.push({ text: `${STOCK_LABEL[k] ?? k} ${(v as number) > 0 ? '+' : ''}${v}`, tone: good ? 'up' : 'down' });
  }
  for (const [k, v] of Object.entries(e.levers ?? {})) {
    chips.push({ text: `${LEVER_META[k as keyof Levers].label} ${(v as number) > 0 ? '+' : ''}${v}`, tone: '' });
  }
  for (const [k, v] of Object.entries(e.blocs ?? {})) {
    chips.push({ text: `${BLOC_INFO[k as BlocId].short} ${(v as number) > 0 ? '+' : ''}${v}`, tone: (v as number) > 0 ? 'up' : 'down' });
  }
  if (e.fn) chips.push({ text: 'depends on the situation', tone: '' });
  return chips;
}

export function CardView({ dealt, onChoose, onLearn }: { dealt: DealtCard; onChoose: (opt: number) => void; onLearn?: (id: string) => void }) {
  const c = dealt.card;
  return (
    <div className="card">
      <div className={`cat ${c.category}`}>
        {c.category}
        {c.learn && onLearn && (
          <span className="learn-links">
            {c.learn.map((id) => {
              const e = entryById(id);
              return e ? <button key={id} className="linkbtn" onClick={() => onLearn(id)}>? {e.title}</button> : null;
            })}
          </span>
        )}
      </div>
      <h2>{c.title}</h2>
      <p>{c.body}</p>
      <div className="options">
        {c.options.map((o, i) => (
          <button key={i} className={`option ${dealt.choice === i ? 'chosen' : ''}`} onClick={() => onChoose(i)}>
            <b>{o.label}</b>
            <small>{o.description}</small>
            <div className="fx">
              {effectChips(o.effects).map((ch, j) => (
                <span key={j} className={ch.tone}>
                  {ch.text}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
