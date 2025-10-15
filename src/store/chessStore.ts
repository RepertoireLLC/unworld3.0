import { create } from 'zustand';
import { createSecureVault } from '../utils/encryption';
import { generateId } from '../utils/id';
import {
  applyMove,
  createInitialState,
  getLegalMoves as getLegalMovesForState,
  isCheckmate,
  isStalemate,
  coordsFromSquare,
  type ChessGameState,
  type MoveInput,
  type MoveDescriptor,
  type PseudoMove,
} from '../utils/chess/engine';
import { dispatchConsciousEvent } from '../core/consciousCore';
import { useAuthStore } from './authStore';
import type { ChessColor, ChessPieceType, ChessSquare, ChessGameSummary, ChessGameResult } from '../types/chess';

export interface ChessInvite {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  gameId?: string;
}

export type ChessGameStatus =
  | 'pending'
  | 'active'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'resigned'
  | 'timeout'
  | 'complete';

export interface ChessMoveRecord {
  id: string;
  moveNumber: number;
  san: string;
  from: ChessSquare;
  to: ChessSquare;
  piece: ChessPieceType;
  color: ChessColor;
  timestamp: number;
  fen: string;
  capture?: ChessPieceType;
  capturedColor?: ChessColor;
  promotion?: ChessPieceType;
  check: boolean;
  checkmate: boolean;
}

export interface ChessGame {
  id: string;
  inviteId?: string;
  whiteUserId: string;
  blackUserId: string;
  status: ChessGameStatus;
  result?: '1-0' | '0-1' | '1/2-1/2';
  winnerUserId?: string;
  drawReason?: string;
  createdAt: string;
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  state: ChessGameState;
  moves: ChessMoveRecord[];
  timers: { whiteMs: number; blackMs: number };
  initialTimeMs: number;
  lastMoveAt: number;
  metadata: {
    event: string;
    site: string;
    white: string;
    black: string;
  };
}

interface ChessPersistedState {
  invites: ChessInvite[];
  games: Record<string, ChessGame>;
  activeGameId: string | null;
}

interface ChessState extends ChessPersistedState {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  sendInvite: (fromUserId: string, toUserId: string) => { success: boolean; message?: string; invite?: ChessInvite };
  cancelInvite: (inviteId: string) => void;
  acceptInvite: (
    inviteId: string,
    acceptingUserId: string,
    context: { whiteName: string; blackName: string }
  ) => { success: boolean; message?: string; gameId?: string };
  declineInvite: (inviteId: string, userId: string) => void;
  setActiveGame: (gameId: string | null) => void;
  getGame: (gameId: string) => ChessGame | undefined;
  getLegalMoves: (gameId: string, square: ChessSquare) => PseudoMove[];
  makeMove: (
    gameId: string,
    userId: string,
    move: MoveInput
  ) => { success: boolean; message?: string; descriptor?: MoveDescriptor };
  resignGame: (gameId: string, userId: string) => void;
  expireInvite: (inviteId: string) => void;
}

const chessVault = createSecureVault<ChessPersistedState>({
  storageKey: 'harmonia.chess.v1',
  metadata: { schema: 'harmonia.chess' },
});

function isGameComplete(status: ChessGameStatus) {
  return ['checkmate', 'stalemate', 'draw', 'resigned', 'timeout', 'complete'].includes(status);
}

function determineResultForUser(result: '1-0' | '0-1' | '1/2-1/2', color: ChessColor): ChessGameResult {
  if (result === '1/2-1/2') {
    return 'draw';
  }
  if (result === '1-0') {
    return color === 'white' ? 'win' : 'loss';
  }
  return color === 'black' ? 'win' : 'loss';
}

function generatePGN(game: ChessGame, whiteName: string, blackName: string): string {
  const headers = [
    ['Event', game.metadata.event],
    ['Site', game.metadata.site],
    ['Date', game.startedAt.slice(0, 10)],
    ['White', whiteName],
    ['Black', blackName],
    ['Result', game.result ?? '*'],
  ];
  const headerText = headers.map(([key, value]) => `[${key} "${value}"]`).join('\n');
  const movesText = game.moves
    .map((move) => (move.color === 'white' ? `${move.moveNumber}. ${move.san}` : move.san))
    .join(' ')
    .trim();
  const body = game.result ? `${movesText} ${game.result}`.trim() : movesText;
  return `${headerText}\n\n${body}`.trim();
}

