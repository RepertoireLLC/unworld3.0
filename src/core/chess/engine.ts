import { generateId } from '../../utils/id';

export type ChessColor = 'white' | 'black';
export type ChessPieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface ChessPiece {
  color: ChessColor;
  type: ChessPieceType;
}

export interface CastlingRights {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

export interface ChessPosition {
  board: (ChessPiece | null)[];
  activeColor: ChessColor;
  castling: CastlingRights;
  enPassantTarget: number | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export interface ChessMoveDescriptor {
  id: string;
  from: number;
  to: number;
  promotion?: ChessPieceType;
  captured?: ChessPiece | null;
  san: string;
  lan: string;
  resultingPosition: ChessPosition;
  moveNumber: number;
  color: ChessColor;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isEnPassant: boolean;
  isCastleKingSide: boolean;
  isCastleQueenSide: boolean;
}

export interface LegalMove {
  from: number;
  to: number;
  promotion?: ChessPieceType;
  captured?: ChessPiece | null;
  isEnPassant?: boolean;
  isCastleKingSide?: boolean;
  isCastleQueenSide?: boolean;
}

export interface GameTerminationState {
  status: 'active' | 'checkmate' | 'stalemate' | 'draw-fifty-move' | 'draw-repetition' | 'draw-agreement' | 'resigned' | 'timeout';
  winner: ChessColor | null;
  reason: string | null;
}

const BOARD_SIZE = 64;

const knightOffsets = [
  [-1, -2],
  [1, -2],
  [-1, 2],
  [1, 2],
  [-2, -1],
  [-2, 1],
  [2, -1],
  [2, 1],
];

const kingOffsets = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const bishopDirections = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const rookDirections = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function clonePosition(position: ChessPosition): ChessPosition {
  return {
    board: position.board.map((piece) => (piece ? { ...piece } : null)),
    activeColor: position.activeColor,
    castling: { ...position.castling },
    enPassantTarget: position.enPassantTarget,
    halfmoveClock: position.halfmoveClock,
    fullmoveNumber: position.fullmoveNumber,
  };
}

export function createInitialPosition(): ChessPosition {
  const board: (ChessPiece | null)[] = new Array(BOARD_SIZE).fill(null);

  const setupRow = (rank: number, color: ChessColor) => {
    const backRankPieces: ChessPieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let file = 0; file < 8; file += 1) {
      const pieceType = backRankPieces[file];
      board[getIndex(file, rank)] = { color, type: pieceType };
      const pawnRank = color === 'white' ? 6 : 1;
      board[getIndex(file, pawnRank)] = { color, type: 'pawn' };
    }
  };

  setupRow(7, 'white');
  setupRow(0, 'black');

