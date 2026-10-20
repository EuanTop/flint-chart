// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** Controls the chart card and the board card share: the theme switch and the bar's action buttons. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChartAssemblyInput } from 'flint-chart';
import { THEME_PRESETS, DEFAULT_THEME_ICON } from 'flint-chart';

/** A theme preset's icon as an `<img>`-ready URL. */
function themeIconUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

type ThemeValue = ChartAssemblyInput['theme_spec'];
type ThemeChoice = { value: ThemeValue; label: string; icon: string; description: string };

const THEME_CHOICES: ThemeChoice[] = [
  {
    value: undefined,
    label: 'Flint default',
    icon: DEFAULT_THEME_ICON,
    description: "Flint's own defaults \u2014 no house applied.",
  },
  ...Object.values(THEME_PRESETS).map((preset) => ({
    value: preset.id,
    label: preset.label,
    icon: preset.icon,
    description: preset.description,
  })),
];

/**
 * The house switch, first in the bar. A theme is the outermost decision on the
 * chart — it settles the surface, the ink and the type that everything the
 * other controls touch is then drawn in — so it reads left of them.
 *
 * It borrows the chart-type switch's chrome rather than growing its own: the
 * two are the same gesture (a small picture of the result, a caret, a list),
 * and giving them different shapes would suggest they are different kinds of
 * control.
 */
export function ThemeControl(props: {
  themeSpec: ThemeValue;
  customTheme?: Exclude<ThemeValue, string | undefined>;
  onTheme: (theme: ThemeValue) => void;
}) {
  const { themeSpec, customTheme, onTheme } = props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const retainedCustom = customTheme ?? (typeof themeSpec === 'object' ? themeSpec : undefined);
  const inheritedPreset = retainedCustom?.extends
    ? THEME_PRESETS[retainedCustom.extends]
    : undefined;
  const customChoice: ThemeChoice | undefined = retainedCustom
    ? {
        value: retainedCustom,
        label: retainedCustom.label ?? retainedCustom.id ?? 'Custom theme',
        icon: inheritedPreset?.icon ?? DEFAULT_THEME_ICON,
        description: 'Custom ThemeSpec supplied with this chart.',
      }
    : undefined;
  const choices = customChoice ? [customChoice, ...THEME_CHOICES] : THEME_CHOICES;
  const current = typeof themeSpec === 'object'
    ? customChoice ?? THEME_CHOICES[0]
    : THEME_CHOICES.find((choice) => choice.value === themeSpec) ?? THEME_CHOICES[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="transform-control tc-theme" ref={rootRef}>
      <button
        type="button"
        className="tc-type tc-type-theme"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <img className="tc-icon" src={themeIconUrl(current.icon)} alt="" />
        <svg className="tc-caret" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 4.5 L6 7.5 L9 4.5" />
        </svg>
      </button>

      {open && (
        <ul className="tc-menu" role="listbox" aria-label="Theme">
          {choices.map((choice) => {
            const selected = choice === current;
            return (
              <li
                key={typeof choice.value === 'string' ? choice.value : choice.value ? 'custom' : 'default'}
                role="option"
                aria-selected={selected}
                title={choice.description}
                className={selected ? 'tc-opt tc-opt-selected' : 'tc-opt'}
                onClick={() => {
                  onTheme(choice.value);
                  setOpen(false);
                }}
              >
                <img className="tc-opt-icon" src={themeIconUrl(choice.icon)} alt="" />
                <span>{choice.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ActionButton(props: {
  label: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { label, className = '', disabled = false, onClick, children } = props;
  const [showTip, setShowTip] = useState(false);
  const [tipPosition, setTipPosition] = useState({ left: 0, top: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!showTip || !anchorRef.current || !tipRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const gutter = 6;
    const left = Math.min(
      window.innerWidth - tip.width - gutter,
      Math.max(gutter, anchor.left + (anchor.width - tip.width) / 2),
    );
    const above = anchor.top - tip.height - gutter;
    const top = above >= gutter ? above : anchor.bottom + gutter;
    setTipPosition({ left, top });
  }, [label, showTip]);

  useEffect(() => {
    if (!showTip) return;
    const hide = () => setShowTip(false);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [showTip]);

  return (
    <span
      ref={anchorRef}
      className="action-tip-anchor"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onFocus={() => setShowTip(true)}
      onBlur={() => setShowTip(false)}
    >
      <button
        type="button"
        className={`bar-link ${className}`.trim()}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {children}
      </button>
      {showTip && createPortal(
        <span
          ref={tipRef}
          className="action-tooltip"
          role="tooltip"
          style={{ left: tipPosition.left, top: tipPosition.top }}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  );
}
