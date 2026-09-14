import { useState, useRef, useEffect, useId } from 'react';

interface AutocompleteProps {
  label: string;
  value: string;
  options?: string[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSelect?: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  required?: boolean;
}

export function Autocomplete({
  label,
  value,
  options,
  onChange,
  onBlur,
  onSelect,
  onEnter,
  placeholder,
  required,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputId = useId();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = (options ?? []).filter((opt) =>
    opt.toLowerCase().includes(value.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (highlight < 0 || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <input
        id={inputId}
        className="input w-full"
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        aria-controls={listId}
        aria-expanded={open}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => {
          if (filtered.length > 0) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open) {
            if (e.key === 'ArrowDown' && filtered.length > 0) {
              setOpen(true);
              setHighlight(0);
            } else if (e.key === 'Enter') {
              onEnter?.();
            }
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => (h + 1) % filtered.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
          } else if (e.key === 'Enter' && highlight >= 0) {
            e.preventDefault();
            onChange(filtered[highlight]);
            setOpen(false);
            setHighlight(-1);
            onSelect?.(filtered[highlight]);
          } else if (e.key === 'Enter') {
            onEnter?.();
          } else if (e.key === 'Escape') {
            setOpen(false);
            setHighlight(-1);
          }
        }}
        onBlur={onBlur}
      />

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-xl border border-surface-200 bg-white shadow-lg overflow-y-auto"
          style={{ maxHeight: '30vh' }}
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={i === highlight}
              className={`px-3.5 py-2 text-sm cursor-pointer ${
                i === highlight
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-surface-700 hover:bg-surface-50'
              }`}
              onMouseDown={() => {
                onChange(opt);
                setOpen(false);
                onSelect?.(opt);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
