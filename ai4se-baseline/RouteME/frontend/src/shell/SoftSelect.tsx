import { useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };

type Props = {
  id?: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  ariaLabel?: string;
};

/**
 * 柔和风格的下拉选择：触发器与选项面板都由页面样式控制，
 * 不使用 Portal 或动态定位，避免 Edge 下浮层异常，同时保持圆润的视觉。
 */
export function SoftSelect({ id, value, options, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointer = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="soft-select" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="soft-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="soft-select-value">{selected?.label}</span>
        <span className="soft-select-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="soft-select-panel" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={
                option.value === value ? 'soft-select-option active' : 'soft-select-option'
              }
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <span className="soft-select-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
