import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!game) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(game.toJSON()));
    } catch {
      /* ignore */
    }
  }, [game, tick]);

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
        game.endTurn();
        bump();
      },
      newGame: (scenario = 'standard', seed?: number) => {
        localStorage.removeItem(KEY);
        setGame(new Game(seed ?? Date.now() % 100000, scenario));
      },
      abandon: () => {
        localStorage.removeItem(KEY);
        setGame(null);
      },
    }),
    [game, bump],
  );
  return { ...api, tick };
}
