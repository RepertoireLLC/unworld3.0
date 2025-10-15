import { useMemo, useState, useEffect } from 'react';
import { X, Flag, History, Users, Check, XCircle } from 'lucide-react';
import { useModalStore } from '../../store/modalStore';
import { useChessStore, type ChessGame, type ChessInvite } from '../../store/chessStore';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useToastStore } from '../../store/toastStore';
import { ChessBoard } from './ChessBoard';

const COMPLETED_STATUSES = new Set(['checkmate', 'stalemate', 'draw', 'resigned', 'timeout', 'complete']);

type InviteKind = 'incoming' | 'outgoing';

function formatDate(value: string | undefined) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return date.toLocaleString();
}

function describeResult(game: ChessGame, currentUserId: string | null) {
  if (!COMPLETED_STATUSES.has(game.status)) {
    return null;
  }
  if (game.result === '1-0') {
    const message = 'White wins';
    if (!currentUserId) return message;
    if (currentUserId === game.whiteUserId) return 'You won';
    if (currentUserId === game.blackUserId) return 'You lost';
    return message;
  }
  if (game.result === '0-1') {
    const message = 'Black wins';
    if (!currentUserId) return message;
    if (currentUserId === game.blackUserId) return 'You won';
    if (currentUserId === game.whiteUserId) return 'You lost';
    return message;
  }
  if (game.result === '1/2-1/2') {
    return game.drawReason ? `Draw · ${game.drawReason}` : 'Draw';
  }
  return null;
}

function groupMoves(game: ChessGame) {
  const rows: Array<{ moveNumber: number; white?: string; black?: string }> = [];
  game.moves.forEach((move) => {
    if (move.color === 'white') {
      rows.push({ moveNumber: move.moveNumber, white: move.san });
    } else {
      const current = rows[rows.length - 1];
      if (current && current.moveNumber === move.moveNumber) {
        current.black = move.san;
      } else {
        rows.push({ moveNumber: move.moveNumber, black: move.san });
      }
    }
  });
  return rows;
}