  return {
    board,
    activeColor: 'white',
    castling: {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

export function getIndex(file: number, rank: number): number {
  return rank * 8 + file;
}

export function getFile(index: number): number {
  return index % 8;
}

export function getRank(index: number): number {
  return Math.floor(index / 8);
}

export function indexToAlgebraic(index: number): string {
  const file = 'abcdefgh'[getFile(index)];
  const rank = 8 - getRank(index);
  return `${file}${rank}`;
}

export function algebraicToIndex(square: string): number {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - Number.parseInt(square[1] ?? '1', 10);
  return getIndex(file, rank);
}

function isInsideBoard(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function opposite(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}

function locateKing(position: ChessPosition, color: ChessColor): number {
  const index = position.board.findIndex((piece) => piece?.type === 'king' && piece.color === color);
  if (index === -1) {
    throw new Error(`King not found for ${color}`);
  }
  return index;
}

function isSquareAttacked(position: ChessPosition, square: number, byColor: ChessColor): boolean {
  const board = position.board;
  const targetRank = getRank(square);
  const targetFile = getFile(square);

  const pawnDirection = byColor === 'white' ? -1 : 1;
  const pawnRanks = targetRank + pawnDirection;
  if (pawnRanks >= 0 && pawnRanks < 8) {
    for (const fileOffset of [-1, 1]) {
      const file = targetFile + fileOffset;
      if (file >= 0 && file < 8) {
        const idx = getIndex(file, pawnRanks);
        const piece = board[idx];
        if (piece && piece.color === byColor && piece.type === 'pawn') {
          return true;
        }
      }
    }
  }

  for (const [fileOffset, rankOffset] of knightOffsets) {
    const file = targetFile + fileOffset;
    const rank = targetRank + rankOffset;
    if (isInsideBoard(file, rank)) {
      const idx = getIndex(file, rank);
      const piece = board[idx];
      if (piece && piece.color === byColor && piece.type === 'knight') {
        return true;
      }
    }
  }

  const slidingChecks: Array<{ directions: number[][]; types: ChessPieceType[] }> = [
    { directions: bishopDirections, types: ['bishop', 'queen'] },
    { directions: rookDirections, types: ['rook', 'queen'] },
  ];
  for (const { directions, types } of slidingChecks) {
    for (const [fileOffset, rankOffset] of directions) {
      let file = targetFile + fileOffset;
      let rank = targetRank + rankOffset;
      while (isInsideBoard(file, rank)) {
        const idx = getIndex(file, rank);
        const piece = board[idx];
        if (piece) {
          if (piece.color === byColor && types.includes(piece.type)) {
            return true;
          }
          break;
        }
        file += fileOffset;
        rank += rankOffset;
      }
    }
  }

  for (const [fileOffset, rankOffset] of kingOffsets) {
    const file = targetFile + fileOffset;
    const rank = targetRank + rankOffset;
    if (isInsideBoard(file, rank)) {
      const idx = getIndex(file, rank);
      const piece = board[idx];
      if (piece && piece.color === byColor && piece.type === 'king') {
        return true;
      }
    }
  }

  return false;
}

function generatePseudoMoves(position: ChessPosition, from: number): LegalMove[] {
  const piece = position.board[from];
  if (!piece) {
    return [];
  }

  const moves: LegalMove[] = [];
  const rank = getRank(from);
  const file = getFile(from);

  if (piece.type === 'pawn') {
    const direction = piece.color === 'white' ? -1 : 1;
    const startRank = piece.color === 'white' ? 6 : 1;
    const promotionRank = piece.color === 'white' ? 0 : 7;

    const forwardRank = rank + direction;
    if (isInsideBoard(file, forwardRank)) {
      const forwardIndex = getIndex(file, forwardRank);
      if (!position.board[forwardIndex]) {
        if (forwardRank === promotionRank) {
          for (const promotion of ['queen', 'rook', 'bishop', 'knight'] as ChessPieceType[]) {
            moves.push({ from, to: forwardIndex, promotion });
          }
        } else {
          moves.push({ from, to: forwardIndex });
        }

        if (rank === startRank) {
          const doubleRank = rank + direction * 2;
          const doubleIndex = getIndex(file, doubleRank);
          if (!position.board[doubleIndex]) {
            moves.push({ from, to: doubleIndex });
          }
        }
      }
    }

    for (const fileOffset of [-1, 1]) {
      const targetFile = file + fileOffset;
      const targetRank = rank + direction;
      if (!isInsideBoard(targetFile, targetRank)) {
        continue;
      }
      const targetIndex = getIndex(targetFile, targetRank);
      const targetPiece = position.board[targetIndex];
      if (targetPiece && targetPiece.color !== piece.color) {
        if (targetRank === promotionRank) {
          for (const promotion of ['queen', 'rook', 'bishop', 'knight'] as ChessPieceType[]) {
            moves.push({ from, to: targetIndex, promotion, captured: targetPiece });
          }
        } else {
          moves.push({ from, to: targetIndex, captured: targetPiece });
        }
      }
    }

    if (position.enPassantTarget != null) {
      const epRank = getRank(position.enPassantTarget);
      const epFile = getFile(position.enPassantTarget);
      if (epRank === rank + direction && Math.abs(epFile - file) === 1) {
        moves.push({ from, to: position.enPassantTarget, isEnPassant: true, captured: { color: opposite(piece.color), type: 'pawn' } });
      }
    }
  } else if (piece.type === 'knight') {
    for (const [fileOffset, rankOffset] of knightOffsets) {
      const targetFile = file + fileOffset;
      const targetRank = rank + rankOffset;
      if (!isInsideBoard(targetFile, targetRank)) {
        continue;
      }
      const targetIndex = getIndex(targetFile, targetRank);
      const targetPiece = position.board[targetIndex];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ from, to: targetIndex, captured: targetPiece ?? undefined });
      }
    }
  } else if (piece.type === 'bishop' || piece.type === 'rook' || piece.type === 'queen') {
    const directions = [
      ...(piece.type !== 'rook' ? bishopDirections : []),
      ...(piece.type !== 'bishop' ? rookDirections : []),
    ];
    for (const [fileOffset, rankOffset] of directions) {
      let targetFile = file + fileOffset;
      let targetRank = rank + rankOffset;
      while (isInsideBoard(targetFile, targetRank)) {
        const targetIndex = getIndex(targetFile, targetRank);
        const targetPiece = position.board[targetIndex];
        if (!targetPiece) {
          moves.push({ from, to: targetIndex });
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push({ from, to: targetIndex, captured: targetPiece });
          }
          break;
        }
        targetFile += fileOffset;
        targetRank += rankOffset;
      }
    }
  } else if (piece.type === 'king') {
    for (const [fileOffset, rankOffset] of kingOffsets) {
      const targetFile = file + fileOffset;
      const targetRank = rank + rankOffset;
      if (!isInsideBoard(targetFile, targetRank)) {
        continue;
      }
      const targetIndex = getIndex(targetFile, targetRank);
      const targetPiece = position.board[targetIndex];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ from, to: targetIndex, captured: targetPiece ?? undefined });
      }
    }

    if (piece.color === 'white') {
      if (position.castling.whiteKingSide &&
        !position.board[getIndex(5, 7)] &&
        !position.board[getIndex(6, 7)]) {
        moves.push({ from, to: getIndex(6, 7), isCastleKingSide: true });
      }
      if (position.castling.whiteQueenSide &&
        !position.board[getIndex(1, 7)] &&
        !position.board[getIndex(2, 7)] &&
        !position.board[getIndex(3, 7)]) {
        moves.push({ from, to: getIndex(2, 7), isCastleQueenSide: true });
      }
    } else {
      if (position.castling.blackKingSide &&
        !position.board[getIndex(5, 0)] &&
        !position.board[getIndex(6, 0)]) {
        moves.push({ from, to: getIndex(6, 0), isCastleKingSide: true });
      }
      if (position.castling.blackQueenSide &&
        !position.board[getIndex(1, 0)] &&
        !position.board[getIndex(2, 0)] &&
        !position.board[getIndex(3, 0)]) {
        moves.push({ from, to: getIndex(2, 0), isCastleQueenSide: true });
      }
    }
  }

  return moves;
}

