import { type Pin, isPinned, togglePin, usePins } from '../pins';
import { PinIcon } from './Icons';

export function PinButton({ pin, size = 22, class: cls = 'nav-icon' }: { pin: Pin; size?: number; class?: string }) {
  usePins();
  const on = isPinned(pin.kind, pin.key);
  return (
    <button
      type="button"
      class={`${cls}${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Unpin ${pin.title}` : `Pin ${pin.title}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(pin);
      }}
    >
      <PinIcon width={size} height={size} filled={on} />
    </button>
  );
}
