import { X, UserPlus, MessageCircle, UserCheck, UserX, Camera, Edit2 } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useFriendStore } from '../../store/friendStore';
import { useChatStore } from '../../store/chatStore';
import { useStoryStore } from '../../store/storyStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';
import { useLayerStore } from '../../store/layerStore';

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
  const availableDomains = useLayerStore((state) => state.availableDomains);
  const userLayers = useLayerStore((state) => state.userLayers[userId] ?? []);
  const proposals = useLayerStore((state) => state.proposals);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [isEditingLayers, setIsEditingLayers] = useState(false);
  const [layerSelection, setLayerSelection] = useState<string[]>([]);
  const [layerProposal, setLayerProposal] = useState('');
  const [layerError, setLayerError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user || !currentUser) return null;

  const isOwnProfile = currentUser.id === userId;
  const areFriends = isFriend(currentUser.id, userId);
  const hasPending = hasPendingRequest(currentUser.id, userId);
  const userProposal = useMemo(
    () => proposals.find((proposal) => proposal.userId === userId),
    [proposals, userId]
  );

  useEffect(() => {
    if (isEditingLayers) {
      setLayerSelection(userLayers);
      setLayerProposal(userProposal?.value ?? '');
      setLayerError('');
    }
  }, [isEditingLayers, userLayers, userProposal]);

  const sortedDomains = useMemo(
    () => [...availableDomains].sort((a, b) => a.name.localeCompare(b.name)),
    [availableDomains]
  );

  const displayLayers = useMemo(() => {
    if (!userLayers?.length) {
      return [] as { id: string; label: string }[];
    }
    return userLayers.map((layerId) => {
      const match = availableDomains.find((domain) => domain.id === layerId);
      return {
        id: layerId,
        label: match ? match.name : layerId,
      };
    });
  }, [availableDomains, userLayers]);

  const toggleLayerSelection = (layerId: string) => {
    setLayerSelection((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId]
    );
  };

  const handleSaveLayers = () => {
    const trimmedProposal = layerProposal.trim();
    if (layerSelection.length === 0 && !trimmedProposal) {
      setLayerError('Select at least one existing layer or submit a proposal.');
      return;
    }

    updateProfile({
      layers: layerSelection,
      proposedLayer: trimmedProposal || null,
    });

    setLayerError('');
    setIsEditingLayers(false);
  };

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
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-50" onClick={onClose}>
      <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
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
          <button onClick={onClose} className="text-white/60 hover:text-white">
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
                    className="absolute bottom-0 right-0 p-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Layer Memberships</h3>
              {isOwnProfile && (
                <div className="flex items-center space-x-2">
                  {layerError && (
                    <span className="text-xs text-red-300">{layerError}</span>
                  )}
                  <button
                    onClick={() => {
                      if (isEditingLayers) {
                        setIsEditingLayers(false);
                        setLayerError('');
                      } else {
                        setIsEditingLayers(true);
                      }
                    }}
                    className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                  >
                    {isEditingLayers ? 'Cancel' : 'Manage'}
                  </button>
                </div>
              )}
            </div>
            {isEditingLayers ? (
              <div className="space-y-4">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sortedDomains.map((domain) => (
                    <label
                      key={domain.id}
                      className="flex items-start space-x-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={layerSelection.includes(domain.id)}
                        onChange={() => toggleLayerSelection(domain.id)}
                        className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-white focus:ring-white/40"
                      />
                      <div>
                        <p className="text-white font-medium">{domain.name}</p>
                        {domain.description && (
                          <p className="text-sm text-white/60">{domain.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                  {sortedDomains.length === 0 && (
                    <p className="text-white/60 text-sm">No layers available yet.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-white/80">Request a new layer</label>
                  <input
                    type="text"
                    value={layerProposal}
                    onChange={(e) => setLayerProposal(e.target.value)}
                    placeholder="Propose a new collaboration domain"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
                  />
                  <p className="text-xs text-white/60">
                    We\'ll review proposed layers and notify you once they\'re available.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveLayers}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  >
                    Save Layers
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {displayLayers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {displayLayers.map((layer) => (
                      <span
                        key={layer.id}
                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm text-white"
                      >
                        {layer.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60 text-sm">
                    {isOwnProfile
                      ? 'You haven\'t joined any layers yet. Tap manage to get started.'
                      : 'No shared layers yet.'}
                  </p>
                )}
                {userProposal?.value && (
                  <p className="text-xs text-amber-300">
                    Pending proposal: {userProposal.value}
                  </p>
                )}
              </div>
            )}
          </div>

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