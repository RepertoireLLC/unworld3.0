import { create } from 'zustand';
import { generateId } from '../utils/id';
import {
  ChessMoveDescriptor,
  ChessPieceType,
  ChessPosition,
  LegalMove,
  createInitialPosition,
  evaluateTermination,
  generateLegalMoves,
  getPositionSignature,
  makeMove,
} from '../core/chess/engine';
import { buildPGN } from '../core/chess/pgn';
import { useMeshStore } from './meshStore';
import { useToastStore } from './toastStore';
import { useUserStore } from './userStore';
import { useAuthStore } from './authStore';

export interface ChessChallenge {
  id: string;
  challengerId: string;
  opponentId: string;
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  gameId?: string;
}

export type ChessGameResolution =
  | 'active'
  | 'checkmate'
  | 'stalemate'
  | 'draw-fifty-move'
  | 'draw-repetition'
  | 'draw-agreement'
  | 'resigned'
  | 'timeout';

export interface ChessGameRecord {
  id: string;
  whiteId: string;
  blackId: string;
  status: 'active' | 'complete';
  resolution: ChessGameResolution;
  winner: 'white' | 'black' | 'draw' | null;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  outcomeReason: string | null;
  moves: ChessMoveDescriptor[];
  position: ChessPosition;
  positionCounts: Record<string, number>;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  pgn: string;
  metadata: {
    whiteName: string;
    blackName: string;
    whiteRating?: number;
    blackRating?: number;
    isPublic: boolean;
  };
  pendingDrawOffer?: { by: string; createdAt: number } | null;
}

export type ChessNetworkEvent =
  | { type: 'challenge:create'; payload: ChessChallenge }
  | { type: 'challenge:update'; payload: { id: string; status: ChessChallenge['status']; gameId?: string; whiteId?: string; blackId?: string; resolution?: ChessGameResolution; result?: ChessGameRecord['result']; outcomeReason?: string | null } }
  | { type: 'game:move'; payload: { gameId: string; from: number; to: number; promotion?: ChessPieceType } }
  | { type: 'game:draw-offer'; payload: { gameId: string; fromUserId: string } }
  | { type: 'game:draw-response'; payload: { gameId: string; accepted: boolean; byUserId: string; resolution?: ChessGameResolution; result?: ChessGameRecord['result']; reason?: string } }
  | { type: 'game:resign'; payload: { gameId: string; byUserId: string; winnerId: string; resolution: ChessGameResolution; result: ChessGameRecord['result']; reason: string } };

interface ChessState {
  challenges: ChessChallenge[];
  games: Record<string, ChessGameRecord>;
  activeMatchId: string | null;
  activeReplayId: string | null;
  sendChallenge: (challengerId: string, opponentId: string) => void;
  cancelChallenge: (challengeId: string, userId: string) => void;
  acceptChallenge: (challengeId: string, userId: string) => void;
  declineChallenge: (challengeId: string, userId: string) => void;
  makeMove: (gameId: string, userId: string, from: number, to: number, promotion?: ChessPieceType) => void;
  resignGame: (gameId: string, userId: string) => void;
  offerDraw: (gameId: string, userId: string) => void;
  respondToDraw: (gameId: string, userId: string, accept: boolean) => void;
  setActiveMatch: (gameId: string | null) => void;
  setActiveReplay: (gameId: string | null) => void;
  getGamesForUser: (userId: string) => ChessGameRecord[];
  getChallengesForUser: (userId: string) => ChessChallenge[];
  getGameById: (gameId: string) => ChessGameRecord | undefined;
  handleNetworkEvent: (event: ChessNetworkEvent) => void;
  refreshPGN: (gameId: string) => void;
}

const NETWORK_CHANNEL = 'harmonia.chess';

function broadcastEvent(event: ChessNetworkEvent) {
  try {
    useMeshStore.getState().broadcast(NETWORK_CHANNEL, event);
  } catch (error) {
    console.warn('Failed to broadcast chess event', error);
  }
}

function notify(title: string, description: string, variant: 'info' | 'success' | 'warning' | 'error' = 'info') {
  useToastStore.getState().addToast({ title, description, variant });
}

function determineResultFromResolution(resolution: ChessGameResolution, winner: ChessGameRecord['winner']): ChessGameRecord['result'] {
  if (winner === 'white') {
    return '1-0';
  }
  if (winner === 'black') {
    return '0-1';
  }
  if (resolution === 'active') {
    return '*';
  }
  return '1/2-1/2';
}

