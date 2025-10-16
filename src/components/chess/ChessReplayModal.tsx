import { useMemo, useState } from 'react';
import { X, SkipBack, SkipForward, Rewind, FastForward, FileDown, Play } from 'lucide-react';
import { useChessStore } from '../../store/chessStore';
import { ChessBoard } from './ChessBoard';
import { createInitialPosition, generateLegalMoves } from '../../core/chess/engine';

export function ChessReplayModal() {
  const activeReplayId = useChessStore((state) => state.activeReplayId);
  const game = useChessStore((state) => (state.activeReplayId ? state.games[state.activeReplayId] : undefined));
  const setActiveReplay = useChessStore((state) => state.setActiveReplay);
  const refreshPGN = useChessStore((state) => state.refreshPGN);
  const [ply, setPly] = useState(0);

  const positions = useMemo(() => {
    if (!game) {
      return [] as ReturnType<typeof createInitialPosition>[];
    }
    const snapshots: ReturnType<typeof createInitialPosition>[] = [createInitialPosition()];
    game.moves.forEach((move, index) => {
      if (index === 0) {
        snapshots.push(move.resultingPosition);
      } else {
        snapshots.push(move.resultingPosition);
      }
    });
    return snapshots;
  }, [game]);

  const currentPosition = positions[ply] ?? positions.at(-1) ?? createInitialPosition();
  const lastMove = game?.moves[ply - 1] ?? null;
  const legalMoves = useMemo(() => generateLegalMoves(currentPosition), [currentPosition]);

  const handleClose = () => {
    setActiveReplay(null);
    setPly(0);
  };

  const goToStart = () => setPly(0);
  const goToEnd = () => setPly(Math.max(positions.length - 1, 0));
  const stepForward = () => setPly((prev) => Math.min(prev + 1, Math.max(positions.length - 1, 0)));
  const stepBackward = () => setPly((prev) => Math.max(prev - 1, 0));

  const handleCopyPGN = async () => {
    if (!game) {
      return;
    }
    refreshPGN(game.id);
    const updated = useChessStore.getState().games[game.id];
    try {
      await navigator.clipboard.writeText(updated?.pgn ?? '');
    } catch (error) {
      console.warn('Clipboard write failed', error);
    }
  };

  if (!activeReplayId || !game) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl">
      <div className="flex w-full max-w-5xl flex-col gap-6 rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-[0_30px_80px_rgba(12,74,110,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Chess Replay</p>
            <h2 className="text-xl font-semibold">{game.metadata.whiteName} vs {game.metadata.blackName}</h2>
            <p className="text-sm text-white/60">{game.resolution} • {game.result}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-white/10 bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Close chess replay"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-inner">
            <ChessBoard
              position={currentPosition}
              perspective="white"
              legalMoves={legalMoves}
              lastMove={lastMove ? { from: lastMove.from, to: lastMove.to } : null}
              disabled
            />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
              <h3 className="text-sm uppercase tracking-[0.3em] text-white/50">Move timeline</h3>
              <div className="mt-3 max-h-[320px] overflow-y-auto rounded-2xl bg-slate-950/60 p-3 text-sm">
                {game.moves.length === 0 ? (
                  <p className="text-white/40">No moves recorded.</p>
                ) : (
                  <ol className="space-y-1">
                    {game.moves.map((move, index) => (
                      <li
                        key={move.id}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 ${index + 1 === ply ? 'bg-cyan-500/15 text-cyan-100' : 'bg-white/5 text-white/80'}`}
                      >
                        <span className="font-medium">{move.moveNumber}{move.color === 'white' ? '.' : '…'} {move.san}</span>
                        <span className="text-xs uppercase tracking-[0.3em] text-white/40">{index + 1}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
              <h3 className="text-sm uppercase tracking-[0.3em] text-white/50">Controls</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={goToStart} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:bg-white/10">
                  <SkipBack className="h-4 w-4" />
                  Start
                </button>
                <button onClick={stepBackward} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:bg-white/10">
                  <Rewind className="h-4 w-4" />
                  Prev
                </button>
                <button onClick={stepForward} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:bg-white/10">
                  <FastForward className="h-4 w-4" />
                  Next
                </button>
                <button onClick={goToEnd} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:bg-white/10">
                  <SkipForward className="h-4 w-4" />
                  End
                </button>
                <button onClick={() => setPly((prev) => (prev === 0 ? Math.max(positions.length - 1, 0) : 0))} className="flex items-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-cyan-100 transition hover:bg-cyan-500/20">
                  <Play className="h-4 w-4" />
                  {ply === 0 ? 'Play All' : 'Reset'}
                </button>
                <button onClick={handleCopyPGN} className="flex items-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-cyan-100 transition hover:bg-cyan-500/20">
                  <FileDown className="h-4 w-4" />
                  Copy PGN
                </button>
              </div>
              <p className="mt-3 text-xs text-white/50">Viewing ply {ply} of {positions.length - 1}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
