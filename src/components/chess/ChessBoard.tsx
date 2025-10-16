import { useMemo, useState } from 'react';
import type { ChessColor, ChessPieceType, ChessPosition, LegalMove } from '../../core/chess/engine';
import { getFile, getRank, indexToAlgebraic } from '../../core/chess/engine';

const pieceGlyph: Record<ChessColor, Record<ChessPieceType, string>> = {
  white: {
    pawn: '♙',
    knight: '♘',
    bishop: '♗',
    rook: '♖',
    queen: '♕',
    king: '♔',
  },
  black: {
    pawn: '♟',
    knight: '♞',
    bishop: '♝',
    rook: '♜',
    queen: '♛',
    king: '♚',
  },
};

interface ChessBoardProps {
  position: ChessPosition;
  perspective: ChessColor;
  legalMoves: LegalMove[];
  lastMove?: { from: number; to: number } | null;
  disabled?: boolean;
  onSelectMove?: (from: number, to: number, promotion?: ChessPieceType) => void;
}

interface PromotionContext {
  from: number;
  to: number;
  options: ChessPieceType[];
}

export function ChessBoard({ position, perspective, legalMoves, lastMove, disabled, onSelectMove }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [promotionContext, setPromotionContext] = useState<PromotionContext | null>(null);

  const orderedSquares = useMemo(() => {
    const squares = Array.from({ length: 64 }, (_, index) => index);
    if (perspective === 'white') {
      return squares;
    }
    return squares.reverse();
  }, [perspective]);

  const validMovesFromSelected = useMemo(() => {
    if (selectedSquare == null) {
      return [] as LegalMove[];
    }
    return legalMoves.filter((move) => move.from === selectedSquare);
  }, [legalMoves, selectedSquare]);

  const highlightSquares = useMemo(() => {
    const highlights = new Set<number>();
    if (lastMove) {
      highlights.add(lastMove.from);
      highlights.add(lastMove.to);
    }
    validMovesFromSelected.forEach((move) => highlights.add(move.to));
    return highlights;
  }, [lastMove, validMovesFromSelected]);

  const handleSquareClick = (index: number) => {
    if (disabled) {
      return;
    }
    if (promotionContext) {
      setPromotionContext(null);
    }

    const piece = position.board[index];
    const isFriendly = legalMoves.some((move) => move.from === index);

    if (selectedSquare == null) {
      if (piece && isFriendly) {
        setSelectedSquare(index);
      }
      return;
    }

    if (selectedSquare === index) {
      setSelectedSquare(null);
      return;
    }

    const candidateMoves = legalMoves.filter((move) => move.from === selectedSquare && move.to === index);
    if (candidateMoves.length === 0) {
      if (piece && isFriendly) {
        setSelectedSquare(index);
      }
      return;
    }

    if (candidateMoves.length === 1 && !candidateMoves[0]?.promotion) {
      onSelectMove?.(selectedSquare, index);
      setSelectedSquare(null);
      return;
    }

    const promotionOptions = candidateMoves
      .map((move) => move.promotion)
      .filter((option): option is ChessPieceType => Boolean(option));

    if (promotionOptions.length > 0) {
      setPromotionContext({ from: selectedSquare, to: index, options: promotionOptions });
    } else {
      onSelectMove?.(selectedSquare, index);
      setSelectedSquare(null);
    }
  };

  const handlePromotionChoice = (pieceType: ChessPieceType) => {
    if (!promotionContext) {
      return;
    }
    onSelectMove?.(promotionContext.from, promotionContext.to, pieceType);
    setPromotionContext(null);
    setSelectedSquare(null);
  };

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="relative grid aspect-square grid-cols-8 overflow-hidden rounded-3xl border border-white/20 shadow-[0_0_40px_rgba(34,211,238,0.25)]">
        {orderedSquares.map((boardIndex) => {
          const piece = position.board[boardIndex];
          const isDark = (getFile(boardIndex) + getRank(boardIndex)) % 2 === 1;
          const algebraic = indexToAlgebraic(boardIndex);
          const isHighlighted = highlightSquares.has(boardIndex);
          const isSelected = selectedSquare === boardIndex;

          return (
            <button
              key={boardIndex}
              type="button"
              className={`relative flex items-center justify-center text-3xl transition-all focus:outline-none ${
                isDark ? 'bg-slate-900/80' : 'bg-slate-800/70'
              } ${
                isHighlighted
                  ? 'after:absolute after:inset-1 after:rounded-xl after:border after:border-cyan-400/80 after:bg-cyan-400/15 after:shadow-[0_0_25px_rgba(34,211,238,0.35)]'
                  : ''
              } ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-cyan-400'
                  : ''
              }`}
              onClick={() => handleSquareClick(boardIndex)}
              aria-label={`Square ${algebraic}`}
            >
              <span className="pointer-events-none select-none" data-square={algebraic}>
                {piece ? pieceGlyph[piece.color][piece.type] : ''}
              </span>
              <span className="pointer-events-none absolute left-1 top-1 text-[10px] font-semibold text-white/40">
                {algebraic}
              </span>
            </button>
          );
        })}
      </div>
      {promotionContext ? (
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <div className="flex gap-2 rounded-2xl border border-cyan-400/40 bg-slate-950/90 px-4 py-3 shadow-[0_0_30px_rgba(34,211,238,0.45)]">
            {promotionContext.options.map((option) => (
              <button
                key={option}
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-2xl text-cyan-100 transition hover:bg-cyan-500/40"
                onClick={() => handlePromotionChoice(option)}
              >
                {pieceGlyph[perspective][option]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