function applyPseudoMove(position: ChessPosition, move: LegalMove): ChessPosition {
  const piece = position.board[move.from];
  if (!piece) {
    throw new Error('No piece to move');
  }
  const next = clonePosition(position);
  next.board[move.from] = null;
  let capturedPiece: ChessPiece | null = null;

  if (move.isEnPassant) {
    const captureRank = piece.color === 'white' ? getRank(move.to) + 1 : getRank(move.to) - 1;
    const captureIndex = getIndex(getFile(move.to), captureRank);
    capturedPiece = next.board[captureIndex];
    next.board[captureIndex] = null;
  }

  if (move.isCastleKingSide) {
    const rank = piece.color === 'white' ? 7 : 0;
    const rookFrom = getIndex(7, rank);
    const rookTo = getIndex(5, rank);
    next.board[rookTo] = next.board[rookFrom];
    next.board[rookFrom] = null;
  }
  if (move.isCastleQueenSide) {
    const rank = piece.color === 'white' ? 7 : 0;
    const rookFrom = getIndex(0, rank);
    const rookTo = getIndex(3, rank);
    next.board[rookTo] = next.board[rookFrom];
    next.board[rookFrom] = null;
  }

  const targetPiece = next.board[move.to];
  if (targetPiece) {
    capturedPiece = targetPiece;
  }

  next.board[move.to] = {
    color: piece.color,
    type: move.promotion ?? piece.type,
  };

  if (piece.type === 'king') {
    if (piece.color === 'white') {
      next.castling.whiteKingSide = false;
      next.castling.whiteQueenSide = false;
    } else {
      next.castling.blackKingSide = false;
      next.castling.blackQueenSide = false;
    }
  }
  if (piece.type === 'rook') {
    if (piece.color === 'white') {
      if (move.from === getIndex(0, 7)) {
        next.castling.whiteQueenSide = false;
      }
      if (move.from === getIndex(7, 7)) {
        next.castling.whiteKingSide = false;
      }
    } else {
      if (move.from === getIndex(0, 0)) {
        next.castling.blackQueenSide = false;
      }
      if (move.from === getIndex(7, 0)) {
        next.castling.blackKingSide = false;
      }
    }
  }

  if (capturedPiece) {
    if (capturedPiece.type === 'rook') {
      if (move.to === getIndex(0, 7)) {
        next.castling.whiteQueenSide = false;
      }
      if (move.to === getIndex(7, 7)) {
        next.castling.whiteKingSide = false;
      }
      if (move.to === getIndex(0, 0)) {
        next.castling.blackQueenSide = false;
      }
      if (move.to === getIndex(7, 0)) {
        next.castling.blackKingSide = false;
      }
    }
  }

  next.enPassantTarget = null;
  if (piece.type === 'pawn' && Math.abs(getRank(move.to) - getRank(move.from)) === 2) {
    const intermediateRank = (getRank(move.to) + getRank(move.from)) / 2;
    next.enPassantTarget = getIndex(getFile(move.from), intermediateRank);
  }

  if (piece.type === 'pawn' || capturedPiece) {
    next.halfmoveClock = 0;
  } else {
    next.halfmoveClock += 1;
  }

  if (piece.color === 'black') {
    next.fullmoveNumber += 1;
  }

  next.activeColor = opposite(position.activeColor);

  return next;
}

