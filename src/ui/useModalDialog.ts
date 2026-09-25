import { useEffect, useRef } from 'react';
import { createModalKeyDownHandler, focusModal } from './modalDialogKeyboard';

export function useModalDialog<T extends HTMLElement>(onClose: () => void, isOpen = true) {
  const dialogRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    focusModal(dialog);
    const handleKeyDown = createModalKeyDownHandler(dialog, () => { closeRef.current(); });

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return dialogRef;
}
