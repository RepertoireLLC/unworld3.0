import { useState, useCallback } from 'react';
import { Story } from '../../store/storyStore';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface StoryViewerProps {
  stories: Story[];
}

export function StoryViewer({ stories }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isViewing, setIsViewing] = useState(false);

  const closeViewer = useCallback(() => {
    setIsViewing(false);
  }, []);

  useEscapeKey(closeViewer, isViewing);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsViewing(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!isViewing) {
    return (
      <div className="flex space-x-2">
        {stories.map((story, index) => (
          <button
            key={story.id}
            onClick={() => {
              setCurrentIndex(index);
              setIsViewing(true);
            }}
            type="button"
            className="h-16 w-16 rounded-full border-2 border-white/30 p-0.5 transition hover:border-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            {story.image ? (
              <img
                src={story.image}
                alt="Story thumbnail"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white text-xs">Story</span>
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
    >
      <button
        onClick={closeViewer}
        type="button"
        className="absolute right-4 top-4 rounded-full p-1 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
      >
        <X className="w-6 h-6" />
      </button>

      <button
        onClick={handlePrevious}
        type="button"
        className="absolute left-4 rounded-full p-1 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:opacity-50"
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      <div className="max-w-lg w-full mx-4">
        {currentStory.image && (
          <img
            src={currentStory.image}
            alt="Story"
            className="w-full rounded-lg"
          />
        )}
        <p className="text-white mt-4 text-center">{currentStory.content}</p>
      </div>

      <button
        onClick={handleNext}
        type="button"
        className="absolute right-4 rounded-full p-1 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:opacity-50"
        disabled={currentIndex === stories.length - 1}
      >
        <ChevronRight className="w-8 h-8" />
      </button>
    </div>
  );
}