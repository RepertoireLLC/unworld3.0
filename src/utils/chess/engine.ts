import { ChessColor, ChessPieceType, ChessSquare } from '../../types/chess';

export interface ChessPiece {
  type: ChessPieceType;
  color: ChessColor;
  hasMoved: boolean;
}

export type BoardState = (ChessPiece | null)[][];

export interface CastlingRights {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

export interface ChessGameState {
  board: BoardState;
  activeColor: ChessColor;
  castlingRights: CastlingRights;
  enPassantTarget: ChessSquare | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  kingPositions: Record<ChessColor, ChessSquare>;
}

const PROMOTION_CHOICES: ChessPieceType[] = ['queen', 'rook', 'bishop', 'knight'];

export interface MoveInput {
  from: ChessSquare;
  to: ChessSquare;
  promotion?: ChessPieceType;
}

export interface MoveDescriptor extends MoveInput {
  piece: ChessPieceType;
  color: ChessColor;
  capture?: ChessPieceType;
  capturedColor?: ChessColor;
  promotion?: ChessPieceType;
  isCastle?: 'king' | 'queen';
  isEnPassant?: boolean;
  check?: boolean;
  checkmate?: boolean;
  san: string;
  fen: string;
  halfMoveClock: number;
  fullMoveNumber: number;
}

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function createEmptyBoard(): BoardState {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

export function coordsFromSquare(square: ChessSquare): { file: number; rank: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - Number(square[1]);
  return { file, rank };
}

export function squareFromCoords(file: number, rank: number): ChessSquare {
  const fileChar = String.fromCharCode(97 + file);
  const rankChar = String(8 - rank);
  return `${fileChar}${rankChar}` as ChessSquare;
}

function isInside(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function initialBackRank(): ChessPieceType[] {
  return ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
}

function pawnStartRank(color: ChessColor): number {
  return color === 'white' ? 6 : 1;
}

export function createInitialBoard(): BoardState {
  const board = createEmptyBoard();
  const backRank = initialBackRank();

  backRank.forEach((type, index) => {
    board[0][index] = { type, color: 'black', hasMoved: false };
    board[1][index] = { type: 'pawn', color: 'black', hasMoved: false };
    board[6][index] = { type: 'pawn', color: 'white', hasMoved: false };
    board[7][index] = { type, color: 'white', hasMoved: false };
  });

  return board;
}

export function createInitialState(): ChessGameState {
  const board = createInitialBoard();
  return {
    board,
    activeColor: 'white',
    castlingRights: {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    kingPositions: {
      white: 'e1',
      black: 'e8',
    },
  };
}

function getPiece(state: ChessGameState, square: ChessSquare): ChessPiece | null {
  const { file, rank } = coordsFromSquare(square);
  return state.board[rank][file];
}

function setPiece(board: BoardState, square: ChessSquare, piece: ChessPiece | null) {
  const { file, rank } = coordsFromSquare(square);
  board[rank][file] = piece;
}

function opposingColor(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}

function isSquareAttacked(state: ChessGameState, square: ChessSquare, byColor: ChessColor): boolean {
  const { file, rank } = coordsFromSquare(square);
  const forward = byColor === 'white' ? -1 : 1;

  for (const df of [-1, 1]) {
    const tf = file + df;
    const tr = rank + forward;
    if (!isInside(tf, tr)) continue;
    const occupant = state.board[tr][tf];
    if (occupant && occupant.color === byColor && occupant.type === 'pawn') {
      return true;
    }
  }

  const knightOffsets = [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ];
  for (const [df, dr] of knightOffsets) {
    const tf = file + df;
    const tr = rank + dr;
    if (!isInside(tf, tr)) continue;
    const occupant = state.board[tr][tf];
    if (occupant && occupant.color === byColor && occupant.type === 'knight') {
      return true;
    }
  }

  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (df === 0 && dr === 0) continue;
      const tf = file + df;
      const tr = rank + dr;
      if (!isInside(tf, tr)) continue;
      const occupant = state.board[tr][tf];
      if (occupant && occupant.color === byColor && occupant.type === 'king') {
        return true;
      }
    }
  }

  const orthogonal = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [df, dr] of orthogonal) {
    let tf = file + df;
    let tr = rank + dr;
    while (isInside(tf, tr)) {
      const occupant = state.board[tr][tf];
      if (occupant) {
        if (occupant.color === byColor && (occupant.type === 'rook' || occupant.type === 'queen')) {
          return true;
        }
        break;
      }
      tf += df;
      tr += dr;
    }
  }

  const diagonal = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [df, dr] of diagonal) {
    let tf = file + df;
    let tr = rank + dr;
    while (isInside(tf, tr)) {
      const occupant = state.board[tr][tf];
      if (occupant) {
        if (occupant.color === byColor && (occupant.type === 'bishop' || occupant.type === 'queen')) {
          return true;
        }
        break;
      }
      tf += df;
      tr += dr;
    }
  }

