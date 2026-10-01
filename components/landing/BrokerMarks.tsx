/* Brand marks for the live API connectors.
 *
 * These replace five generic geometric placeholders (a chevron stack, a plain
 * hexagon, five outlined squares, a horseshoe and a ringed hexagon) that bore
 * no relation to the exchanges they were labelled with.
 *
 * Each is drawn as a path rather than loaded as an image: at 24px a bitmap
 * logo is mush, and these inherit currentColor so the grid stays on the amber
 * token instead of hardcoding five brand palettes into the section.
 *
 * Nominative use — identifying the venues Atlas connects to. The marks are
 * reproduced in a single colour at icon size and are not altered in ways that
 * misrepresent the brands. If legal would rather ship the official assets,
 * every mark below is a drop-in: same 24x24 box, same single-path shape. */

type Props = { className?: string; size?: number };

const box = (size: number, className?: string) => ({
  className,
  width: size,
  height: size,
  'aria-hidden': true as const,
  focusable: 'false' as const,
});

/* Binance — the diamond lattice: four chevrons around a centre diamond.
   Official geometry, scaled from the 124-unit brand artboard. */
export function BinanceMark({ className, size = 24 }: Props) {
  return (
    <svg {...box(size, className)} viewBox="0 0 124 124" fill="currentColor">
      <path d="m38.2 53.4 23.9-23.9 23.9 23.9 13.9-13.9L62.1 1.7 24.3 39.5zM1.7 62.1l13.9-13.9 13.9 13.9-13.9 13.9zm36.5 8.7 23.9 23.9 23.9-23.9 13.9 13.9-37.8 37.8-37.8-37.7zM94.6 62.1l13.9-13.9 13.9 13.9-13.9 13.9zM76.3 62.1 62.1 47.9 51.6 58.4l-1.2 1.2-2.5 2.5 13.9 13.9z" />
    </svg>
  );
}

/* OKX — a 3x3 grid with the corners and the centre filled, forming an X.
   The placeholder had the right five positions but drew them as outlines;
   the mark is solid. */
export function OkxMark({ className, size = 24 }: Props) {
  const s = 7.4;
  const at = [
    [0, 0], [16.6, 0],
    [8.3, 8.3],
    [0, 16.6], [16.6, 16.6],
  ];
  return (
    <svg {...box(size, className)} viewBox="0 0 24 24" fill="currentColor">
      {at.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={s} height={s} />)}
    </svg>
  );
}

/* Bybit — the lowercase "b" the wordmark leads with, as a solid lettermark
   with a square counter. The first attempt drew the bowl as a thin outline
   with a 4px counter and a detached square, which at 24px read as a bar and
   two specks rather than a letter. */
export function BybitMark({ className, size = 24 }: Props) {
  return (
    <svg {...box(size, className)} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd">
      {/* One path, not a stem plus a bowl: as two abutting shapes a hairline
          seam showed where they met. The counter is the second subpath, cut
          out by evenodd. */}
      <path d="M2.6 1.4h4.8v6.4h6.8a7.4 7.4 0 0 1 0 14.8H2.6Zm4.8 11.2h6a2.6 2.6 0 0 1 0 5.2h-6Z" />
    </svg>
  );
}

/* Alpaca — the head in profile, facing right: two pointed ears, a rounded
   skull, a muzzle and the long neck the animal is known for. Built from
   separate primitives rather than one path; the earlier single-path version
   collapsed into an unreadable blob at 24px. */
export function AlpacaMark({ className, size = 24 }: Props) {
  return (
    <svg {...box(size, className)} viewBox="0 0 24 24" fill="currentColor">
      {/* ears */}
      <path d="M8.3 1.1 10.4 6.4 6.9 6.4Z" />
      <path d="M13.9 1.1 16 6.4 12.5 6.4Z" />
      {/* neck — a tapered column from the jaw down to the base */}
      <path d="M8.2 11.6h5.1l1.1 11.3H7.6Z" />
      {/* skull */}
      <ellipse cx="11.4" cy="9.1" rx="4.5" ry="3.9" />
      {/* muzzle */}
      {/* overlaps the skull so the muzzle joins the head instead of floating */}
      <rect x="13.4" y="7.5" width="7.6" height="4.2" rx="2.1" />
    </svg>
  );
}

/* OANDA — the ring of the logotype's "O", closed but for the small notch at
   the top right that the brand cuts into it. The first pass left a 90-degree
   gap, which read as a C.
   Arc: from 12 o’clock round to roughly 1 o’clock, a ~340-degree sweep. */
export function OandaMark({ className, size = 24 }: Props) {
  return (
    <svg {...box(size, className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.2a8.8 8.8 0 1 0 7.1 3.6"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const BROKER_MARKS = {
  Binance: BinanceMark,
  Bybit: BybitMark,
  OKX: OkxMark,
  Alpaca: AlpacaMark,
  OANDA: OandaMark,
} as const;
