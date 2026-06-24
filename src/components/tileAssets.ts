// Maps every card.json token to the user-uploaded SVG tile art on the CDN.
// These are the real tile images supplied by the user (flat vector, rounded
// body, gray border, number in corner). Rendered via react-native-svg SvgUri.

import type { TileSuit } from './Tile';

const BAM: Record<string, string> = {
  '1': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325599472-78kpzz587a6-1.svg',
  '2': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325600094-4mauv14es7l-2.svg',
  '3': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325600859-0vp4r1gofwro-3.svg',
  '4': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325601441-18wfo39luci-4.svg',
  '5': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325602054-tfkndt8gzui-5.svg',
  '6': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325602785-1fvc6p0r8l8-6.svg',
  '7': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325603438-t5ocr9z7r0b-7.svg',
  '8': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325604028-twvkik6185-8.svg',
  '9': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325604702-zkirjz1a4yi-9.svg',
};

const CRAK: Record<string, string> = {
  '1': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325616324-ob9255kycap-1.svg',
  '2': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325616955-4s3vpq7z8d4-2.svg',
  '3': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325617484-th3nbb81ln-3.svg',
  '4': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325618096-imm0xy6qe3-4.svg',
  '5': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325618815-ye7u2azpq5f-5.svg',
  '6': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325619554-0ya6syzmn34-6.svg',
  '7': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325620575-wh7khf7jy9m-7.svg',
  '8': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325621720-vzg73y1td4-8.svg',
  '9': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325622486-9qqf4m9627l-9.svg',
};

const DOT: Record<string, string> = {
  '1': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325633334-a9wqjjrxn6c-1.svg',
  '2': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325633973-wizwhdb5avg-2.svg',
  '3': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325634577-xp76mb8nbw-3.svg',
  '4': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325635151-9a9gnrex4bq-4.svg',
  '5': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325635812-gu9jyrwk9of-5.svg',
  '6': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325636353-ph5dxa03jj-6.svg',
  '7': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325637034-1goccs1p1k4-7.svg',
  '8': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325637724-hmhwm4dfod8-8.svg',
  '9': 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325638480-im7m225o5q-9.svg',
};

const WIND: Record<string, string> = {
  E: 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325740903-keg7rodzng-E.svg',
  N: 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325741501-iy8hu3dw93h-N.svg',
  S: 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325742113-l8u2vrnnwy-S.svg',
  W: 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325742834-brnubx5d8z6-W.svg',
};

// Dragons: Red = 中 (C.svg), Green = 發 (F.svg), White/Soap = B.svg
const DRAGON_RED = 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325659346-mywpx38lln-C.svg';
const DRAGON_GREEN = 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325660579-cubnexdmgqv-F.svg';
const SOAP = 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325657985-24rzm9j8ulx-B.svg';

// Flower (generic) — uses the Fal flower tile.
const FLOWER = 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325682898-8abmwuzy6hq-Fal.svg';

const JOKER = 'https://cdn.shipper.now/image/users/cmnrivubu0005jp04ijuhnqmb/1782325661151-t9xgg0wbgy-JOKER.svg';

/**
 * Resolve a tile (suit + value) to its uploaded SVG URL.
 * Returns null only if no asset is bound (renderer then falls back to vector art).
 */
export function resolveTileAsset(suit: TileSuit, value?: string): string | null {
  // Year-hand Soap placeholder: token '0' always renders the White Dragon (Soap).
  if (value === '0') return SOAP;

  switch (suit) {
    case 'bam':
      return BAM[value ?? ''] ?? null;
    case 'crak':
      return CRAK[value ?? ''] ?? null;
    case 'dot':
      return DOT[value ?? ''] ?? null;
    case 'wind':
      return WIND[value ?? ''] ?? null;
    case 'dragon':
      if (value === 'G') return DRAGON_GREEN;
      if (value === 'R') return DRAGON_RED;
      // 'Wh' | 'W' → White Dragon / Soap
      return SOAP;
    case 'flower':
      return FLOWER;
    case 'joker':
      return JOKER;
    default:
      return null;
  }
}