  return false;
}

function inCheck(state: ChessGameState, color: ChessColor): boolean {
  const kingSquare = state.kingPositions[color];
  return isSquareAttacked(state, kingSquare, opposingColor(color));
}

export interface PseudoMove {
  from: ChessSquare;
  to: ChessSquare;
  piece: ChessPieceType;
  capture?: ChessPieceType;
  capturedColor?: ChessColor;
  promotion?: ChessPieceType;
  isCastle?: 'king' | 'queen';
  isEnPassant?: boolean;
}

function generatePseudoMoves(state: ChessGameState, square: ChessSquare): PseudoMove[] {
  const piece = getPiece(state, square);
  if (!piece) {
    return [];
  }

  const moves: PseudoMove[] = [];
  const { file, rank } = coordsFromSquare(square);
  const forward = piece.color === 'white' ? -1 : 1;

  switch (piece.type) {
    case 'pawn': {
      const oneForward = rank + forward;
      if (isInside(file, oneForward) && !state.board[oneForward][file]) {
        const targetSquare = squareFromCoords(file, oneForward);
        const promotionRank = piece.color === 'white' ? 0 : 7;
        if (oneForward === promotionRank) {
          PROMOTION_CHOICES.forEach((promotion) => {
            moves.push({
              from: square,
              to: targetSquare,
              piece: 'pawn',
              promotion,
            });
          });
        } else {
          moves.push({ from: square, to: targetSquare, piece: 'pawn' });
        }
        const startRank = pawnStartRank(piece.color);
        const twoForward = rank + forward * 2;
        if (rank === startRank && !state.board[twoForward][file]) {
          moves.push({ from: square, to: squareFromCoords(file, twoForward), piece: 'pawn' });
        }
      }
      for (const df of [-1, 1]) {
        const tf = file + df;
        const tr = rank + forward;
        if (!isInside(tf, tr)) continue;
        const occupant = state.board[tr][tf];
        if (occupant && occupant.color !== piece.color) {
          const targetSquare = squareFromCoords(tf, tr);
          const promotionRank = piece.color === 'white' ? 0 : 7;
          if (tr === promotionRank) {
            PROMOTION_CHOICES.forEach((promotion) => {
              moves.push({
                from: square,
                to: targetSquare,
                piece: 'pawn',
                capture: occupant.type,
                capturedColor: occupant.color,
                promotion,
              });
            });
          } else {
            moves.push({
              from: square,
              to: targetSquare,
              piece: 'pawn',
              capture: occupant.type,
              capturedColor: occupant.color,
            });
          }
        } else if (!occupant && state.enPassantTarget === squareFromCoords(tf, tr)) {
          moves.push({
            from: square,
            to: squareFromCoords(tf, tr),
            piece: 'pawn',
            capture: 'pawn',
            capturedColor: opposingColor(piece.color),
            isEnPassant: true,
          });
        }
      }
      break;
    }
    case 'knight': {
      const offsets = [
        [1, 2],
        [2, 1],
        [2, -1],
        [1, -2],
        [-1, -2],
        [-2, -1],
        [-2, 1],
        [-1, 2],
      ];
      for (const [df, dr] of offsets) {
        const tf = file + df;
        const tr = rank + dr;
        if (!isInside(tf, tr)) continue;
        const occupant = state.board[tr][tf];
        if (!occupant) {
          moves.push({ from: square, to: squareFromCoords(tf, tr), piece: 'knight' });
        } else if (occupant.color !== piece.color) {
          moves.push({
            from: square,
            to: squareFromCoords(tf, tr),
            piece: 'knight',
            capture: occupant.type,
            capturedColor: occupant.color,
          });
        }
      }
      break;
    }
    case 'bishop':
    case 'rook':
    case 'queen': {
      const directions: Array<[number, number]> = [];
      if (piece.type !== 'rook') {
        directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
      }
      if (piece.type !== 'bishop') {
        directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      }
      for (const [df, dr] of directions) {
        let tf = file + df;
        let tr = rank + dr;
        while (isInside(tf, tr)) {
          const occupant = state.board[tr][tf];
          if (!occupant) {
            moves.push({ from: square, to: squareFromCoords(tf, tr), piece: piece.type });
          } else {
            if (occupant.color !== piece.color) {
              moves.push({
                from: square,
                to: squareFromCoords(tf, tr),
                piece: piece.type,
                capture: occupant.type,
                capturedColor: occupant.color,
              });
            }
            break;
          }
          tf += df;
          tr += dr;
        }
      }
      break;
    }
    case 'king': {
      for (let df = -1; df <= 1; df += 1) {
        for (let dr = -1; dr <= 1; dr += 1) {
          if (df === 0 && dr === 0) continue;
          const tf = file + df;
          const tr = rank + dr;
          if (!isInside(tf, tr)) continue;
          const occupant = state.board[tr][tf];
          if (!occupant) {
            moves.push({ from: square, to: squareFromCoords(tf, tr), piece: 'king' });
          } else if (occupant.color !== piece.color) {
            moves.push({
              from: square,
              to: squareFromCoords(tf, tr),
              piece: 'king',
              capture: occupant.type,
              capturedColor: occupant.color,
            });
          }
        }
      }

      const rights = state.castlingRights;
      if (piece.color === 'white') {
        if (
          rights.whiteKingSide &&
          !piece.hasMoved &&
          !state.board[7][5] &&
          !state.board[7][6] &&
          !isSquareAttacked(state, 'e1', 'black') &&
          !isSquareAttacked(state, 'f1', 'black') &&
          !isSquareAttacked(state, 'g1', 'black') &&
          state.board[7][7]?.type === 'rook' &&
          !state.board[7][7]?.hasMoved
        ) {
          moves.push({ from: square, to: 'g1', piece: 'king', isCastle: 'king' });
        }
        if (
          rights.whiteQueenSide &&
          !piece.hasMoved &&
          !state.board[7][1] &&
          !state.board[7][2] &&
          !state.board[7][3] &&
          !isSquareAttacked(state, 'e1', 'black') &&
          !isSquareAttacked(state, 'd1', 'black') &&
          !isSquareAttacked(state, 'c1', 'black') &&
          state.board[7][0]?.type === 'rook' &&
          !state.board[7][0]?.hasMoved
        ) {
          moves.push({ from: square, to: 'c1', piece: 'king', isCastle: 'queen' });
        }
      } else {
        if (
          rights.blackKingSide &&
          !piece.hasMoved &&
          !state.board[0][5] &&
          !state.board[0][6] &&
          !isSquareAttacked(state, 'e8', 'white') &&
          !isSquareAttacked(state, 'f8', 'white') &&
          !isSquareAttacked(state, 'g8', 'white') &&
          state.board[0][7]?.type === 'rook' &&
          !state.board[0][7]?.hasMoved
        ) {
          moves.push({ from: square, to: 'g8', piece: 'king', isCastle: 'king' });
        }
        if (
          rights.blackQueenSide &&
          !piece.hasMoved &&
          !state.board[0][1] &&
          !state.board[0][2] &&
          !state.board[0][3] &&
          !isSquareAttacked(state, 'e8', 'white') &&
          !isSquareAttacked(state, 'd8', 'white') &&
          !isSquareAttacked(state, 'c8', 'white') &&
          state.board[0][0]?.type === 'rook' &&
          !state.board[0][0]?.hasMoved
        ) {
          moves.push({ from: square, to: 'c8', piece: 'king', isCastle: 'queen' });
        }
      }
      break;
    }
    default:
      break;
  }

  return moves;
}

