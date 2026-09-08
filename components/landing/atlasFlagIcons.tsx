/* ------------------------------------------------------------------
   Inline SVG flag art for the AtlasWorldMap flag-route layer.

   Deliberately simplified geometric approximations (correct colors and
   layout, no fine detail/emblems) rather than pixel-accurate flags — at
   an 18x12 marker size the detail wouldn't read anyway. Emoji flags are
   not used because Windows renders them as bare ISO-code letters instead
   of a flag glyph.

   Each function draws into a local 18(w) x 12(h) box, origin top-left —
   the caller (AtlasWorldMap) positions and clips the group.
   ------------------------------------------------------------------ */

import type { ReactNode } from 'react';

export type FlagCode =
  | 'PH' | 'US' | 'JP' | 'GB' | 'SG' | 'DE' | 'AU' | 'BR'
  | 'IN' | 'ZA' | 'AE' | 'CA' | 'KR' | 'MX' | 'NG';

const RENDERERS: Record<FlagCode, () => ReactNode> = {
  PH: () => (
    <>
      <rect width={18} height={6} fill="#0038A8" />
      <rect y={6} width={18} height={6} fill="#CE1126" />
      <polygon points="0,0 0,12 7,6" fill="#ffffff" />
      <circle cx={4} cy={6} r={1} fill="#FCD116" />
    </>
  ),
  US: () => (
    <>
      <rect width={18} height={12} fill="#B22234" />
      <rect y={2} width={18} height={2} fill="#ffffff" />
      <rect y={6} width={18} height={2} fill="#ffffff" />
      <rect y={10} width={18} height={2} fill="#ffffff" />
      <rect width={8} height={7} fill="#3C3B6E" />
    </>
  ),
  JP: () => (
    <>
      <rect width={18} height={12} fill="#ffffff" />
      <circle cx={9} cy={6} r={3} fill="#BC002D" />
    </>
  ),
  GB: () => (
    <>
      <rect width={18} height={12} fill="#00247D" />
      <rect y={4.5} width={18} height={3} fill="#ffffff" />
      <rect x={7.5} width={3} height={12} fill="#ffffff" />
      <rect y={5.2} width={18} height={1.6} fill="#CF142B" />
      <rect x={8.2} width={1.6} height={12} fill="#CF142B" />
    </>
  ),
  SG: () => (
    <>
      <rect width={18} height={6} fill="#EF3340" />
      <rect y={6} width={18} height={6} fill="#ffffff" />
      <circle cx={4} cy={3} r={1.6} fill="#ffffff" />
      <circle cx={4.8} cy={2.7} r={1.3} fill="#EF3340" />
    </>
  ),
  DE: () => (
    <>
      <rect width={18} height={4} fill="#000000" />
      <rect y={4} width={18} height={4} fill="#DD0000" />
      <rect y={8} width={18} height={4} fill="#FFCE00" />
    </>
  ),
  AU: () => (
    <>
      <rect width={18} height={12} fill="#00247D" />
      <rect y={2.2} width={8} height={1} fill="#ffffff" />
      <rect x={3.5} width={1} height={5} fill="#ffffff" />
      <circle cx={13} cy={3} r={0.6} fill="#ffffff" />
      <circle cx={15} cy={6} r={0.6} fill="#ffffff" />
      <circle cx={12.5} cy={8} r={0.6} fill="#ffffff" />
      <circle cx={15.5} cy={9.5} r={0.5} fill="#ffffff" />
    </>
  ),
  BR: () => (
    <>
      <rect width={18} height={12} fill="#009739" />
      <polygon points="9,1.5 16.5,6 9,10.5 1.5,6" fill="#FEDD00" />
      <circle cx={9} cy={6} r={2.3} fill="#012169" />
    </>
  ),
  IN: () => (
    <>
      <rect width={18} height={4} fill="#FF9933" />
      <rect y={4} width={18} height={4} fill="#ffffff" />
      <rect y={8} width={18} height={4} fill="#138808" />
      <circle cx={9} cy={6} r={1.3} fill="#000080" />
    </>
  ),
  ZA: () => (
    <>
      <rect width={18} height={12} fill="#ffffff" />
      <rect width={18} height={3.5} fill="#DE3831" />
      <rect y={8.5} width={18} height={3.5} fill="#002395" />
      <rect y={3.5} width={18} height={5} fill="#007A4D" />
      <polygon points="0,3.5 0,8.5 4,6" fill="#FFB612" />
      <polygon points="0,0 0,12 6,6" fill="#000000" />
    </>
  ),
  AE: () => (
    <>
      <rect width={18} height={12} fill="#000000" />
      <rect x={4} width={14} height={4} fill="#00732F" />
      <rect x={4} y={4} width={14} height={4} fill="#ffffff" />
      <rect width={4} height={12} fill="#FF0000" />
    </>
  ),
  CA: () => (
    <>
      <rect width={6} height={12} fill="#FF0000" />
      <rect x={6} width={6} height={12} fill="#ffffff" />
      <rect x={12} width={6} height={12} fill="#FF0000" />
      <polygon points="9,3 10.3,6 9,5.3 7.7,6" fill="#FF0000" />
    </>
  ),
  KR: () => (
    <>
      <rect width={18} height={12} fill="#ffffff" />
      <path d="M9 3.4a2.6 2.6 0 0 1 0 5.2a1.3 1.3 0 0 1 0-2.6a1.3 1.3 0 0 0 0-2.6Z" fill="#CD2E3A" />
      <path d="M9 3.4a2.6 2.6 0 0 0 0 5.2a1.3 1.3 0 0 0 0-2.6a1.3 1.3 0 0 1 0-2.6Z" fill="#0047A0" />
    </>
  ),
  MX: () => (
    <>
      <rect width={6} height={12} fill="#006847" />
      <rect x={6} width={6} height={12} fill="#ffffff" />
      <rect x={12} width={6} height={12} fill="#CE1126" />
      <circle cx={9} cy={6} r={1} fill="#8B5E34" />
    </>
  ),
  NG: () => (
    <>
      <rect width={6} height={12} fill="#008751" />
      <rect x={6} width={6} height={12} fill="#ffffff" />
      <rect x={12} width={6} height={12} fill="#008751" />
    </>
  ),
};

export function FlagArt({ code }: { code: FlagCode }) {
  const Render = RENDERERS[code];
  return <>{Render()}</>;
}
