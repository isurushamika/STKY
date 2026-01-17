import { useEffect, useCallback, RefObject } from 'react';

export const useClickOutside = <T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

export const useKeyboard = (
  handlers: Record<string, (e: KeyboardEvent) => void>
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const combo = [
        e.ctrlKey && 'ctrl',
        e.shiftKey && 'shift',
        e.altKey && 'alt',
        key,
      ]
        .filter(Boolean)
        .join('+');

      if (handlers[combo]) {
        e.preventDefault();
        handlers[combo](e);
      } else if (handlers[key]) {
        handlers[key](e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

export const useDoubleClick = <T extends HTMLElement>(
  ref: RefObject<T>,
  onSingleClick?: () => void,
  onDoubleClick?: () => void,
  delay = 250
) => {
  let clickTimeout: NodeJS.Timeout | null = null;
  let clickCount = 0;

  const handleClick = useCallback(() => {
    clickCount++;

    if (clickCount === 1) {
      clickTimeout = setTimeout(() => {
        if (clickCount === 1 && onSingleClick) {
          onSingleClick();
        }
        clickCount = 0;
      }, delay);
    } else if (clickCount === 2) {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      if (onDoubleClick) {
        onDoubleClick();
      }
      clickCount = 0;
    }
  }, [onSingleClick, onDoubleClick, delay]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('click', handleClick);
    return () => {
      element.removeEventListener('click', handleClick);
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [ref, handleClick]);
};