function buildGamePGN(game: ChessGameRecord): string {
  return buildPGN(
    {
      white: `${game.metadata.whiteName}${game.metadata.whiteRating ? ` (${game.metadata.whiteRating})` : ''}`,
      black: `${game.metadata.blackName}${game.metadata.blackRating ? ` (${game.metadata.blackRating})` : ''}`,
      result: game.result,
      termination: game.outcomeReason ?? undefined,
      additionalTags: {
        'HarmoniaGameId': game.id,
        'Visibility': game.metadata.isPublic ? 'Public' : 'Private',
      },
    },
    game.moves,
  );
}

function initializeGame(whiteId: string, blackId: string, isPublic: boolean): ChessGameRecord {
  const position = createInitialPosition();
  const signature = getPositionSignature(position);
  const whiteUser = useUserStore.getState().users.find((user) => user.id === whiteId);
  const blackUser = useUserStore.getState().users.find((user) => user.id === blackId);
  const startedAt = Date.now();

  return {
    id: generateId('chess_game'),
    whiteId,
    blackId,
    status: 'active',
    resolution: 'active',
    winner: null,
    result: '*',
    outcomeReason: null,
    moves: [],
    position,
    positionCounts: { [signature]: 1 },
    startedAt,
    updatedAt: startedAt,
    pgn: '',
    metadata: {
      whiteName: whiteUser?.name ?? 'White',
      blackName: blackUser?.name ?? 'Black',
      isPublic,
    },
    pendingDrawOffer: null,
  };
}

function findLegalMove(position: ChessPosition, from: number, to: number, promotion?: ChessPieceType): LegalMove | null {
  const legalMoves = generateLegalMoves(position);
  return (
    legalMoves.find(
      (move) =>
        move.from === from &&
        move.to === to &&
        (move.promotion ?? null) === (promotion ?? null),
    ) ?? null
  );
}

function resolveOutcome(game: ChessGameRecord, resolution: ChessGameResolution, winner: ChessGameRecord['winner'], reason: string | null): ChessGameRecord {
  const completedAt = Date.now();
  const result = determineResultFromResolution(resolution, winner);
  const updated: ChessGameRecord = {
    ...game,
    status: resolution === 'active' ? 'active' : 'complete',
    resolution,
    winner,
    outcomeReason: reason,
    result,
    completedAt,
    updatedAt: completedAt,
    pendingDrawOffer: null,
  };
  updated.pgn = buildGamePGN(updated);
  return updated;
}

