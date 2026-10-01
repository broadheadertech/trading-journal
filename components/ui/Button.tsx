import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/* The one button.
 *
 * Anatomy is two cells in a single row — label | 1px hairline | arrow — so the
 * arrow is a real region that can invert on hover rather than a glyph that
 * slides around. Every size/variant/state lives in app/atlas.css under .ab*,
 * and nothing here sets an inline style, so a call site cannot drift from the
 * system by passing its own padding.
 *
 * The arrow is an inline SVG, not "→": the text glyph renders at a different
 * weight and baseline in Manrope than in the system fallback, so buttons that
 * used it never lined up with each other. */

export type ButtonVariant = 'primary' | 'secondary' | 'text';
export type ButtonSize = 'lg' | 'md' | 'sm';

type Common = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /* Forward/navigational actions get the arrow. In-place actions (Post, Save,
     Add Trade) pass false — an arrow on something that does not take you
     anywhere is a promise the button does not keep. */
  arrow?: boolean;
  /* leading icon, rendered inside the label cell before the text */
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
};

type AsLink = Common & { href: string } & Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'>;
type AsButton = Common & { href?: undefined } & Omit<ComponentProps<'button'>, 'className' | 'children' | 'disabled'>;

export type ButtonProps = AsLink | AsButton;

function Arrow() {
  return (
    <svg className="ab-ico" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M2.5 8h11M13.5 8 9 3.5M13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="ab-ico ab-spin" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" opacity=".3" />
      <path d="M14.25 8A6.25 6.25 0 0 0 8 1.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Button(props: ButtonProps) {
  const {
    children, variant = 'primary', size = 'lg', arrow = true,
    icon, loading = false, disabled = false, fullWidth = false, className,
    ...rest
  } = props as Common & Record<string, unknown>;

  // the text variant is a link in a sentence, not a box — it never splits
  const split = variant !== 'text' && arrow;

  const cls = [
    'ab',
    `ab-${variant}`,
    `ab-${size}`,
    split ? 'ab-split' : 'ab-solo',
    fullWidth ? 'ab-full' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  const inner = (
    <>
      <span className="ab-label">
        {icon}
        {children}
        {/* the text variant keeps a bare arrow after the words */}
        {variant === 'text' && arrow && (loading ? <Spinner /> : <Arrow />)}
      </span>
      {split && <span className="ab-arrow">{loading ? <Spinner /> : <Arrow />}</span>}
    </>
  );

  if (typeof (props as AsLink).href === 'string') {
    const { href, ...linkRest } = rest as { href: string } & Record<string, unknown>;
    return (
      <Link
        href={href}
        className={cls}
        aria-busy={loading || undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        {...linkRest}
      >
        {inner}
      </Link>
    );
  }

  const { type, ...btnRest } = rest as { type?: 'button' | 'submit' | 'reset' } & Record<string, unknown>;
  return (
    <button
      type={type ?? 'button'}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...btnRest}
    >
      {inner}
    </button>
  );
}
