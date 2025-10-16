import { useMemo } from 'react';
import { Eye, Sword, Download } from 'lucide-react';
import { useChessStore } from '../../store/chessStore';

interface ChessArchiveSectionProps {
  userId: string;
  onViewGame: (gameId: string) => void;
}

export function ChessArchiveSection({ userId, onViewGame }: ChessArchiveSectionProps) {
  const games = useChessStore((state) => state.getGamesForUser(userId));
  const refreshPGN = useChessStore((state) => state.refreshPGN);

  const completedGames = useMemo(() => games.filter((game) => game.status === 'complete'), [games]);
  const activeGames = useMemo(() => games.filter((game) => game.status === 'active'), [games]);

  const handleDownload = async (gameId: string) => {
    refreshPGN(gameId);
    const game = useChessStore.getState().games[gameId];
    if (!game) {
      return;
    }
    const blob = new Blob([game.pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${game.metadata.whiteName}_vs_${game.metadata.blackName}_${game.id}.pgn`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Chess Archive</p>
          <h3 className="text-lg font-semibold text-white">Recorded Matches</h3>
        </div>
        <Sword className="h-5 w-5 text-cyan-300" />
      </div>

      <div className="mt-4 space-y-3">
        {games.length === 0 ? (
          <p className="text-sm text-white/50">No chess encounters logged yet.</p>
        ) : (
          <>
            {activeGames.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Active</p>
                {activeGames.map((game) => (
                  <article
                    key={game.id}
                    className="flex items-center justify-between rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100"
                  >
                    <div>
                      <p className="font-medium">{game.metadata.whiteName} vs {game.metadata.blackName}</p>
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">In progress • Result {game.result}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewGame(game.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100 transition hover:bg-cyan-500/20"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </article>
                ))}
              </div>
            ) : null}

            {completedGames.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Completed</p>
                {completedGames.map((game) => (
                  <article
                    key={game.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white/80"
                  >
                    <div>
                      <p className="font-medium text-white">{game.metadata.whiteName} vs {game.metadata.blackName}</p>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/40">{game.resolution} • {game.result}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onViewGame(game.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:bg-white/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Replay
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(game.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/60 transition hover:bg-white/10"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PGN
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
