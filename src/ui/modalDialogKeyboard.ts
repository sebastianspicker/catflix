const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function focusModal(dialog: HTMLElement): void {
  const preferredFocus = dialog.querySelector<HTMLElement>('[data-autofocus]');
  const firstControl = dialog.querySelector<HTMLElement>(focusableSelector);
  (preferredFocus ?? firstControl ?? dialog).focus({ preventScroll: true });
}

export function createModalKeyDownHandler(dialog: HTMLElement, onClose: () => void): (event: KeyboardEvent) => void {
  return (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    trapTabWithin(dialog, event);
  };
}

function trapTabWithin(dialog: HTMLElement, event: KeyboardEvent): void {
  const controls = visibleControls(dialog);
  if (controls.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = controls[0]!;
  const last = controls[controls.length - 1]!;
  if (event.shiftKey && document.activeElement === first) moveFocus(event, last);
  if (!event.shiftKey && document.activeElement === last) moveFocus(event, first);
}

function visibleControls(dialog: HTMLElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
    .filter((control) => control.getClientRects().length > 0);
}

function moveFocus(event: KeyboardEvent, target: HTMLElement): void {
  event.preventDefault();
  target.focus();
}
