import { useEffect, useMemo, useState } from 'react';
import { X, Flag, Handshake, Sword, FileDown, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { ChessBoard } from './ChessBoard';
import { useChessStore } from '../../store/chessStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { generateLegalMoves, type ChessColor, indexToAlgebraic } from '../../core/chess/engine';

export function ChessMatchModal() {
  const activeMatchId = useChessStore((state) => state.activeMatchId);
  const game = useChessStore((state) => (state.activeMatchId ? state.games[state.activeMatchId] : undefined));
  const setActiveMatch = useChessStore((state) => state.setActiveMatch);
  const makeMove = useChessStore((state) => state.makeMove);
  const resignGame = useChessStore((state) => state.resignGame);
  const offerDraw = useChessStore((state) => state.offerDraw);
  const respondToDraw = useChessStore((state) => state.respondToDraw);
  const refreshPGN = useChessStore((state) => state.refreshPGN);
  const currentUser = useAuthStore((state) => state.user);
  const [messageDraft, setMessageDraft] = useState('');
  const sendMessage = useChatStore((state) => state.sendMessage);
  const loadMessagesForChat = useChatStore((state) => state.loadMessagesForChat);
  const users = useUserStore((state) => state.users);

  useEffect(() => {
    if (game) {
      void loadMessagesForChat(game.whiteId, game.blackId);
    }
  }, [game?.whiteId, game?.blackId, loadMessagesForChat]);

  const playerColor: ChessColor | null = useMemo(() => {
    if (!game || !currentUser) {
      return null;
    }
    if (game.whiteId === currentUser.id) {
      return 'white';
    }
    if (game.blackId === currentUser.id) {
      return 'black';
    }
    return null;
  }, [game, currentUser]);

  const orientation: ChessColor = playerColor ?? 'white';

  const legalMoves = useMemo(() => {
    if (!game || !playerColor) {
      return [];
    }
    if (game.status !== 'active') {
      return [];
    }
    if (game.position.activeColor !== playerColor) {
      return [];
    }
    return generateLegalMoves(game.position);
  }, [game, playerColor]);

  const lastMove = game?.moves.at(-1);

  const messages = useChatStore((state) =>
    game ? state.getMessagesForChat(game.whiteId, game.blackId) : []
  );

  const opponentId = useMemo(() => {
    if (!game || !currentUser) {
      return null;
    }
    return currentUser.id === game.whiteId ? game.blackId : game.whiteId;
  }, [game, currentUser]);

  const opponentName = useMemo(() => {
    if (!opponentId) {
      return 'Opponent';
    }
    return users.find((user) => user.id === opponentId)?.name ?? 'Opponent';
  }, [opponentId, users]);

  const handleClose = () => {
    setActiveMatch(null);
  };

  const handleMove = (from: number, to: number, promotion?: Parameters<typeof makeMove>[4]) => {
    if (!game || !currentUser) {
      return;
    }
    makeMove(game.id, currentUser.id, from, to, promotion);
  };

  const handleResign = () => {
    if (game && currentUser) {
      resignGame(game.id, currentUser.id);
    }
  };

  const handleOfferDraw = () => {
    if (game && currentUser) {
      offerDraw(game.id, currentUser.id);
    }
  };

  const handleDrawResponse = (accept: boolean) => {
    if (game && currentUser) {
      respondToDraw(game.id, currentUser.id, accept);
    }
  };

  const handleSendMessage = () => {
    if (!game || !currentUser || !opponentId) {
      return;
    }
    const trimmed = messageDraft.trim();
    if (trimmed.length === 0) {
      return;
    }
    sendMessage(currentUser.id, opponentId, trimmed);
    setMessageDraft('');
  };

  const handleCopyPGN = async () => {
    if (!game) {
      return;
    }
    refreshPGN(game.id);
    const text = useChessStore.getState().games[game.id]?.pgn ?? game.pgn;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn('Clipboard unavailable', error);
    }
  };

  const moveList = useMemo(() => {
    if (!game) {
      return [] as Array<{ move: number; white?: string; black?: string }>;
    }
    const rows: Array<{ move: number; white?: string; black?: string }> = [];
    game.moves.forEach((entry) => {
      if (entry.color === 'white') {
        rows.push({ move: entry.moveNumber, white: entry.san });
      } else {
        const lastRow = rows.at(-1);
        if (lastRow && lastRow.move === entry.moveNumber) {
          lastRow.black = entry.san;
        } else {
          rows.push({ move: entry.moveNumber, black: entry.san });
        }
      }
    });
    return rows;
  }, [game]);

  if (!activeMatchId || !game) {
    return null;
  }

  const isPlayerTurn = Boolean(playerColor && game.position.activeColor === playerColor && game.status === 'active');
  const statusLabel = (() => {
    if (game.status === 'active') {
      return game.position.activeColor === 'white' ? 'White to move' : 'Black to move';
    }
    switch (game.resolution) {
      case 'checkmate':
        return `Checkmate • ${game.result}`;
      case 'stalemate':
        return 'Stalemate';
      case 'draw-fifty-move':
        return 'Draw • Fifty-move rule';
      case 'draw-repetition':
        return 'Draw • Threefold repetition';
      case 'draw-agreement':
        return 'Draw agreed';
      case 'resigned':
        return `Resigned • ${game.result}`;
      default:
        return game.outcomeReason ?? 'Game complete';
    }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Harmonia Chess Match"
    >
      <div className="relative flex w-full max-w-6xl flex-col gap-6 overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/90 p-6 shadow-[0_40px_120px_rgba(14,165,233,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Harmonia Mesh Chess</p>
            <h2 className="text-2xl font-semibold text-white">{game.metadata.whiteName} vs {game.metadata.blackName}</h2>
            <p className="mt-1 text-sm text-white/60">{statusLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-white/10 bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Close chess interface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-inner">
              <div className="flex items-center justify-between text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-300" />
                  <span>{isPlayerTurn ? 'Your move' : 'Standby'}</span>
                </div>
                <span className="text-white/40">Result: {game.result}</span>
              </div>
              <ChessBoard
                position={game.position}
                perspective={orientation}
                legalMoves={legalMoves}
                lastMove={lastMove ? { from: lastMove.from, to: lastMove.to } : null}
                disabled={!isPlayerTurn}
                onSelectMove={handleMove}
              />
            </div>

            <div className="flex w-full flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResign}
                disabled={!currentUser || game.status !== 'active'}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Flag className="h-4 w-4" />
                Resign
              </button>
              <button
                type="button"
                onClick={handleOfferDraw}
                disabled={!currentUser || game.status !== 'active'}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Handshake className="h-4 w-4" />
                Offer Draw
              </button>
              <button
                type="button"
                onClick={handleCopyPGN}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
              >
                <FileDown className="h-4 w-4" />
                Copy PGN
              </button>
            </div>

            {game.pendingDrawOffer && currentUser && game.pendingDrawOffer.by !== currentUser.id ? (
              <div className="w-full rounded-2xl border border-amber-400/40 bg-amber-500/15 p-4 text-amber-100">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Handshake className="h-4 w-4" />
                  Draw offer pending
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleDrawResponse(true)}
                    className="flex-1 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDrawResponse(false)}
                    className="flex-1 rounded-xl bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-[420px] flex-col gap-4">
            <div className="flex-1 rounded-3xl border border-white/10 bg-slate-900/60 p-4">
              <h3 className="text-sm uppercase tracking-[0.3em] text-white/50">Move log</h3>
              <div className="mt-3 max-h-[280px] overflow-y-auto rounded-2xl bg-slate-950/60 p-3 text-sm">
                {moveList.length === 0 ? (
                  <p className="text-white/40">No moves recorded yet.</p>
                ) : (
                  <table className="w-full text-left text-white/80">
                    <tbody>
                      {moveList.map((row) => (
                        <tr key={row.move} className="border-b border-white/5 last:border-none">
                          <td className="py-1 pr-3 text-white/50">{row.move}.</td>
                          <td className="py-1 pr-3">{row.white ?? ''}</td>
                          <td className="py-1">{row.black ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {lastMove ? (
                <p className="mt-2 text-xs text-white/50">Last move: {lastMove.color === 'white' ? 'White' : 'Black'} played {lastMove.san} ({indexToAlgebraic(lastMove.from)} → {indexToAlgebraic(lastMove.to)})</p>
              ) : null}
            </div>

            <div className="flex-1 rounded-3xl border border-white/10 bg-slate-900/60 p-4">
              <h3 className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-white/50">
                <MessageCircle className="h-4 w-4" />
                In-game Chat
              </h3>
              <div className="mt-3 flex max-h-[240px] flex-col gap-2 overflow-y-auto rounded-2xl bg-slate-950/60 p-3 text-sm">
                {messages.length === 0 ? (
                  <p className="text-white/40">Establishing resonance channel…</p>
                ) : (
                  messages.map((message) => {
                    const isOwn = currentUser?.id === message.fromUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                            isOwn
                              ? 'bg-cyan-500/20 text-cyan-100'
                              : 'bg-white/10 text-white/90'
                          }`}
                        >
                          <p className="whitespace-pre-line">{message.content}</p>
                        </div>
                        <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/30">
                          {isOwn ? 'You' : opponentName}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder="Transmit a tactical note…"
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="rounded-2xl bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
                >
                  Send
                </button>
              </div>
            </div>

            {game.status !== 'active' ? (
              <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle className="h-4 w-4" />
                  Game concluded
                </p>
                <p className="mt-1 text-white/70">{game.outcomeReason ?? 'Result recorded'}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/60 px-4 py-3 text-xs uppercase tracking-[0.35em] text-white/40">
          <div className="flex items-center gap-2">
            <Sword className="h-4 w-4 text-cyan-300" />
            Match ID {game.id}
          </div>
          <div className="text-white/60">Archive-ready PGN linked to both players</div>
        </div>
      </div>
    </div>
  );
}