export const useChessStore = create<ChessState>((set, get) => ({
  challenges: [],
  games: {},
  activeMatchId: null,
  activeReplayId: null,

  sendChallenge: (challengerId, opponentId) => {
    const existing = get().challenges.find(
      (challenge) =>
        challenge.status === 'pending' &&
        ((challenge.challengerId === challengerId && challenge.opponentId === opponentId) ||
          (challenge.challengerId === opponentId && challenge.opponentId === challengerId)),
    );
    if (existing) {
      notify('Challenge already active', 'You already have a pending challenge with this node.', 'warning');
      return;
    }

    const challenge: ChessChallenge = {
      id: generateId('chess_challenge'),
      challengerId,
      opponentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'pending',
    };

    set((state) => ({ challenges: [...state.challenges, challenge] }));

    const challengerName = useUserStore.getState().users.find((user) => user.id === challengerId)?.name ?? 'A challenger';
    const opponentName = useUserStore.getState().users.find((user) => user.id === opponentId)?.name ?? 'your node';
    notify('Chess challenge dispatched', `${challengerName} challenged ${opponentName} to a match.`, 'info');

    broadcastEvent({ type: 'challenge:create', payload: challenge });
  },

  cancelChallenge: (challengeId, userId) => {
    const challenge = get().challenges.find((entry) => entry.id === challengeId);
    if (!challenge || challenge.status !== 'pending') {
      return;
    }
    if (challenge.challengerId !== userId) {
      return;
    }

    const updatedChallenge: ChessChallenge = { ...challenge, status: 'cancelled', updatedAt: Date.now() };
    set((state) => ({
      challenges: state.challenges.map((entry) => (entry.id === challengeId ? updatedChallenge : entry)),
    }));
    broadcastEvent({ type: 'challenge:update', payload: { id: challengeId, status: 'cancelled' } });
  },

  acceptChallenge: (challengeId, userId) => {
    const challenge = get().challenges.find((entry) => entry.id === challengeId);
    if (!challenge || challenge.status !== 'pending') {
      return;
    }
    if (challenge.opponentId !== userId) {
      return;
    }

    const hashInput = `${challenge.id}:${challenge.challengerId}:${challenge.opponentId}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i += 1) {
      hash = (hash * 31 + hashInput.charCodeAt(i)) % 9973;
    }
    const challengerAsWhite = hash % 2 === 0;
    const whiteId = challengerAsWhite ? challenge.challengerId : challenge.opponentId;
    const blackId = challengerAsWhite ? challenge.opponentId : challenge.challengerId;
    const game = initializeGame(whiteId, blackId, true);

    const updatedChallenge: ChessChallenge = {
      ...challenge,
      status: 'accepted',
      updatedAt: Date.now(),
      gameId: game.id,
    };

    set((state) => ({
      challenges: state.challenges.map((entry) => (entry.id === challengeId ? updatedChallenge : entry)),
      games: { ...state.games, [game.id]: game },
      activeMatchId: game.id,
    }));

    const opponentName = useUserStore.getState().users.find((user) => user.id === challenge.challengerId)?.name ?? 'your challenger';
    notify('Challenge accepted', `Match initiated with ${opponentName}.`, 'success');

    broadcastEvent({
      type: 'challenge:update',
      payload: {
        id: challengeId,
        status: 'accepted',
        gameId: game.id,
        whiteId: game.whiteId,
        blackId: game.blackId,
      },
    });
  },

  declineChallenge: (challengeId, userId) => {
    const challenge = get().challenges.find((entry) => entry.id === challengeId);
    if (!challenge || challenge.status !== 'pending') {
      return;
    }
    if (challenge.opponentId !== userId) {
      return;
    }

    const updatedChallenge: ChessChallenge = { ...challenge, status: 'declined', updatedAt: Date.now() };
    set((state) => ({
      challenges: state.challenges.map((entry) => (entry.id === challengeId ? updatedChallenge : entry)),
    }));

    broadcastEvent({ type: 'challenge:update', payload: { id: challengeId, status: 'declined' } });
  },

  makeMove: (gameId, userId, from, to, promotion) => {
    const game = get().games[gameId];
    if (!game || game.status !== 'active') {
      return;
    }
    const color = game.whiteId === userId ? 'white' : game.blackId === userId ? 'black' : null;
    if (!color || game.position.activeColor !== color) {
      notify('Illegal move', 'It is not your turn.', 'warning');
      return;
    }

    const move = findLegalMove(game.position, from, to, promotion);
    if (!move) {
      notify('Illegal move', 'That move violates the rules of chess.', 'error');
      return;
    }

    const descriptor = makeMove(game.position, move);
    const nextPosition = descriptor.resultingPosition;
    const signature = getPositionSignature(nextPosition);
    const positionCounts = { ...game.positionCounts, [signature]: (game.positionCounts[signature] ?? 0) + 1 };
    const nextMoves = [...game.moves, descriptor];

    const termination = evaluateTermination(nextPosition, positionCounts[signature]);
    let updatedGame: ChessGameRecord = {
      ...game,
      position: nextPosition,
      moves: nextMoves,
      positionCounts,
      updatedAt: Date.now(),
      pendingDrawOffer: null,
    };

    if (termination.status !== 'active') {
      const winner = termination.winner === 'white' ? 'white' : termination.winner === 'black' ? 'black' : 'draw';
      updatedGame = resolveOutcome(updatedGame, termination.status, winner, termination.reason);
    } else if (descriptor.isCheckmate) {
      updatedGame = resolveOutcome(updatedGame, 'checkmate', descriptor.color === 'white' ? 'white' : 'black', 'Checkmate');
    } else if (descriptor.isStalemate) {
      updatedGame = resolveOutcome(updatedGame, 'stalemate', 'draw', 'Stalemate');
    } else {
      updatedGame.pgn = buildGamePGN(updatedGame);
    }

    set((state) => ({
      games: { ...state.games, [gameId]: updatedGame },
    }));

    broadcastEvent({
      type: 'game:move',
      payload: { gameId, from, to, promotion },
    });
  },

  resignGame: (gameId, userId) => {
    const game = get().games[gameId];
    if (!game || game.status !== 'active') {
      return;
    }
    const color = game.whiteId === userId ? 'white' : game.blackId === userId ? 'black' : null;
    if (!color) {
      return;
    }
    const winner = color === 'white' ? 'black' : 'white';
    const updated = resolveOutcome(game, 'resigned', winner, `${color === 'white' ? 'White' : 'Black'} resigns`);
    set((state) => ({ games: { ...state.games, [gameId]: updated } }));

    broadcastEvent({
      type: 'game:resign',
      payload: {
        gameId,
        byUserId: userId,
        winnerId: winner === 'white' ? game.whiteId : game.blackId,
        resolution: 'resigned',
        result: updated.result,
        reason: updated.outcomeReason ?? 'Resignation',
      },
    });
  },

  offerDraw: (gameId, userId) => {
    const game = get().games[gameId];
    if (!game || game.status !== 'active') {
      return;
    }
    if (game.pendingDrawOffer) {
      notify('Draw offer pending', 'There is already a draw offer awaiting response.', 'info');
      return;
    }
    if (userId !== game.whiteId && userId !== game.blackId) {
      return;
    }

    const updated: ChessGameRecord = {
      ...game,
      pendingDrawOffer: { by: userId, createdAt: Date.now() },
    };
    set((state) => ({ games: { ...state.games, [gameId]: updated } }));

    broadcastEvent({ type: 'game:draw-offer', payload: { gameId, fromUserId: userId } });
  },

  respondToDraw: (gameId, userId, accept) => {
    const game = get().games[gameId];
    if (!game || game.status !== 'active') {
      return;
    }
    const offer = game.pendingDrawOffer;
    if (!offer || offer.by === userId) {
      return;
    }

    let updated = { ...game, pendingDrawOffer: null } as ChessGameRecord;
    if (accept) {
      updated = resolveOutcome(game, 'draw-agreement', 'draw', 'Draw agreed');
    }

    set((state) => ({ games: { ...state.games, [gameId]: updated } }));

    broadcastEvent({
      type: 'game:draw-response',
      payload: {
        gameId,
        accepted: accept,
        byUserId: userId,
        resolution: updated.resolution,
        result: updated.result,
        reason: updated.outcomeReason ?? undefined,
      },
    });
  },

  setActiveMatch: (gameId) => {
    set({ activeMatchId: gameId });
  },

  setActiveReplay: (gameId) => {
    set({ activeReplayId: gameId });
  },

  getGamesForUser: (userId) => {
    return Object.values(get().games)
      .filter((game) => game.whiteId === userId || game.blackId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getChallengesForUser: (userId) => {
    return get().challenges
      .filter((challenge) => challenge.challengerId === userId || challenge.opponentId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getGameById: (gameId) => {
    return get().games[gameId];
  },

  refreshPGN: (gameId) => {
    const game = get().games[gameId];
    if (!game) {
      return;
    }
    const updated: ChessGameRecord = { ...game, pgn: buildGamePGN(game) };
    set((state) => ({ games: { ...state.games, [gameId]: updated } }));
  },

  handleNetworkEvent: (event) => {
    switch (event.type) {
      case 'challenge:create': {
        const challenge = event.payload;
        set((state) => ({
          challenges: state.challenges.some((entry) => entry.id === challenge.id)
            ? state.challenges
            : [...state.challenges, challenge],
        }));
        const auth = useAuthStore.getState().user;
        if (auth && challenge.opponentId === auth.id) {
          const challengerName = useUserStore.getState().users.find((user) => user.id === challenge.challengerId)?.name ?? 'Another node';
          notify('Incoming chess challenge', `${challengerName} wants to play a match.`, 'info');
        }
        break;
      }
      case 'challenge:update': {
        const auth = useAuthStore.getState().user;
        const { id, status, gameId, whiteId, blackId } = event.payload;
        set((state) => {
          const updatedChallenges = state.challenges.map((challenge) =>
            challenge.id === id
              ? { ...challenge, status, updatedAt: Date.now(), gameId: gameId ?? challenge.gameId }
              : challenge,
          );
          const updates: Partial<ChessState> = { challenges: updatedChallenges };

          if (status === 'accepted' && gameId && whiteId && blackId) {
            if (!state.games[gameId]) {
              const freshGame = initializeGame(whiteId, blackId, true);
              updates.games = { ...state.games, [gameId]: { ...freshGame, id: gameId } };
            }
            if (auth && (auth.id === whiteId || auth.id === blackId) && !state.activeMatchId) {
              updates.activeMatchId = gameId;
            }
          }

          return updates;
        });

        if (status === 'accepted' && auth && gameId) {
          const challenge = get().challenges.find((entry) => entry.id === id);
          const opponentId = auth.id === challenge?.challengerId ? challenge?.opponentId : challenge?.challengerId;
          const opponentName = opponentId
            ? useUserStore.getState().users.find((user) => user.id === opponentId)?.name ?? 'Opponent'
            : 'Opponent';
          if (auth.id === whiteId || auth.id === blackId) {
            notify('Match ready', `${opponentName} is ready to play.`, 'success');
          }
        }

        if (status === 'declined' || status === 'cancelled') {
          const challenge = get().challenges.find((entry) => entry.id === id);
          const authId = auth?.id;
          if (challenge && authId && challenge.challengerId === authId && status !== 'cancelled') {
            const opponentName = useUserStore.getState().users.find((user) => user.id === challenge.opponentId)?.name ?? 'Opponent';
            notify('Challenge declined', `${opponentName} is unavailable for chess right now.`, 'warning');
          }
        }

        break;
      }
      case 'game:move': {
        const { gameId, from, to, promotion } = event.payload;
        const game = get().games[gameId];
        if (!game || game.status !== 'active') {
          break;
        }
        const move = findLegalMove(game.position, from, to, promotion);
        if (!move) {
          break;
        }
        const descriptor = makeMove(game.position, move);
        const nextPosition = descriptor.resultingPosition;
        const signature = getPositionSignature(nextPosition);
        const positionCounts = { ...game.positionCounts, [signature]: (game.positionCounts[signature] ?? 0) + 1 };
        const termination = evaluateTermination(nextPosition, positionCounts[signature]);

        let updated: ChessGameRecord = {
          ...game,
          position: nextPosition,
          moves: [...game.moves, descriptor],
          positionCounts,
          updatedAt: Date.now(),
          pendingDrawOffer: null,
        };

        if (termination.status !== 'active') {
          const winner = termination.winner === 'white' ? 'white' : termination.winner === 'black' ? 'black' : 'draw';
          updated = resolveOutcome(updated, termination.status, winner, termination.reason);
        } else if (descriptor.isCheckmate) {
          updated = resolveOutcome(updated, 'checkmate', descriptor.color === 'white' ? 'white' : 'black', 'Checkmate');
        } else if (descriptor.isStalemate) {
          updated = resolveOutcome(updated, 'stalemate', 'draw', 'Stalemate');
        } else {
          updated.pgn = buildGamePGN(updated);
        }

        set((state) => ({ games: { ...state.games, [gameId]: updated } }));
        break;
      }
      case 'game:draw-offer': {
        const { gameId, fromUserId } = event.payload;
        const game = get().games[gameId];
        if (!game) {
          break;
        }
        const updated: ChessGameRecord = { ...game, pendingDrawOffer: { by: fromUserId, createdAt: Date.now() } };
        set((state) => ({ games: { ...state.games, [gameId]: updated } }));
        const auth = useAuthStore.getState().user;
        if (auth && (game.whiteId === auth.id || game.blackId === auth.id) && fromUserId !== auth.id) {
          notify('Draw offer received', 'Your opponent offered a draw.', 'info');
        }
        break;
      }
      case 'game:draw-response': {
        const { gameId, accepted, resolution, result, reason } = event.payload;
        const game = get().games[gameId];
        if (!game) {
          break;
        }
        let updated: ChessGameRecord = { ...game, pendingDrawOffer: null };
        if (accepted && resolution && result) {
          const winner: ChessGameRecord['winner'] = result === '1-0' ? 'white' : result === '0-1' ? 'black' : 'draw';
          updated = resolveOutcome(updated, resolution, winner, reason ?? 'Draw agreed');
        }
        set((state) => ({ games: { ...state.games, [gameId]: updated } }));
        break;
      }
      case 'game:resign': {
        const { gameId, winnerId, resolution, result, reason } = event.payload;
        const game = get().games[gameId];
        if (!game) {
          break;
        }
        const winner = winnerId === game.whiteId ? 'white' : 'black';
        const updated = resolveOutcome(game, resolution, winner, reason);
        set((state) => ({ games: { ...state.games, [gameId]: updated } }));
        break;
      }
      default:
        break;
    }
  },
}));
