import { useEffect } from 'react';

let lockCount = 0;

/**
 * Hook to lock background scrolling on `document.body` when a modal or overlay is active.
 * Uses a global counter to safely support nested or concurrent overlays.
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    lockCount += 1;
    if (lockCount === 1) {
      document.body.classList.add('modal-scroll-locked');
      document.body.style.overflow = 'hidden';
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove('modal-scroll-locked');
        document.body.style.overflow = '';
      }
    };
  }, [isLocked]);
}