function persistState(getState: () => ChessState) {
  const { invites, games, activeGameId } = getState();
  void chessVault.save({ invites, games, activeGameId });
}

export const useChessStore = create<ChessState>((set, get) => ({
  invites: [],
  games: {},
  activeGameId: null,
  isHydrated: false,
  async hydrate() {
    if (get().isHydrated) {
      return;
    }
    try {
      const stored = await chessVault.load();
      if (stored) {
        set({ ...stored, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch (error) {
      console.warn('Failed to hydrate chess store', error);
      set({ invites: [], games: {}, activeGameId: null, isHydrated: true });
    }
  },
  sendInvite(fromUserId, toUserId) {
    if (fromUserId === toUserId) {
      return { success: false, message: 'Cannot challenge yourself.' };
    }

    const state = get();
    const existingInvite = state.invites.find(
      (invite) =>
        invite.status === 'pending' &&
        ((invite.fromUserId === fromUserId && invite.toUserId === toUserId) ||
          (invite.fromUserId === toUserId && invite.toUserId === fromUserId))
    );
    if (existingInvite) {
      return { success: false, message: 'An invitation is already pending between these players.' };
    }

    const activeGame = Object.values(state.games).find(
      (game) =>
        !isGameComplete(game.status) &&
        ((game.whiteUserId === fromUserId && game.blackUserId === toUserId) ||
          (game.whiteUserId === toUserId && game.blackUserId === fromUserId))
    );
    if (activeGame) {
      return { success: false, message: 'An active game already exists between these players.' };
    }

    const invite: ChessInvite = {
      id: generateId('chess-invite'),
      fromUserId,
      toUserId,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    set((current) => ({ invites: [...current.invites, invite] }));
    persistState(get);
    void dispatchConsciousEvent({
      type: 'chess:invite.sent',
      nodeId: invite.id,
      payload: { fromUserId, toUserId },
    });
    return { success: true, invite };
  },
  cancelInvite(inviteId) {
    set((state) => ({ invites: state.invites.filter((invite) => invite.id !== inviteId) }));
    persistState(get);
  },
  acceptInvite(inviteId, acceptingUserId, context) {
    const state = get();
    const invite = state.invites.find((entry) => entry.id === inviteId);
    if (!invite) {
      return { success: false, message: 'Invite not found.' };
    }
    if (invite.status !== 'pending') {
      return { success: false, message: 'Invite is no longer active.' };
    }
    if (invite.toUserId !== acceptingUserId) {
      return { success: false, message: 'Only the recipient can accept this invite.' };
    }

    const whiteUserId = invite.fromUserId;
    const blackUserId = invite.toUserId;
    const now = new Date().toISOString();
    const gameId = generateId('chess-game');
    const stateSnapshot = createInitialState();
    const game: ChessGame = {
      id: gameId,
      inviteId: invite.id,
      whiteUserId,
      blackUserId,
      status: 'active',
      createdAt: now,
      startedAt: now,
      updatedAt: now,
      state: stateSnapshot,
      moves: [],
      timers: { whiteMs: 5 * 60 * 1000, blackMs: 5 * 60 * 1000 },
      initialTimeMs: 5 * 60 * 1000,
      lastMoveAt: Date.now(),
      metadata: {
        event: 'Harmonia Mesh Duel',
        site: 'Harmonia Relay',
        white: context.whiteName,
        black: context.blackName,
      },
    };

    set((current) => ({
      invites: current.invites.map((item) =>
        item.id === inviteId ? { ...item, status: 'accepted', gameId } : item
      ),
      games: { ...current.games, [gameId]: game },
      activeGameId: gameId,
    }));
    persistState(get);
    void dispatchConsciousEvent({
      type: 'chess:game.started',
      nodeId: gameId,
      payload: { whiteUserId, blackUserId },
    });
    return { success: true, gameId };
  },
  declineInvite(inviteId, userId) {
    set((state) => ({
      invites: state.invites.map((invite) =>
        invite.id === inviteId && invite.toUserId === userId
          ? { ...invite, status: 'declined' }
          : invite
      ),
    }));
    persistState(get);
  },
  setActiveGame(gameId) {
    set({ activeGameId: gameId });
    persistState(get);
  },
  getGame(gameId) {
    return get().games[gameId];
  },
  getLegalMoves(gameId, square) {
    const game = get().games[gameId];
    if (!game || isGameComplete(game.status)) {
      return [];
    }
    if (game.state.activeColor !== getPieceColor(game, square)) {
      return [];
    }
    return getLegalMovesForState(game.state, square);
  },
  makeMove(gameId, userId, move) {
    const state = get();
    const game = state.games[gameId];
    if (!game) {
      return { success: false, message: 'Game not found.' };
    }
    if (isGameComplete(game.status)) {
      return { success: false, message: 'Game has already concluded.' };
    }
    const playerColor: ChessColor | null =
      userId === game.whiteUserId ? 'white' : userId === game.blackUserId ? 'black' : null;
    if (!playerColor) {
      return { success: false, message: 'You are not a participant in this game.' };
    }
    if (playerColor !== game.state.activeColor) {
      return { success: false, message: "It is not your turn." };
    }

    const now = Date.now();
    const elapsed = now - game.lastMoveAt;
    const timers = { ...game.timers };
    const timerKey = playerColor === 'white' ? 'whiteMs' : 'blackMs';
    timers[timerKey] = Math.max(0, timers[timerKey] - elapsed);
    if (timers[timerKey] === 0) {
      const opponent = playerColor === 'white' ? 'black' : 'white';
      finalizeGame(game, {
        status: 'timeout',
        winnerColor: opponent,
        reason: 'Time expired',
      });
      set((current) => ({
        games: { ...current.games, [gameId]: { ...game, timers } },
      }));
      persistState(get);
      return { success: false, message: 'Time expired.' };
    }

    const moveNumber = game.state.fullMoveNumber;
    let descriptor: MoveDescriptor;
    try {
      descriptor = applyMove(game.state, move);
    } catch (error) {
      return { success: false, message: 'Illegal move.' };
    }

    game.moves = [
      ...game.moves,
      {
        id: generateId('chess-move'),
        moveNumber,
        san: descriptor.san,
        from: move.from,
        to: move.to,
        piece: descriptor.piece,
        color: playerColor,
        timestamp: now,
        fen: descriptor.fen,
        capture: descriptor.capture,
        capturedColor: descriptor.capturedColor,
        promotion: descriptor.promotion,
        check: Boolean(descriptor.check),
        checkmate: Boolean(descriptor.checkmate),
      },
    ];

    game.timers = timers;
    game.lastMoveAt = now;
    game.updatedAt = new Date().toISOString();

    let status: ChessGameStatus = 'active';
    let result: '1-0' | '0-1' | '1/2-1/2' | undefined;
    if (descriptor.checkmate) {
      status = 'checkmate';
      result = playerColor === 'white' ? '1-0' : '0-1';
    } else if (isCheckmate(game.state)) {
      status = 'checkmate';
      result = game.state.activeColor === 'white' ? '0-1' : '1-0';
    } else if (isStalemate(game.state)) {
      status = 'stalemate';
      result = '1/2-1/2';
      game.drawReason = 'Stalemate';
    } else if (descriptor.check) {
      status = 'check';
    }

    game.status = status;
    if (result) {
      game.result = result;
      game.winnerUserId =
        result === '1-0' ? game.whiteUserId : result === '0-1' ? game.blackUserId : undefined;
      game.endedAt = new Date().toISOString();
      finalizeHistory(game);
    }

    set((current) => ({
      games: { ...current.games, [gameId]: { ...game } },
    }));
    persistState(get);
    void dispatchConsciousEvent({
      type: 'chess:move.played',
      nodeId: gameId,
      payload: { move: descriptor.san, playerColor },
    });
    return { success: true, descriptor };
  },
  resignGame(gameId, userId) {
    const state = get();
    const game = state.games[gameId];
    if (!game || isGameComplete(game.status)) {
      return;
    }
    const playerColor: ChessColor | null =
      userId === game.whiteUserId ? 'white' : userId === game.blackUserId ? 'black' : null;
    if (!playerColor) {
      return;
    }
    const winnerColor = playerColor === 'white' ? 'black' : 'white';
    finalizeGame(game, {
      status: 'resigned',
      winnerColor,
      reason: 'Resignation',
    });
    set((current) => ({ games: { ...current.games, [gameId]: { ...game } } }));
    persistState(get);
    void dispatchConsciousEvent({
      type: 'chess:game.resigned',
      nodeId: gameId,
      payload: { winnerColor },
    });
  },
  expireInvite(inviteId) {
    set((state) => ({
      invites: state.invites.map((invite) =>
        invite.id === inviteId && invite.status === 'pending'
          ? { ...invite, status: 'expired' }
          : invite
      ),
    }));
    persistState(get);
  },
}));

function getPieceColor(game: ChessGame, square: ChessSquare): ChessColor | null {
  const { file, rank } = coordsFromSquare(square);
  const piece = game.state.board[rank]?.[file];
  return piece?.color ?? null;
}

function finalizeGame(
  game: ChessGame,
  details: { status: ChessGameStatus; winnerColor: ChessColor | null; reason: string }
) {
  game.status = details.status;
  game.result =
    details.status === 'draw' || details.status === 'stalemate'
      ? '1/2-1/2'
      : details.winnerColor === 'white'
      ? '1-0'
      : '0-1';
  game.winnerUserId =
    details.winnerColor === 'white'
      ? game.whiteUserId
      : details.winnerColor === 'black'
      ? game.blackUserId
      : undefined;
  game.drawReason = details.winnerColor ? undefined : details.reason;
  game.endedAt = new Date().toISOString();
  finalizeHistory(game);
}

function finalizeHistory(game: ChessGame) {
  const authState = useAuthStore.getState();
  const users = authState.registeredUsers;
  const white = users.find((user) => user.id === game.whiteUserId);
  const black = users.find((user) => user.id === game.blackUserId);
  const whiteName = white?.name ?? 'White';
  const blackName = black?.name ?? 'Black';
  game.metadata.white = whiteName;
  game.metadata.black = blackName;

  const pgn = generatePGN(game, whiteName, blackName);
  const whiteSummary: ChessGameSummary = {
    id: game.id,
    opponentId: game.blackUserId,
    opponentName: blackName,
    color: 'white',
    result: determineResultForUser(game.result ?? '1/2-1/2', 'white'),
    endedAt: game.endedAt ?? new Date().toISOString(),
    pgn,
    metadata: {
      event: game.metadata.event,
      site: game.metadata.site,
      date: game.startedAt.slice(0, 10),
      white: whiteName,
      black: blackName,
      result: game.result ?? '*',
    },
    moves: game.moves.map((move) => ({ moveNumber: move.moveNumber, san: move.san, fen: move.fen })),
  };
  const blackSummary: ChessGameSummary = {
    id: game.id,
    opponentId: game.whiteUserId,
    opponentName: whiteName,
    color: 'black',
    result: determineResultForUser(game.result ?? '1/2-1/2', 'black'),
    endedAt: game.endedAt ?? new Date().toISOString(),
    pgn,
    metadata: {
      event: game.metadata.event,
      site: game.metadata.site,
      date: game.startedAt.slice(0, 10),
      white: whiteName,
      black: blackName,
      result: game.result ?? '*',
    },
    moves: game.moves.map((move) => ({ moveNumber: move.moveNumber, san: move.san, fen: move.fen })),
  };

  authState.recordChessGame(game.whiteUserId, whiteSummary);
  authState.recordChessGame(game.blackUserId, blackSummary);
}
