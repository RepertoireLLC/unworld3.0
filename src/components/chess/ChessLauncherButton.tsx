import { Crown } from 'lucide-react';
import { useModalStore } from '../../store/modalStore';
import { useChessStore } from '../../store/chessStore';
import { useEffect } from 'react';

export function ChessLauncherButton() {
  const setChessOpen = useModalStore((state) => state.setChessOverlayOpen);
  const hydrateChess = useChessStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateChess();
  }, [hydrateChess]);

  return (
    <button
      type="button"
      onClick={() => setChessOpen(true)}
      className="ui-button ui-button--ghost flex items-center gap-2 text-xs uppercase tracking-[0.3em]"
      aria-label="Open chess module"
    >
      <Crown className="h-4 w-4" />
      Chess
    </button>
  );
}
