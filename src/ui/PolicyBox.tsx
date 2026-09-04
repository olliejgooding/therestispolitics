import { useEffect, useState } from 'react';
import { policyContext } from '../llm/context';
import { MAX_POLICY_TEXT, type PolicyProposal } from '../llm/policy';
import { llm } from '../llm/provider';
import type { Game } from '../sim/game';
import { BLOC_INFO, LEVER_META, type BlocId, type Levers } from '../sim/types';

const STOCK_LABEL: Record<string, string> = {
  outputGap: 'Demand', inflation: 'Inflation', inflationExpectations: 'Inflation expectations', debt: 'Debt £bn', riskPremium: 'Gilt premium',
  businessConfidence: 'Business confidence', netMigration: 'Migration', integration: 'Integration', cohesion: 'Cohesion', gini: 'Inequality',
  housePriceToIncome: 'House prices', nhsQuality: 'NHS', educationQuality: 'Education', crime: 'Crime', happiness: 'Happiness',
  pressFreedom: 'Press freedom', judicialIndependence: 'Judiciary', cbIndependence: 'Bank independence', corruption: 'Corruption', trust: 'Trust',
  internationalStanding: 'Standing', energySecurity: 'Energy security', emissions: 'Emissions', partyUnity: 'Party unity', unrest: 'Unrest',
  humanCapital: 'Skills', infrastructure: 'Infrastructure stock',
};
const LOWER_IS_GOOD = new Set(['inflation', 'inflationExpectations', 'debt', 'riskPremium', 'gini', 'housePriceToIncome', 'crime', 'corruption', 'emissions', 'unrest']);

const EXAMPLES = ['Introduce a land value tax to replace council tax', 'Nationalise the railways', 'Raise the state pension age to 68 from 2030', 'A national insulation programme for every home', 'Cut corporation tax for small businesses', 'Free school meals for all primary pupils'];

export function PolicyBox({ game, onApplied }: { game: Game; onApplied: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<PolicyProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [up, setUp] = useState(false);
  useEffect(() => {
    llm.available().then(setUp);
  }, []);
  if (!up) return null;
  const used = game.proposalsThisTurn >= 1;
  const applied = game.log.length ? game.log[game.log.length - 1].proposal : undefined;

  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    setProposal(null);
    const p = await llm.policy(policyContext(game, t.slice(0, MAX_POLICY_TEXT)));
    setBusy(false);
    if (!p) setError('The Treasury could not make sense of that. Try again, or rephrase.');
    else setProposal(p);
  };
  const confirm = () => {
    if (!proposal) return;
    game.applyProposal(proposal, text.trim());
    setProposal(null);
    setText('');
    onApplied();
  };

  return (
    <div className="panel policy" data-tour="policy">
      <h3>Propose a policy</h3>
      {used ? (
        <div className="muted" style={{ fontSize: 13 }}>
          One policy proposal per quarter. {applied ? <>This quarter: <b>{applied}</b>.</> : 'Enacted this quarter. The effects apply when you end the turn.'}
        </div>
      ) : (
        <>
          <p className="muted" style={{ margin: '0 0 8px', fontSize: 12 }}>
            Describe a policy in your own words. The Treasury will translate it into the model, within limits, and you decide whether to enact it.
          </p>
          <div className="policy-input">
            <textarea
              value={text}
              maxLength={MAX_POLICY_TEXT}
              placeholder={EXAMPLES[game.state.turn % EXAMPLES.length]}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={2}
            />
            <button className="btn" disabled={busy || !text.trim()} onClick={submit}>
              {busy ? 'Costing…' : 'Send to the Treasury'}
            </button>
          </div>
          {error && <div className="bad" style={{ fontSize: 12, marginTop: 6 }}>{error}</div>}
          {proposal && (
            <div className="proposal">
              <div className="proposal-head">
                <b>{proposal.title}</b>
                <span className={`conf ${proposal.confidence}`}>{proposal.confidence} confidence</span>
              </div>
              <p>{proposal.summary}</p>
              <p className="muted">{proposal.mechanism}</p>
              <div className="fx">
                {Object.entries(proposal.levers).map(([k, v]) => (
                  <span key={k}>{LEVER_META[k as keyof Levers].label} {v > 0 ? '+' : ''}{v}{LEVER_META[k as keyof Levers].unit === '%' ? 'pp' : ''}</span>
                ))}
                {Object.entries(proposal.stocks).map(([k, v]) => (
                  <span key={k} className={(LOWER_IS_GOOD.has(k) ? v < 0 : v > 0) ? 'up' : 'down'}>{STOCK_LABEL[k] ?? k} {v > 0 ? '+' : ''}{v}</span>
                ))}
                {Object.entries(proposal.blocs).map(([k, v]) => (
                  <span key={k} className={v > 0 ? 'up' : 'down'}>{BLOC_INFO[k as BlocId].short} {v > 0 ? '+' : ''}{v}</span>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                <b>Costing:</b> {proposal.costing}. {proposal.precedent && <><b>Precedent:</b> {proposal.precedent}</>}
              </div>
              {proposal.warning && <div className="warn" style={{ fontSize: 12, marginTop: 4 }}>⚠ {proposal.warning}</div>}
              {!proposal.feasible && <div className="bad" style={{ fontSize: 12, marginTop: 4 }}>The Treasury does not consider this a workable policy.</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button className="btn secondary" onClick={() => setProposal(null)}>Discard</button>
                <button className="btn" disabled={!proposal.feasible} onClick={confirm}>Enact</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
