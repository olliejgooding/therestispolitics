import { useEffect } from 'react';
import { TUTORIAL } from '../edu/tutorial';
import type { Game } from '../sim/game';

export function Coach({
  game,
  step,
  onNext,
  onSkip,
  onLearn,
  onTab,
}: {
  game: Game;
  step: number;
  onNext: () => void;
  onSkip: () => void;
  onLearn: (id: string) => void;
  onTab: (tab: 'decisions' | 'budget' | 'country' | 'systems' | 'learn') => void;
}) {
  const st = TUTORIAL[step];
  const ready = st ? st.when(game.state, game) : false;

  // spotlight the target panel
  useEffect(() => {
    if (!st || !ready || !st.target) return;
    const el = document.querySelector(`[data-tour="${st.target}"]`);
    el?.classList.add('spotlight');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => el?.classList.remove('spotlight');
  }, [st, ready]);

  if (!st || !ready) return null;
  const last = step === TUTORIAL.length - 1;
  return (
    <div className="coach">
      <div className="coach-head">
        <span className="muted">Tutorial {step + 1} / {TUTORIAL.length}</span>
        <button className="linkbtn" onClick={onSkip}>skip tutorial</button>
      </div>
      <h4>{st.title}</h4>
      <p>{st.text}</p>
      <div className="coach-actions">
        {st.tab && <button className="btn secondary" onClick={() => onTab(st.tab!)}>Open {st.tab} tab</button>}
        {st.learn && <button className="btn secondary" onClick={() => onLearn(st.learn!)}>Read more</button>}
        <button className="btn" onClick={onNext}>{last ? 'Finish' : 'Got it'}</button>
      </div>
    </div>
  );
}