function applyPseudoMove(state: ChessGameState, move: PseudoMove): ChessGameState {
  const next: ChessGameState = {
    board: cloneBoard(state.board),
    activeColor: opposingColor(state.activeColor),
    castlingRights: { ...state.castlingRights },
    enPassantTarget: null,
    halfMoveClock: state.halfMoveClock + 1,
    fullMoveNumber: state.fullMoveNumber + (state.activeColor === 'black' ? 1 : 0),
    kingPositions: { ...state.kingPositions },
  };

  const piece = getPiece(state, move.from);
  if (!piece) {
    return next;
  }

  if (piece.type === 'pawn' || move.capture) {
    next.halfMoveClock = 0;
  }

  const movingPiece: ChessPiece = { ...piece, hasMoved: true };

  if (piece.type === 'pawn' && Math.abs(coordsFromSquare(move.to).rank - coordsFromSquare(move.from).rank) === 2) {
    const midRank = (coordsFromSquare(move.to).rank + coordsFromSquare(move.from).rank) / 2;
    next.enPassantTarget = squareFromCoords(coordsFromSquare(move.from).file, midRank);
  }

  setPiece(next.board, move.from, null);

  if (move.isEnPassant) {
    const { file, rank } = coordsFromSquare(move.to);
    const captureRank = rank + (piece.color === 'white' ? 1 : -1);
    setPiece(next.board, squareFromCoords(file, captureRank), null);
  }

  if (piece.type === 'king') {
    if (piece.color === 'white') {
      next.castlingRights.whiteKingSide = false;
      next.castlingRights.whiteQueenSide = false;
    } else {
      next.castlingRights.blackKingSide = false;
      next.castlingRights.blackQueenSide = false;
    }
    next.kingPositions[piece.color] = move.to;

    if (move.isCastle === 'king') {
      const rookFrom = piece.color === 'white' ? 'h1' : 'h8';
      const rookTo = piece.color === 'white' ? 'f1' : 'f8';
      const rook = getPiece(state, rookFrom);
      if (rook) {
        setPiece(next.board, rookFrom, null);
        setPiece(next.board, rookTo, { ...rook, hasMoved: true });
      }
    } else if (move.isCastle === 'queen') {
      const rookFrom = piece.color === 'white' ? 'a1' : 'a8';
      const rookTo = piece.color === 'white' ? 'd1' : 'd8';
      const rook = getPiece(state, rookFrom);
      if (rook) {
        setPiece(next.board, rookFrom, null);
        setPiece(next.board, rookTo, { ...rook, hasMoved: true });
      }
    }
  }

  if (piece.type === 'rook') {
    if (move.from === 'a1') next.castlingRights.whiteQueenSide = false;
    if (move.from === 'h1') next.castlingRights.whiteKingSide = false;
    if (move.from === 'a8') next.castlingRights.blackQueenSide = false;
    if (move.from === 'h8') next.castlingRights.blackKingSide = false;
  }

  if (move.to === 'a1') next.castlingRights.whiteQueenSide = false;
  if (move.to === 'h1') next.castlingRights.whiteKingSide = false;
  if (move.to === 'a8') next.castlingRights.blackQueenSide = false;
  if (move.to === 'h8') next.castlingRights.blackKingSide = false;

  const promotionRank = piece.color === 'white' ? 0 : 7;
  if (piece.type === 'pawn' && coordsFromSquare(move.to).rank === promotionRank) {
    const promotion = move.promotion ?? 'queen';
    setPiece(next.board, move.to, { type: promotion, color: piece.color, hasMoved: true });
  } else {
    setPiece(next.board, move.to, movingPiece);
  }

  return next;
}