export function ChessOverlay() {
  const isOpen = useModalStore((state) => state.isChessOverlayOpen);
  const setOpen = useModalStore((state) => state.setChessOverlayOpen);
  const currentUser = useAuthStore((state) => state.user);
  const registeredUsers = useAuthStore((state) => state.registeredUsers);
  const users = useUserStore((state) => state.users);
  const invites = useChessStore((state) => state.invites);
  const games = useChessStore((state) => state.games);
  const activeGameId = useChessStore((state) => state.activeGameId);
  const setActiveGame = useChessStore((state) => state.setActiveGame);
  const acceptInvite = useChessStore((state) => state.acceptInvite);
  const declineInvite = useChessStore((state) => state.declineInvite);
  const cancelInvite = useChessStore((state) => state.cancelInvite);
  const resignGame = useChessStore((state) => state.resignGame);
  const hydrateChess = useChessStore((state) => state.hydrate);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    void hydrateChess();
  }, [hydrateChess]);

  const sortedGames = useMemo(() => {
    return Object.values(games).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [games]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (activeGameId && games[activeGameId]) {
      return;
    }
    const nextActive = sortedGames.find((game) => !COMPLETED_STATUSES.has(game.status)) ?? sortedGames[0];
    if (nextActive) {
      setActiveGame(nextActive.id);
    }
  }, [isOpen, activeGameId, games, sortedGames, setActiveGame]);

  const activeGame: ChessGame | undefined = activeGameId ? games[activeGameId] : undefined;
  const selectedGame = activeGame ?? sortedGames[0];

  const incomingInvites = useMemo(
    () => invites.filter((invite) => invite.toUserId === currentUser?.id),
    [invites, currentUser?.id]
  );
  const outgoingInvites = useMemo(
    () => invites.filter((invite) => invite.fromUserId === currentUser?.id),
    [invites, currentUser?.id]
  );

  const history = useMemo(() => {
    const entries = [...(currentUser?.chessProfile.history ?? [])];
    return entries.sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  }, [currentUser?.chessProfile.history]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    if (history.length > 0 && !selectedHistoryId) {
      setSelectedHistoryId(history[0].id);
    }
  }, [history, selectedHistoryId]);

  if (!isOpen || !currentUser) {
    return null;
  }

  const getUserName = (userId: string) => {
    if (userId === currentUser.id) {
      return currentUser.name;
    }
    return (
      users.find((user) => user.id === userId)?.name ??
      registeredUsers.find((user) => user.id === userId)?.name ??
      'Unknown operator'
    );
  };

  const handleAcceptInvite = async (invite: ChessInvite) => {
    const result = acceptInvite(invite.id, currentUser.id, {
      whiteName: getUserName(invite.fromUserId),
      blackName: getUserName(invite.toUserId),
    });
    if (!result.success) {
      addToast({
        title: 'Unable to accept invite',
        description: result.message ?? 'The chess invitation could not be accepted.',
        variant: 'error',
      });
      return;
    }
    if (result.gameId) {
      setActiveGame(result.gameId);
    }
    addToast({
      title: 'Game started',
      description: `Joined a match with ${getUserName(invite.fromUserId)}`,
      variant: 'success',
    });
  };

  const handleDeclineInvite = (invite: ChessInvite, kind: InviteKind) => {
    if (kind === 'incoming') {
      declineInvite(invite.id, currentUser.id);
      addToast({
        title: 'Invite declined',
        description: `Declined match from ${getUserName(invite.fromUserId)}`,
        variant: 'info',
      });
    } else {
      cancelInvite(invite.id);
      addToast({
        title: 'Invite cancelled',
        description: `Cancelled challenge to ${getUserName(invite.toUserId)}`,
        variant: 'info',
      });
    }
  };

  const handleResign = (game: ChessGame) => {
    resignGame(game.id, currentUser.id);
    addToast({
      title: 'Game resigned',
      description: 'Your opponent has been notified.',
      variant: 'warning',
    });
  };

  const selectedHistory = history.find((entry) => entry.id === selectedHistoryId) ?? history[0];

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur">
      <div className="ui-panel relative w-full max-w-6xl overflow-hidden">
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="ui-section-label">Multiplayer Matrix</p>
            <h2 className="ui-panel__title flex items-center gap-3">
              Harmonia Chess Relay
              <Users className="h-5 w-5 text-emerald-300" />
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ui-button ui-button--ghost"
            aria-label="Close chess module"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="ui-stack gap-6">
            {selectedGame ? (
              <div className="ui-panel ui-panel--muted">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="ui-section-label">Current Match</p>
                    <h3 className="text-lg font-semibold text-white">
                      {getUserName(selectedGame.whiteUserId)} vs {getUserName(selectedGame.blackUserId)}
                    </h3>
                    {describeResult(selectedGame, currentUser.id) && (
                      <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                        {describeResult(selectedGame, currentUser.id)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                    <span>Started {formatDate(selectedGame.startedAt)}</span>
                    <span className="text-white/30">•</span>
                    <span>Updated {formatDate(selectedGame.updatedAt)}</span>
                  </div>
                </div>
                <ChessBoard game={selectedGame} currentUserId={currentUser.id} />
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Result: {selectedGame.result ?? 'In progress'}
                  </div>
                  {selectedGame && !COMPLETED_STATUSES.has(selectedGame.status) &&
                    (selectedGame.whiteUserId === currentUser.id || selectedGame.blackUserId === currentUser.id) && (
                      <button
                        type="button"
                        onClick={() => handleResign(selectedGame)}
                        className="ui-button ui-button--ghost text-rose-300 hover:text-rose-100"
                      >
                        <Flag className="h-4 w-4" /> Resign
                      </button>
                    )}
                </div>
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                    <History className="h-4 w-4" /> Move Log
                  </div>
                  {selectedGame.moves.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto pr-2 text-sm">
                      <table className="w-full table-fixed text-left text-white/80">
                        <thead className="text-xs uppercase tracking-[0.3em] text-white/40">
                          <tr>
                            <th className="w-16">#</th>
                            <th className="w-32">White</th>
                            <th className="w-32">Black</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupMoves(selectedGame).map((row) => (
                            <tr key={row.moveNumber} className="border-t border-white/5">
                              <td className="py-1 text-white/50">{row.moveNumber}</td>
                              <td className="py-1 text-white">{row.white ?? ''}</td>
                              <td className="py-1 text-white">{row.black ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">No moves have been played yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="ui-panel ui-panel--muted text-center text-sm text-white/60">
                No games yet. Accept an invite to begin a match.
              </div>
            )}

            <div className="ui-panel ui-panel--muted">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
                All Games
              </h3>
              {sortedGames.length > 0 ? (
                <div className="ui-stack">
                  {sortedGames.map((game) => {
                    const playerLabel = `${getUserName(game.whiteUserId)} vs ${getUserName(game.blackUserId)}`;
                    const status = describeResult(game, currentUser.id) ??
                      (game.status === 'check' ? 'Check' : game.status.charAt(0).toUpperCase() + game.status.slice(1));
                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => setActiveGame(game.id)}
                        className={`ui-card text-left transition ${
                          activeGameId === game.id ? 'border-emerald-300/50 bg-emerald-400/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{playerLabel}</p>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/50">{status}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                            {formatDate(game.updatedAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/60">No matches recorded.</p>
              )}
            </div>
          </div>

          <div className="ui-stack gap-6">
            <section className="ui-panel ui-panel--muted">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
                  Invitations
                </h3>
                <span className="ui-chip">{incomingInvites.length + outgoingInvites.length} Active</span>
              </div>
              <div className="ui-stack gap-4">
                {incomingInvites.length === 0 && outgoingInvites.length === 0 && (
                  <p className="text-sm text-white/60">No pending invitations.</p>
                )}
                {incomingInvites.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-medium text-white">
                      Challenge from {getUserName(invite.fromUserId)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Received {formatDate(invite.createdAt)}
                    </p>
                    <div className="mt-3 flex gap-2 text-xs uppercase tracking-[0.3em]">
                      <button
                        type="button"
                        onClick={() => handleAcceptInvite(invite)}
                        className="ui-button ui-button--primary flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineInvite(invite, 'incoming')}
                        className="ui-button ui-button--ghost text-white/60 hover:text-white"
                      >
                        <XCircle className="h-4 w-4" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
                {outgoingInvites.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-medium text-white">
                      Waiting on {getUserName(invite.toUserId)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Sent {formatDate(invite.createdAt)}
                    </p>
                    <div className="mt-3 flex gap-2 text-xs uppercase tracking-[0.3em]">
                      <button
                        type="button"
                        onClick={() => handleDeclineInvite(invite, 'outgoing')}
                        className="ui-button ui-button--ghost text-white/60 hover:text-white"
                      >
                        <XCircle className="h-4 w-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ui-panel ui-panel--muted">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
                  Played Games
                </h3>
                <span className="ui-chip">{history.length}</span>
              </div>
              {history.length > 0 ? (
                <div className="ui-stack gap-4">
                  <div className="flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedHistoryId(item.id)}
                        className={`ui-card text-left transition ${
                          selectedHistoryId === item.id ? 'border-emerald-300/40 bg-emerald-300/10' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-white">
                          vs {item.opponentName} · {item.result.toUpperCase()}
                        </p>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                          {formatDate(item.endedAt)}
                        </p>
                      </button>
                    ))}
                  </div>
                  {selectedHistory && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                      <p className="font-medium text-white">{selectedHistory.metadata.white} vs {selectedHistory.metadata.black}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                        Result {selectedHistory.metadata.result} · {selectedHistory.metadata.date}
                      </p>
                      <div className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 font-mono text-xs text-white/70">
                        {selectedHistory.pgn}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/60">No completed matches yet.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
