import React from 'react';

/**
 * Renders a signal's rationale text with light inline coloring:
 *  - the ticker/coin (the signal's symbol) is highlighted, and
 *  - pip counts are colored green when positive, red when negative.
 * Everything else renders as plain text.
 */
export default function SignalRationale({
  text,
  symbol,
  className,
}: {
  text: string;
  symbol?: string;
  className?: string;
}) {
  return <span className={className}>{colorize(text, symbol)}</span>;
}

function colorize(text: string, symbol?: string): React.ReactNode[] {
  const patterns: string[] = ['([+-]?\\d[\\d,]*\\s*pips)']; // e.g. "+2,200 pips", "-50 pips"
  if (symbol) {
    const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.unshift(`(${esc})`);
  }
  const re = new RegExp(patterns.join('|'), 'gi');

  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    if (/pips/i.test(token)) {
      const negative = token.includes('-');
      out.push(
        <span
          key={key++}
          style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: negative ? 'var(--red)' : 'var(--green)' }}
        >
          {token}
        </span>,
      );
    } else {
      out.push(
        <span key={key++} style={{ fontWeight: 700, color: 'var(--amber)' }}>
          {token}
        </span>,
      );
    }
    last = m.index + token.length;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length matches
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