function generateLegalMoves(state: ChessGameState, square?: ChessSquare): PseudoMove[] {
  const targets: ChessSquare[] = [];
  if (square) {
    targets.push(square);
  } else {
    for (let rank = 0; rank < 8; rank += 1) {
      for (let file = 0; file < 8; file += 1) {
        const occupant = state.board[rank][file];
        if (occupant && occupant.color === state.activeColor) {
          targets.push(squareFromCoords(file, rank));
        }
      }
    }
  }

  const moves: PseudoMove[] = [];
  for (const target of targets) {
    const piece = getPiece(state, target);
    if (!piece || piece.color !== state.activeColor) continue;
    const pseudo = generatePseudoMoves(state, target);
    for (const move of pseudo) {
      const next = applyPseudoMove(state, move);
      if (!inCheck(next, piece.color)) {
        moves.push(move);
      }
    }
  }
  return moves;
}

function determineSan(
  state: ChessGameState,
  move: PseudoMove,
  nextState: ChessGameState,
  legalMoves: PseudoMove[],
): { san: string; check: boolean; checkmate: boolean } {
  if (move.isCastle === 'king' || move.isCastle === 'queen') {
    const notation = move.isCastle === 'king' ? 'O-O' : 'O-O-O';
    const opponent = opposingColor(state.activeColor);
    const opponentInCheck = inCheck(nextState, opponent);
    const opponentMoves = generateLegalMoves(nextState);
    const checkmate = opponentInCheck && opponentMoves.length === 0;
    const check = opponentInCheck && !checkmate;
    return { san: notation, check, checkmate };
  }

  const piece = getPiece(state, move.from);
  if (!piece) {
    return { san: '', check: false, checkmate: false };
  }

  const isCapture = Boolean(move.capture || move.isEnPassant);
  const pieceLetter = piece.type === 'pawn' ? '' : piece.type === 'knight' ? 'N' : piece.type[0].toUpperCase();

  let disambiguation = '';
  if (piece.type !== 'pawn') {
    const ambiguous = legalMoves.filter((candidate) =>
      candidate !== move &&
      candidate.to === move.to &&
      candidate.piece === piece.type
    );
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some((candidate) => coordsFromSquare(candidate.from).file === coordsFromSquare(move.from).file);
      const sameRank = ambiguous.some((candidate) => coordsFromSquare(candidate.from).rank === coordsFromSquare(move.from).rank);
      if (!sameFile) {
        disambiguation = move.from[0];
      } else if (!sameRank) {
        disambiguation = move.from[1];
      } else {
        disambiguation = move.from;
      }
    }
  }

  let notation = `${pieceLetter}${disambiguation}`;
  if (piece.type === 'pawn' && isCapture) {
    notation = `${move.from[0]}`;
  }
  if (isCapture) {
    notation += 'x';
  }
  notation += move.to;
  if (move.promotion) {
    const letter = move.promotion === 'knight' ? 'N' : move.promotion[0].toUpperCase();
    notation += `=${letter}`;
  }

  const opponent = opposingColor(state.activeColor);
  const opponentInCheck = inCheck(nextState, opponent);
  const opponentMoves = generateLegalMoves(nextState);
  const checkmate = opponentInCheck && opponentMoves.length === 0;
  const check = opponentInCheck && !checkmate;

  if (checkmate) {
    notation += '#';
  } else if (check) {
    notation += '+';
  }

  return { san: notation, check, checkmate };
}

