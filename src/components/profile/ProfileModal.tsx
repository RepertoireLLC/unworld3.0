import { X, UserPlus, MessageCircle, UserCheck, UserX, Camera, Edit2 } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useFriendStore } from '../../store/friendStore';
import { useChatStore } from '../../store/chatStore';
import { useStoryStore } from '../../store/storyStore';
import { useState, useRef, useCallback } from 'react';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';
import { InterestVectorEditor } from './InterestVectorEditor';
import { useEscapeKey } from '../../hooks/useEscapeKey';

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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEscapeKey(handleClose, Boolean(!showStoryCreator && user && currentUser));

  if (!user || !currentUser) return null;

  const isOwnProfile = currentUser.id === userId;
  const areFriends = isFriend(currentUser.id, userId);
  const hasPending = hasPendingRequest(currentUser.id, userId);

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
          )}
        </div>

        {showStoryCreator && (
          <StoryCreator onClose={() => setShowStoryCreator(false)} />
        )}
      </div>
    </div>
  );
}