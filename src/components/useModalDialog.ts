import { useEffect, useRef } from 'react';

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

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

    const preferredFocus = dialog.querySelector<HTMLElement>('[data-autofocus]');
    const firstControl = dialog.querySelector<HTMLElement>(focusableSelector);
    (preferredFocus ?? firstControl ?? dialog).focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const controls = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((control) => control.getClientRects().length > 0);
      if (!controls.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return dialogRef;
}