export function generateLegalMoves(position: ChessPosition): LegalMove[] {
  const moves: LegalMove[] = [];
  for (let i = 0; i < BOARD_SIZE; i += 1) {
    const piece = position.board[i];
    if (!piece || piece.color !== position.activeColor) {
      continue;
    }
    const pseudoMoves = generatePseudoMoves(position, i);
    for (const pseudoMove of pseudoMoves) {
      if (pseudoMove.isCastleKingSide || pseudoMove.isCastleQueenSide) {
        const opponent = opposite(piece.color);
        const kingStart = i;
        const throughSquares = [] as number[];
        const rank = piece.color === 'white' ? 7 : 0;
        if (pseudoMove.isCastleKingSide) {
          throughSquares.push(getIndex(5, rank), getIndex(6, rank));
        } else {
          throughSquares.push(getIndex(3, rank), getIndex(2, rank));
        }
        if (isSquareAttacked(position, kingStart, opponent) || throughSquares.some((square) => isSquareAttacked(position, square, opponent))) {
          continue;
        }
      }
      const next = applyPseudoMove(position, pseudoMove);
      const kingIndex = locateKing(next, piece.color);
      if (!isSquareAttacked(next, kingIndex, opposite(piece.color))) {
        moves.push(pseudoMove);
      }
    }
  }
  return moves;
}

function describeMove(position: ChessPosition, move: LegalMove, next: ChessPosition): { san: string; lan: string; isCapture: boolean; isCheck: boolean; isMate: boolean; isStalemate: boolean } {
  const piece = position.board[move.from];
  if (!piece) {
    throw new Error('No piece to describe');
  }
  const color = piece.color;
  const opponent = opposite(color);

  const legalMoves = generateLegalMoves(position);

  const pieceLetter = piece.type === 'pawn' ? '' : piece.type[0].toUpperCase();
  const capture = Boolean(move.captured || move.isEnPassant);
  let san = '';
  const promotionSuffix = move.promotion ? pieceTypeToChar(move.promotion) : '';
  const lan = `${indexToAlgebraic(move.from)}${indexToAlgebraic(move.to)}${promotionSuffix}`;

  if (move.isCastleKingSide) {
    san = 'O-O';
  } else if (move.isCastleQueenSide) {
    san = 'O-O-O';
  } else {
    let disambiguation = '';
    if (piece.type !== 'pawn') {
      const samePieceMoves = legalMoves.filter((candidate) => {
        if (candidate.from === move.from) {
          return false;
        }
        const candidatePiece = position.board[candidate.from];
        if (!candidatePiece || candidatePiece.type !== piece.type || candidatePiece.color !== color) {
          return false;
        }
        return candidate.to === move.to && candidate.promotion === move.promotion;
      });
      if (samePieceMoves.length > 0) {
        const needFile = samePieceMoves.some((m) => getFile(m.from) === getFile(move.from));
        const needRank = samePieceMoves.some((m) => getRank(m.from) === getRank(move.from));
        if (needFile && needRank) {
          disambiguation = indexToAlgebraic(move.from);
        } else if (needFile) {
          disambiguation = `${getRank(move.from)}`;
        } else {
          disambiguation = `${'abcdefgh'[getFile(move.from)]}`;
        }
      }
    }

    if (piece.type === 'pawn' && capture) {
      san = `${'abcdefgh'[getFile(move.from)]}x${indexToAlgebraic(move.to)}`;
    } else {
      san = `${pieceLetter}${disambiguation}${capture ? 'x' : ''}${indexToAlgebraic(move.to)}`;
    }

    if (move.promotion) {
      san += `=${pieceTypeToChar(move.promotion)}`;
    }
  }

  const opponentMoves = generateLegalMoves(next);
  const opponentInCheck = isSquareAttacked(next, locateKing(next, opponent), color);
  const isMate = opponentInCheck && opponentMoves.length === 0;
  const isStalemate = !opponentInCheck && opponentMoves.length === 0;

  if (isMate) {
    san += '#';
  } else if (opponentInCheck) {
    san += '+';
  }

  return {
    san,
    lan,
    isCapture: capture,
    isCheck: opponentInCheck,
    isMate,
    isStalemate,
  };
}

