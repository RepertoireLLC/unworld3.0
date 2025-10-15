import { useMemo, useState, useEffect } from 'react';
import type { ChessGame } from '../../store/chessStore';
import type { ChessColor, ChessPieceType, ChessSquare } from '../../types/chess';
import { useChessStore } from '../../store/chessStore';
import { useToastStore } from '../../store/toastStore';
import { coordsFromSquare, type PseudoMove } from '../../utils/chess/engine';

interface ChessBoardProps {
  game: ChessGame;
  currentUserId: string;
}

const PIECE_SYMBOLS: Record<ChessColor, Record<ChessPieceType, string>> = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

interface PromotionPrompt {
  from: ChessSquare;
  to: ChessSquare;
  options: ChessPieceType[];
}

export function ChessBoard({ game, currentUserId }: ChessBoardProps) {
  const getLegalMoves = useChessStore((state) => state.getLegalMoves);
  const makeMove = useChessStore((state) => state.makeMove);
  const addToast = useToastStore((state) => state.addToast);

  const playerColor: ChessColor | null = useMemo(() => {
    if (game.whiteUserId === currentUserId) {
      return 'white';
    }
    if (game.blackUserId === currentUserId) {
      return 'black';
    }
    return null;
  }, [game.whiteUserId, game.blackUserId, currentUserId]);

  const isPlayersTurn = playerColor === game.state.activeColor && playerColor !== null;

  const orientation = playerColor === 'black' ? 'black' : 'white';
  const files = orientation === 'white' ? FILES : [...FILES].reverse();
  const ranks = orientation === 'white' ? RANKS : [...RANKS].reverse();

  const [selectedSquare, setSelectedSquare] = useState<ChessSquare | null>(null);
  const [availableMoves, setAvailableMoves] = useState<PseudoMove[]>([]);
  const [promotionPrompt, setPromotionPrompt] = useState<PromotionPrompt | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setSelectedSquare(null);
    setAvailableMoves([]);
    setPromotionPrompt(null);
  }, [game.id]);

  const lastMove = game.moves[game.moves.length - 1];

  const statusLabel = useMemo(() => {
    switch (game.status) {
      case 'checkmate':
        return 'Checkmate';
      case 'stalemate':
        return 'Stalemate';
      case 'draw':
        return game.drawReason ? `Draw · ${game.drawReason}` : 'Draw';
      case 'resigned':
        return 'Resignation';
      case 'timeout':
        return 'Time out';
      case 'check':
        return `Check · ${game.state.activeColor === 'white' ? 'White' : 'Black'} to move`;
      default:
        return `${game.state.activeColor === 'white' ? 'White' : 'Black'} to move`;
    }
  }, [game.status, game.state.activeColor, game.drawReason]);

  const remainingTime = (color: ChessColor) => {
    const base = color === 'white' ? game.timers.whiteMs : game.timers.blackMs;
    if (['checkmate', 'stalemate', 'draw', 'resigned', 'timeout', 'complete'].includes(game.status)) {
      return base;
    }
    if (game.state.activeColor === color) {
      const elapsed = now - game.lastMoveAt;
      return Math.max(0, base - elapsed);
    }
    return base;
  };

  const handleSelectSquare = (square: ChessSquare) => {
    if (!playerColor) {
      return;
    }
    const { file, rank } = coordsFromSquare(square);
    const piece = game.state.board[rank]?.[file];

    if (selectedSquare && square === selectedSquare) {
      setSelectedSquare(null);
      setAvailableMoves([]);
      setPromotionPrompt(null);
      return;
    }

    if (piece && piece.color === playerColor && isPlayersTurn) {
      const moves = getLegalMoves(game.id, square);
      setSelectedSquare(square);
      setAvailableMoves(moves);
      setPromotionPrompt(null);
      return;
    }

    if (!selectedSquare) {
      return;
    }

    const movesToSquare = availableMoves.filter((move) => move.to === square);
    if (movesToSquare.length === 0) {
      const maybeMoves = getLegalMoves(game.id, square);
      if (maybeMoves.length > 0 && game.state.board[rank]?.[file]?.color === playerColor) {
        setSelectedSquare(square);
        setAvailableMoves(maybeMoves);
      } else {
        setSelectedSquare(null);
        setAvailableMoves([]);
      }
      return;
    }

    if (movesToSquare.length === 1 && !movesToSquare[0].promotion) {
      void commitMove(selectedSquare, square, undefined);
      return;
    }

    const promotionOptions = movesToSquare.map((move) => move.promotion ?? 'queen');
    setPromotionPrompt({ from: selectedSquare, to: square, options: Array.from(new Set(promotionOptions)) as ChessPieceType[] });
  };

  const commitMove = async (from: ChessSquare, to: ChessSquare, promotion?: ChessPieceType) => {
    const result = await makeMove(game.id, currentUserId, { from, to, promotion });
    if (!result.success) {
      addToast({
        title: 'Move rejected',
        description: result.message ?? 'The move could not be played.',
        variant: 'warning',
      });
      return;
    }
    setSelectedSquare(null);
    setAvailableMoves([]);
    setPromotionPrompt(null);
  };

  const renderSquare = (fileIndex: number, rankIndex: number) => {
    const fileChar = files[fileIndex];
    const rankNumber = ranks[rankIndex];
    const square = `${fileChar}${rankNumber}` as ChessSquare;
    const { file, rank } = coordsFromSquare(square);
    const piece = game.state.board[rank]?.[file];
    const isSelected = selectedSquare === square;
    const highlightMove = availableMoves.some((move) => move.to === square);
    const isCaptureMove = availableMoves.some((move) => move.to === square && move.capture);
    const isLastMove = lastMove ? lastMove.to === square || lastMove.from === square : false;

    const background =
      (fileIndex + rankIndex) % 2 === 0 ? 'bg-white/10' : 'bg-white/5';
    const selectionClass = isSelected ? 'outline outline-2 outline-emerald-400/80' : '';
    const lastMoveClass = isLastMove ? 'ring-2 ring-cyan-400/60' : '';

    return (
      <button
        key={square}
        type="button"
        onClick={() => handleSelectSquare(square)}
        className={`relative flex h-12 w-12 items-center justify-center text-2xl font-semibold transition ${background} ${selectionClass} ${lastMoveClass}`}
      >
        {piece && <span>{PIECE_SYMBOLS[piece.color][piece.type]}</span>}
        {highlightMove && (
          <span
            className={`absolute h-3 w-3 rounded-full ${
              isCaptureMove ? 'border-2 border-emerald-300/80' : 'bg-emerald-300/80'
            }`}
          />
        )}
        <span className="pointer-events-none absolute bottom-1 right-1 text-[10px] text-white/30">
          {square}
        </span>
      </button>
    );
  };

  const whiteTime = useMemo(
    () => formatTime(remainingTime('white')),
    [now, game.timers.whiteMs, game.lastMoveAt, game.status, game.state.activeColor]
  );
  const blackTime = useMemo(
    () => formatTime(remainingTime('black')),
    [now, game.timers.blackMs, game.lastMoveAt, game.status, game.state.activeColor]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col text-xs uppercase tracking-[0.3em] text-white/60">
          <span>Current Turn</span>
          <span className="text-lg font-semibold text-white/90">{statusLabel}</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-mono">
          <span className={`${game.state.activeColor === 'black' ? 'text-white/70' : 'text-white/40'}`}>
            ♚ {blackTime}
          </span>
          <span className={`${game.state.activeColor === 'white' ? 'text-white/70' : 'text-white/40'}`}>
            ♔ {whiteTime}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-8 gap-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-inner">
        {ranks.map((_, rankIndex) =>
          files.map((_, fileIndex) => renderSquare(fileIndex, rankIndex))
        )}
      </div>
      {promotionPrompt && (
        <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
          <span>Select promotion:</span>
          {promotionPrompt.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                void commitMove(promotionPrompt.from, promotionPrompt.to, option);
              }}
              className="ui-button ui-button--ghost"
            >
              {option}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPromotionPrompt(null)}
            className="ui-button ui-button--ghost text-white/50"
          >
            Cancel
          </button>
        </div>
      )}
      {!isPlayersTurn && playerColor && !['checkmate', 'stalemate', 'draw', 'resigned', 'timeout'].includes(game.status) && (
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">
          Waiting for opponent move…
        </p>
      )}
    </div>
  );
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
