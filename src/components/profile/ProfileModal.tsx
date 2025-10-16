import { X, UserPlus, MessageCircle, UserCheck, UserX, Camera, Edit2, Swords } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useFriendStore } from '../../store/friendStore';
import { useChatStore } from '../../store/chatStore';
import { useStoryStore } from '../../store/storyStore';
import { useState, useRef, useCallback, useMemo } from 'react';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';
import { InterestVectorEditor } from './InterestVectorEditor';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useChessStore } from '../../store/chessStore';
import { ChessArchiveSection } from '../chess/ChessArchiveSection';

interface ProfileModalProps {
  userId: string;
  onClose: () => void;
}

export function ProfileModal({ userId, onClose }: ProfileModalProps) {
  const user = useUserStore((state) => state.users.find(u => u.id === userId));
  const currentUser = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { sendFriendRequest, isFriend, hasPendingRequest } = useFriendStore();
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const stories = useStoryStore((state) => state.getActiveStoriesForUser(userId));
  const [
    challenges,
    sendChessChallenge,
    acceptChessChallenge,
    declineChessChallenge,
    cancelChessChallenge,
    setActiveMatch,
    setActiveReplay,
  ] = useChessStore((state) => [
    state.challenges,
    state.sendChallenge,
    state.acceptChallenge,
    state.declineChallenge,
    state.cancelChallenge,
    state.setActiveMatch,
    state.setActiveReplay,
  ]);
  const games = useChessStore((state) => state.games);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const challengeBetween = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    return (
      challenges.find(
        (challenge) =>
          (challenge.challengerId === currentUser.id && challenge.opponentId === userId) ||
          (challenge.challengerId === userId && challenge.opponentId === currentUser.id),
      ) ?? null
    );
  }, [challenges, currentUser, userId]);

  const linkedGame = challengeBetween?.gameId ? games[challengeBetween.gameId] : undefined;
  const isChallengeInitiator = Boolean(currentUser && challengeBetween?.challengerId === currentUser.id);
  const isChallengeRecipient = Boolean(currentUser && challengeBetween?.opponentId === currentUser.id);

  const handleInitiateChallenge = () => {
    if (!currentUser) {
      return;
    }
    sendChessChallenge(currentUser.id, userId);
  };

  const handleAcceptChallenge = () => {
    if (!currentUser || !challengeBetween) {
      return;
    }
    acceptChessChallenge(challengeBetween.id, currentUser.id);
  };

  const handleDeclineChallenge = () => {
    if (!currentUser || !challengeBetween) {
      return;
    }
    declineChessChallenge(challengeBetween.id, currentUser.id);
  };

  const handleCancelChallenge = () => {
    if (!currentUser || !challengeBetween) {
      return;
    }
    cancelChessChallenge(challengeBetween.id, currentUser.id);
  };

  const handleViewChessGame = (gameId: string) => {
    const record = games[gameId];
    if (!record) {
      return;
    }
    if (
      currentUser &&
      (record.whiteId === currentUser.id || record.blackId === currentUser.id) &&
      record.status === 'active'
    ) {
      setActiveMatch(gameId);
    } else {
      setActiveReplay(gameId);
    }
  };

  const challengeControls = (() => {
    if (!currentUser || isOwnProfile) {
      return null;
    }
    if (!challengeBetween) {
      return (
        <button
          type="button"
          onClick={handleInitiateChallenge}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
        >
          <Swords className="h-4 w-4" />
          Challenge to Chess
        </button>
      );
    }

    if (challengeBetween.status === 'pending') {
      if (isChallengeInitiator) {
        return (
          <div className="flex items-center justify-between rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
            <span>Challenge sent. Awaiting response.</span>
            <button
              type="button"
              onClick={handleCancelChallenge}
              className="rounded-lg border border-cyan-300/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Cancel
            </button>
          </div>
        );
      }
      if (isChallengeRecipient) {
        return (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p className="font-semibold">Incoming chess challenge detected.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleAcceptChallenge}
                className="flex-1 rounded-lg bg-emerald-500/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-900 transition hover:bg-emerald-500/40"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={handleDeclineChallenge}
                className="flex-1 rounded-lg bg-rose-500/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-rose-100 transition hover:bg-rose-500/40"
              >
                Decline
              </button>
            </div>
          </div>
        );
      }
    }

    if (challengeBetween.status === 'accepted' && linkedGame) {
      const isActive = linkedGame.status === 'active';
      return (
        <button
          type="button"
          onClick={() => handleViewChessGame(linkedGame.id)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
        >
          <Swords className="h-4 w-4" />
          {isActive ? 'Enter Match' : 'View Match Result'}
        </button>
      );
    }

    if ((challengeBetween.status === 'declined' || challengeBetween.status === 'cancelled') && isChallengeInitiator) {
      return (
        <button
          type="button"
          onClick={handleInitiateChallenge}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
        >
          <Swords className="h-4 w-4" />
          Re-issue Challenge
        </button>
      );
    }

    if (linkedGame) {
      return (
        <button
          type="button"
          onClick={() => handleViewChessGame(linkedGame.id)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/20"
        >
          <Swords className="h-4 w-4" />
          View Chess Game
        </button>
      );
    }

    return null;
  })();

  if (!user || !currentUser) return null;

  const isOwnProfile = currentUser.id === userId;
  const areFriends = isFriend(currentUser.id, userId);
  const hasPending = hasPendingRequest(currentUser.id, userId);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEscapeKey(handleClose, !showStoryCreator);

  const handleFriendRequest = () => {
    if (!hasPending) {
      sendFriendRequest(currentUser.id, userId);
    }
  };

  const handleMessage = () => {
    setActiveChat(userId);
    onClose();
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProfile({ profilePicture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameUpdate = () => {
    if (editName.trim()) {
      updateProfile({ name: editName.trim() });
      setIsEditing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${user.name}'s profile`}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/80 p-8 shadow-xl backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white"
                  placeholder={user.name}
                />
                <button
                  onClick={handleNameUpdate}
                  className="text-white/60 hover:text-white"
                >
                  Save
                </button>
              </div>
            ) : (
              <span>{user.name}'s Profile</span>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            type="button"
            aria-label="Close profile"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: user.color }}
                >
                  <span className="text-white text-xl">
                    {user.name[0].toUpperCase()}
                  </span>
                </div>
              )}
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    type="button"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-white text-lg font-medium">{user.name}</p>
                {isOwnProfile && !isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditName(user.name);
                    }}
                    className="text-white/60 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="flex items-center gap-2">
                <span className={user.online ? 'text-emerald-400' : 'text-white/60'}>
                  {user.online ? 'Online' : 'Offline'}
                </span>
                {user.online && (
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                )}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Stories</h3>
              {isOwnProfile && (
                <button
                  onClick={() => setShowStoryCreator(true)}
                  className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                >
                  Add Story
                </button>
              )}
            </div>
            {stories.length > 0 ? (
              <div className="flex space-x-2 overflow-x-auto pb-2">
                <StoryViewer stories={stories} />
              </div>
            ) : (
              <p className="text-white/50">No active stories</p>
            )}
          </div>

          {isOwnProfile && (
            <InterestVectorEditor userId={userId} />
          )}

          {!isOwnProfile && (
            <div className="space-y-3">
              <div className="flex space-x-4">
                {areFriends ? (
                  <button className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-500/20 text-emerald-300 rounded-lg cursor-default">
                    <UserCheck className="w-5 h-5" />
                    <span>Friends</span>
                  </button>
                ) : hasPending ? (
                  <button className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-amber-500/20 text-amber-300 rounded-lg cursor-default">
                    <UserX className="w-5 h-5" />
                    <span>Request Pending</span>
                  </button>
                ) : (
                  <button
                    onClick={handleFriendRequest}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Add Friend</span>
                  </button>
                )}
                <button
                  onClick={handleMessage}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Message</span>
                </button>
              </div>
              {challengeControls ? <div>{challengeControls}</div> : null}
            </div>
          )}

          <ChessArchiveSection userId={userId} onViewGame={handleViewChessGame} />
        </div>

        {showStoryCreator && (
          <StoryCreator onClose={() => setShowStoryCreator(false)} />
        )}
      </div>
    </div>
  );
}