export function applyMove(state: ChessGameState, input: MoveInput): MoveDescriptor {
  const legalMoves = generateLegalMoves(state, input.from);
  const chosen = legalMoves.find((candidate) => candidate.to === input.to);
  if (!chosen) {
    throw new Error('Illegal move');
  }

  const movingPiece = getPiece(state, input.from);
  let promotion: ChessPieceType | undefined = input.promotion ?? chosen.promotion;
  if (!promotion && movingPiece?.type === 'pawn') {
    const targetRank = coordsFromSquare(input.to).rank;
    if ((movingPiece.color === 'white' && targetRank === 0) || (movingPiece.color === 'black' && targetRank === 7)) {
      promotion = 'queen';
    }
  }

  const move: PseudoMove = { ...chosen, promotion };
  const nextState = applyPseudoMove(state, move);
  const { san, check, checkmate } = determineSan(state, move, nextState, legalMoves);

  const descriptor: MoveDescriptor = {
    ...move,
    color: state.activeColor,
    san,
    check,
    checkmate,
    fen: toFEN(nextState),
    halfMoveClock: nextState.halfMoveClock,
    fullMoveNumber: nextState.fullMoveNumber,
  };

  state.board = nextState.board;
  state.activeColor = nextState.activeColor;
  state.castlingRights = nextState.castlingRights;
  state.enPassantTarget = nextState.enPassantTarget;
  state.halfMoveClock = nextState.halfMoveClock;
  state.fullMoveNumber = nextState.fullMoveNumber;
  state.kingPositions = nextState.kingPositions;

  return descriptor;
}

