import { useState, useRef, useCallback } from 'react';
import { useStoryStore } from '../../store/storyStore';
import { useAuthStore } from '../../store/authStore';
import { Image, X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface StoryCreatorProps {
  onClose: () => void;
}

export function StoryCreator({ onClose }: StoryCreatorProps) {
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addStory = useStoryStore((state) => state.addStory);
  const currentUser = useAuthStore((state) => state.user);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEscapeKey(handleClose);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser && content.trim()) {
      addStory(currentUser.id, content.trim(), imagePreview || undefined);
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create story"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/85 p-6 shadow-xl backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Create Story</h3>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            type="button"
            aria-label="Close story creator"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30 resize-none"
            rows={4}
          />

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Story preview"
                className="w-full rounded-lg"
              />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-white/10 py-12 text-white/60 transition-colors hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              <Image className="w-8 h-8 mx-auto mb-2" />
              <span>Add an image</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          <button
            type="submit"
            disabled={!content.trim()}
            className="w-full rounded-lg bg-white/20 px-4 py-3 text-white transition-colors hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Share Story
          </button>
        </form>
      </div>
    </div>
  );
}