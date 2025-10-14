import { useEffect } from 'react';

export function useEscapeKey(callback: () => void, isActive = true) {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback, isActive]);
}
