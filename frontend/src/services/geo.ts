/**
 * Land measurement from corner coordinates.
 *
 * No API is involved. Area from a closed polygon of lat/lng points is a
 * solved piece of geometry — computing it in the browser is exact, free,
 * works offline, and costs no round trip. The only thing that needs a remote
 * service is the satellite imagery the farmer traces over.
 */

export interface LatLng { lat: number; lng: number }

/** Mean Earth radius (WGS84 authalic), metres. */
const R = 6371008.8;

/** Exact, by Indian survey definition. 1 acre = 4840 sq yd = 4046.8564224 m². */
const SQ_M_PER_ACRE = 4046.8564224;

/** 1 hectare = 10,000 m². Farmers and government schemes often use hectares. */
const SQ_M_PER_HECTARE = 10000;

/** 1 guntha = 1/40 acre — the unit most Maharashtra farmers actually speak in. */
const SQ_M_PER_GUNTHA = SQ_M_PER_ACRE / 40;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Geodesic area of a polygon on a sphere, in square metres.
 *
 * Uses the spherical excess formula rather than treating lat/lng as flat X/Y.
 * At a 2-acre plot the difference is under a square metre, but the flat
 * version quietly gets worse the further you are from the equator, and a
 * farmer's acreage decides their scheme eligibility — it should not depend on
 * latitude.
 *
 * Returns 0 for fewer than 3 points. Winding order does not matter.
 */
export function polygonAreaSqM(points: LatLng[]): number {
  if (points.length < 3) return 0;

  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    total +=
      (toRad(p2.lng) - toRad(p1.lng)) *
      (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }

  return Math.abs((total * R * R) / 2);
}

export function sqMToAcres(sqM: number): number {
  return sqM / SQ_M_PER_ACRE;
}

export function sqMToHectares(sqM: number): number {
  return sqM / SQ_M_PER_HECTARE;
}

export function sqMToGuntha(sqM: number): number {
  return sqM / SQ_M_PER_GUNTHA;
}

/** Area in acres, straight from the corners. */
export function polygonAreaAcres(points: LatLng[]): number {
  return sqMToAcres(polygonAreaSqM(points));
}

/** Average of the corners — good enough to centre a map and to store as the
 *  plot's point location for weather and market lookups. */
export function centroid(points: LatLng[]): LatLng | null {
  if (!points.length) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** Perimeter in metres, via the haversine distance between consecutive points. */
export function perimeterM(points: LatLng[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    total += distanceM(points[i], points[(i + 1) % points.length]);
  }
  return total;
}

export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Does the polygon cross itself? A bow-tie shape still returns an area, but a
 * meaningless one — and a farmer dragging corners around makes this easily.
 * Worth catching before it is saved as their land holding.
 */
export function selfIntersects(points: LatLng[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      // skip edges that share a vertex
      if (j === i || (i === 0 && j === n - 1) || j === i + 1) continue;
      if (segmentsCross(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) {
        return true;
      }
    }
  }
  return false;
}

function segmentsCross(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const d = (a: LatLng, b: LatLng, c: LatLng) =>
    (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);

  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);

  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
      && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/* ------------------------------------------------------------------ */
/* GeoJSON                                                             */
/* ------------------------------------------------------------------ */

export interface GeoJsonPolygon {
  type: 'Polygon';
  /** GeoJSON is [longitude, latitude] — the reverse of how everyone says it. */
  coordinates: [number, number][][];
}

export function toGeoJson(points: LatLng[]): GeoJsonPolygon | null {
  if (points.length < 3) return null;
  const ring: [number, number][] = points.map((p) => [p.lng, p.lat]);
  ring.push(ring[0]);                       // GeoJSON rings must close
  return { type: 'Polygon', coordinates: [ring] };
}

export function fromGeoJson(value: unknown): LatLng[] {
  const poly = value as GeoJsonPolygon | null;
  if (!poly || poly.type !== 'Polygon' || !poly.coordinates?.[0]) return [];
  const ring = poly.coordinates[0];
  // drop the repeated closing point
  const open = ring.length > 1
    && ring[0][0] === ring[ring.length - 1][0]
    && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  return open.map(([lng, lat]) => ({ lat, lng }));
}

/** A square of roughly `acres` centred on a point — the starting shape the
 *  farmer then drags into place, which is far easier than tapping four
 *  corners onto a satellite image from scratch. */
export function squareAround(centre: LatLng, acres = 1): LatLng[] {
  const sideM = Math.sqrt(acres * SQ_M_PER_ACRE);
  const half = sideM / 2;

  const dLat = (half / R) * (180 / Math.PI);
  const dLng = dLat / Math.cos(toRad(centre.lat));

  return [
    { lat: centre.lat + dLat, lng: centre.lng - dLng },
    { lat: centre.lat + dLat, lng: centre.lng + dLng },
    { lat: centre.lat - dLat, lng: centre.lng + dLng },
    { lat: centre.lat - dLat, lng: centre.lng - dLng },
  ];
}

/** "4.20 acres · 1.70 ha · 168 guntha" — farmers think in gunthas, scheme
 *  forms ask for hectares, and the database stores acres. Show all three. */
export function formatArea(sqM: number): string {
  const acres = sqMToAcres(sqM);
  return [
    `${acres.toFixed(2)} acre`,
    `${sqMToHectares(sqM).toFixed(2)} ha`,
    `${Math.round(sqMToGuntha(sqM))} guntha`,
  ].join(' · ');
}