function pieceTypeToChar(type: ChessPieceType): string {
  switch (type) {
    case 'pawn':
      return 'P';
    case 'knight':
      return 'N';
    case 'bishop':
      return 'B';
    case 'rook':
      return 'R';
    case 'queen':
      return 'Q';
    case 'king':
      return 'K';
    default:
      return '?';
  }
}

export function makeMove(position: ChessPosition, move: LegalMove): ChessMoveDescriptor {
  const piece = position.board[move.from];
  if (!piece) {
    throw new Error('No piece selected');
  }

  const legalMoves = generateLegalMoves(position);
  if (!legalMoves.some((legal) => isSameMove(legal, move))) {
    throw new Error('Illegal move');
  }

  const next = applyPseudoMove(position, move);
  const description = describeMove(position, move, next);

  return {
    id: generateId('move'),
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    captured: move.captured ?? null,
    san: description.san,
    lan: description.lan,
    resultingPosition: next,
    moveNumber: position.fullmoveNumber,
    color: position.activeColor,
    isCapture: description.isCapture,
    isCheck: description.isCheck,
    isCheckmate: description.isMate,
    isStalemate: description.isStalemate,
    isEnPassant: Boolean(move.isEnPassant),
    isCastleKingSide: Boolean(move.isCastleKingSide),
    isCastleQueenSide: Boolean(move.isCastleQueenSide),
  };
}

function isSameMove(a: LegalMove, b: LegalMove): boolean {
  return (
    a.from === b.from &&
    a.to === b.to &&
    a.promotion === b.promotion &&
    Boolean(a.isEnPassant) === Boolean(b.isEnPassant) &&
    Boolean(a.isCastleKingSide) === Boolean(b.isCastleKingSide) &&
    Boolean(a.isCastleQueenSide) === Boolean(b.isCastleQueenSide)
  );
}

export function serializePosition(position: ChessPosition): string {
  const rows: string[] = [];
  for (let rank = 0; rank < 8; rank += 1) {
    let empty = 0;
    let row = '';
    for (let file = 0; file < 8; file += 1) {
      const piece = position.board[getIndex(file, rank)];
      if (!piece) {
        empty += 1;
      } else {
        if (empty > 0) {
          row += empty.toString();
          empty = 0;
        }
        row += pieceToFen(piece);
      }
    }
    if (empty > 0) {
      row += empty.toString();
    }
    rows.push(row);
  }
  const board = rows.join('/');
  const active = position.activeColor === 'white' ? 'w' : 'b';
  let castling = '';
  castling += position.castling.whiteKingSide ? 'K' : '';
  castling += position.castling.whiteQueenSide ? 'Q' : '';
  castling += position.castling.blackKingSide ? 'k' : '';
  castling += position.castling.blackQueenSide ? 'q' : '';
  if (!castling) {
    castling = '-';
  }
  const enPassant = position.enPassantTarget != null ? indexToAlgebraic(position.enPassantTarget) : '-';
  return `${board} ${active} ${castling} ${enPassant} ${position.halfmoveClock} ${position.fullmoveNumber}`;
}

function pieceToFen(piece: ChessPiece): string {
  const map: Record<ChessPieceType, string> = {
    pawn: 'p',
    knight: 'n',
    bishop: 'b',
    rook: 'r',
    queen: 'q',
    king: 'k',
  };
  const char = map[piece.type];
  return piece.color === 'white' ? char.toUpperCase() : char;
}

export function getPositionSignature(position: ChessPosition): string {
  const fen = serializePosition(position).split(' ');
  return `${fen[0]} ${fen[1]} ${fen[2]} ${fen[3]}`;
}

export function evaluateTermination(position: ChessPosition, repetitionCount: number): GameTerminationState {
  const legalMoves = generateLegalMoves(position);
  const active = position.activeColor;
  const kingIndex = locateKing(position, active);
  const inCheck = isSquareAttacked(position, kingIndex, opposite(active));

  if (legalMoves.length === 0) {
    if (inCheck) {
      return {
        status: 'checkmate',
        winner: opposite(active),
        reason: `${capitalize(opposite(active))} wins by checkmate`,
      };
    }
    return {
      status: 'stalemate',
      winner: null,
      reason: 'Stalemate',
    };
  }

  if (position.halfmoveClock >= 100) {
    return {
      status: 'draw-fifty-move',
      winner: null,
      reason: 'Draw by fifty-move rule',
    };
  }

  if (repetitionCount >= 3) {
    return {
      status: 'draw-repetition',
      winner: null,
      reason: 'Draw by threefold repetition',
    };
  }

  return {
    status: 'active',
    winner: null,
    reason: null,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
