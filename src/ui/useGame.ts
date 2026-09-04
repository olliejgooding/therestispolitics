import { useCallback, useEffect, useMemo, useState } from 'react';
import { cardContext, historyContext, papersContext } from '../llm/context';
import { llm } from '../llm/provider';
import { Game } from '../sim/game';
import type { Levers } from '../sim/types';

const KEY = 'trip-save-v2';

function load(): Game | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return Game.fromJSON(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useGame() {
  const [game, setGame] = useState<Game | null>(() => load());
  const [tick, setTick] = useState(0); // force re-render after mutating the game object
  const [papersLoading, setPapersLoading] = useState(false);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!game) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(game.toJSON()));
    } catch {
      /* ignore */
    }
  }, [game, tick]);

  // generated cards: when the narrator is up, one slot per hand is written from the situation
  const fill = useCallback(
    (g: Game) => {
      if (!g.pending.some((p) => p.loading)) return;
      const req = cardContext(g);
      g.generatedCategory = req.category;
      llm.card(req).then((card) => {
        if (g.pending.some((p) => p.loading)) {
          g.setGeneratedCard(card);
          bump();
        }
      });
    },
    [bump],
  );
  useEffect(() => {
    if (!game) return;
    llm.available().then((up) => {
      if (!up) return;
      game.wantGenerated = true;
      // a fresh or reloaded hand without a generated card: add the slot now
      if (!game.pending.some((p) => p.generated || p.loading) && game.status.kind === 'playing' && game.pending.length >= 2 && game.pending.every((p) => p.choice === null)) {
        game.pending[game.pending.length - 1] = { card: game.pending[game.pending.length - 1].card, choice: null, loading: true };
        bump();
      }
      fill(game);
    });
  }, [game, fill, bump]);

  const api = useMemo(
    () => ({
      game,
      setLevers: (patch: Partial<Levers>) => {
        game?.setLevers(patch);
        bump();
      },
      choose: (cardId: string, opt: number) => {
        game?.choose(cardId, opt);
        bump();
      },
      endTurn: () => {
        if (!game?.canEndTurn) return;
        const entry = game.endTurn();
        bump();
        fill(game);
        // narration is fire-and-forget: the turn is already resolved, the papers arrive when they arrive
        setPapersLoading(true);
        llm
          .papers(papersContext(game, entry))
          .then((p) => {
            entry.papers = p;
          })
          .finally(() => {
            setPapersLoading(false);
            bump();
          });
        if (game.status.kind !== 'playing' && !game.historyBook) {
          llm.history(historyContext(game)).then((h) => {
            if (h) {
              game.historyBook = h;
              bump();
            }
          });
        }
      },
      newGame: (scenario = 'standard', tutorial = false, seed?: number) => {
        localStorage.removeItem(KEY);
        setGame(new Game(seed ?? Date.now() % 100000, scenario, tutorial));
      },
      tutorialNext: () => {
        if (!game) return;
        game.tutorial = { ...game.tutorial, step: game.tutorial.step + 1 };
        bump();
      },
      tutorialSkip: () => {
        if (!game) return;
        game.tutorial = { enabled: false, step: 0 };
        bump();
      },
      abandon: () => {
        localStorage.removeItem(KEY);
        setGame(null);
      },
    }),
    [game, bump],
  );
  return { ...api, tick, papersLoading };
}
