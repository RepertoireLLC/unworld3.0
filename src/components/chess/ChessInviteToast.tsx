import { useMemo } from 'react';
import { Sword, Check, X as CloseIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChessStore, type ChessInvite } from '../../store/chessStore';
import { useModalStore } from '../../store/modalStore';
import { useToastStore } from '../../store/toastStore';

export function ChessInviteToast() {
  const currentUser = useAuthStore((state) => state.user);
  const registeredUsers = useAuthStore((state) => state.registeredUsers);
  const invites = useChessStore((state) => state.invites);
  const acceptInvite = useChessStore((state) => state.acceptInvite);
  const declineInvite = useChessStore((state) => state.declineInvite);
  const setActiveGame = useChessStore((state) => state.setActiveGame);
  const isChessOpen = useModalStore((state) => state.isChessOverlayOpen);
  const setChessOpen = useModalStore((state) => state.setChessOverlayOpen);
  const addToast = useToastStore((state) => state.addToast);

  const pendingInvites = useMemo(
    () =>
      invites.filter(
        (invite) =>
          invite.status === 'pending' &&
          invite.toUserId === currentUser?.id
      ),
    [invites, currentUser?.id]
  );

  if (!currentUser || isChessOpen || pendingInvites.length === 0) {
    return null;
  }

  const getUserName = (userId: string) =>
    registeredUsers.find((user) => user.id === userId)?.name ?? 'Unknown operator';

  const handleAccept = (invite: ChessInvite) => {
    const result = acceptInvite(invite.id, currentUser.id, {
      whiteName: getUserName(invite.fromUserId),
      blackName: getUserName(invite.toUserId),
    });
    if (!result.success) {
      addToast({
        title: 'Invite failed',
        description: result.message ?? 'Unable to accept the chess invitation.',
        variant: 'error',
      });
      return;
    }
    if (result.gameId) {
      setActiveGame(result.gameId);
    }
    setChessOpen(true);
    addToast({
      title: 'Game launched',
      description: `Starting a match with ${getUserName(invite.fromUserId)}.`,
      variant: 'success',
    });
  };

  const handleDecline = (invite: ChessInvite) => {
    declineInvite(invite.id, currentUser.id);
    addToast({
      title: 'Invite declined',
      description: `Declined challenge from ${getUserName(invite.fromUserId)}.`,
      variant: 'info',
    });
  };

  return (
    <div className="fixed bottom-6 left-6 z-[110] flex max-w-sm flex-col gap-3">
      {pendingInvites.slice(0, 3).map((invite) => (
        <div
          key={invite.id}
          className="rounded-2xl border border-emerald-400/30 bg-slate-950/80 p-4 text-white shadow-xl backdrop-blur"
        >
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-200">
            <Sword className="h-4 w-4" /> Chess Challenge
          </div>
          <p className="text-sm font-medium text-white">
            {getUserName(invite.fromUserId)} wants to play chess.
          </p>
          <p className="mt-1 text-xs text-white/60">Received {new Date(invite.createdAt).toLocaleTimeString()}</p>
          <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
            <button
              type="button"
              onClick={() => handleAccept(invite)}
              className="ui-button ui-button--primary flex-1"
            >
              <Check className="h-4 w-4" /> Accept
            </button>
            <button
              type="button"
              onClick={() => handleDecline(invite)}
              className="ui-button ui-button--ghost flex-1"
            >
              <CloseIcon className="h-4 w-4" /> Decline
            </button>
          </div>
          <button
            type="button"
            onClick={() => setChessOpen(true)}
            className="mt-3 w-full text-center text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white"
          >
            Open Chess Hub
          </button>
        </div>
      ))}
    </div>
  );
}