export function toFEN(state: ChessGameState): string {
  const rows: string[] = [];
  for (let rank = 0; rank < 8; rank += 1) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const piece = state.board[rank][file];
      if (!piece) {
        empty += 1;
      } else {
        if (empty > 0) {
          row += String(empty);
          empty = 0;
        }
        const letterMap: Record<ChessPieceType, string> = {
          king: 'k',
          queen: 'q',
          rook: 'r',
          bishop: 'b',
          knight: 'n',
          pawn: 'p',
        };
        const letter = letterMap[piece.type];
        row += piece.color === 'white' ? letter.toUpperCase() : letter;
      }
    }
    if (empty > 0) {
      row += String(empty);
    }
    rows.push(row);
  }

  const active = state.activeColor === 'white' ? 'w' : 'b';
  let castling = '';
  castling += state.castlingRights.whiteKingSide ? 'K' : '';
  castling += state.castlingRights.whiteQueenSide ? 'Q' : '';
  castling += state.castlingRights.blackKingSide ? 'k' : '';
  castling += state.castlingRights.blackQueenSide ? 'q' : '';
  if (!castling) {
    castling = '-';
  }

  const enPassant = state.enPassantTarget ?? '-';
  return `${rows.join('/') } ${active} ${castling} ${enPassant} ${state.halfMoveClock} ${state.fullMoveNumber}`;
}

export function fromFEN(fen: string): ChessGameState {
  const [placement, active, castling, enPassant, halfMoveClock, fullMoveNumber] = fen.split(' ');
  const rows = placement.split('/');
  const board = createEmptyBoard();
  rows.forEach((row, rank) => {
    let file = 0;
    for (const char of row) {
      if (/\d/.test(char)) {
        file += Number(char);
        continue;
      }
      const color: ChessColor = char === char.toUpperCase() ? 'white' : 'black';
      const lower = char.toLowerCase();
      const pieceMap: Record<string, ChessPieceType> = {
        k: 'king',
        q: 'queen',
        r: 'rook',
        b: 'bishop',
        n: 'knight',
        p: 'pawn',
      };
      const type = pieceMap[lower];
      board[rank][file] = { type, color, hasMoved: true };
      file += 1;
    }
  });

  const activeColor: ChessColor = active === 'w' ? 'white' : 'black';
  const rights: CastlingRights = {
    whiteKingSide: castling.includes('K'),
    whiteQueenSide: castling.includes('Q'),
    blackKingSide: castling.includes('k'),
    blackQueenSide: castling.includes('q'),
  };

  const enPassantTarget = enPassant === '-' ? null : (enPassant as ChessSquare);

  const kingPositions: Record<ChessColor, ChessSquare> = {
    white: 'e1',
    black: 'e8',
  };
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank][file];
      if (piece?.type === 'king') {
        kingPositions[piece.color] = squareFromCoords(file, rank);
      }
    }
  }

  return {
    board,
    activeColor,
    castlingRights: rights,
    enPassantTarget,
    halfMoveClock: Number(halfMoveClock),
    fullMoveNumber: Number(fullMoveNumber),
    kingPositions,
  };
}

export function getLegalMoves(state: ChessGameState, square?: ChessSquare): PseudoMove[] {
  return generateLegalMoves(state, square);
}

export function isStalemate(state: ChessGameState): boolean {
  if (inCheck(state, state.activeColor)) {
    return false;
  }
  const moves = generateLegalMoves(state);
  return moves.length === 0;
}

export function isCheckmate(state: ChessGameState): boolean {
  if (!inCheck(state, state.activeColor)) {
    return false;
  }
  const moves = generateLegalMoves(state);
  return moves.length === 0;
}
