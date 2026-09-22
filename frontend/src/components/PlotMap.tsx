import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  centroid, formatArea, perimeterM, polygonAreaSqM, selfIntersects,
  squareAround, type LatLng,
} from '@/services/geo';

/**
 * Satellite imagery source.
 *
 * Esri World Imagery: free, no API key, no billing account, global coverage
 * at roughly 0.5 m in populated India — enough to see field bunds. Attribution
 * is required and Leaflet renders it on the map.
 *
 * To swap providers later, only this block changes:
 *   Google    — needs a key and a billing account; best imagery, costs money
 *               past the free tier.
 *   Mapbox    — needs a token; generous free tier.
 *   Bhuvan    — ISRO's own Indian imagery (bhuvan.nrsc.gov.in), WMS, needs
 *               registration. Worth a look given the audience.
 */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

const IMAGERY = {
  url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
  attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
  maxZoom: 19,
};

/**
 * Label overlays. Satellite imagery carries no names — that is why the first
 * version looked nothing like Google Maps. These two transparent layers sit on
 * top and supply village, taluka, river and road names, which is exactly what
 * "hybrid" view means on any mapping app.
 */
const PLACE_LABELS = {
  url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
  maxZoom: 19,
};
const ROAD_LABELS = {
  url: `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`,
  maxZoom: 19,
};

/**
 * Plain street map. OpenStreetMap names Indian villages, rivers, canals and
 * minor roads in more detail than the satellite label layer does, so it is
 * worth having as a way to find a place before switching back to imagery.
 */
const STREETS = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
};

/**
 * Place search (geocoding).
 *
 * Nominatim is OpenStreetMap's own geocoder: free, no key, and it knows Indian
 * village names. Its usage policy caps you at roughly one request a second,
 * which is why the box below is debounced rather than firing per keystroke.
 * For real traffic, move to a paid geocoder or self-host Nominatim.
 */
const GEOCODE_URL = 'https://nominatim.openstreetmap.org/search';

/** Fallback centre when we know nothing: Kopargaon, Ahmednagar. */
const DEFAULT_CENTRE: LatLng = { lat: 19.8762, lng: 74.4763 };

interface Place { label: string; lat: number; lng: number }

interface Props {
  initial?: LatLng[];
  centre?: LatLng | null;
  hintAcres?: number | null;
  /** hide the editing controls when the map is only being displayed */
  readOnly?: boolean;
  onChange: (points: LatLng[], areaSqM: number) => void;
}

export default function PlotMap({
  initial, centre, hintAcres, readOnly, onChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polyRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [points, setPoints] = useState<LatLng[]>(initial ?? []);
  /** Snapshots for undo. One entry per discrete action, not per drag frame. */
  const [history, setHistory] = useState<LatLng[][]>([]);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Leaflet event handlers are created once and would otherwise close over a
  // stale `points`. The ref always holds the current value.
  const pointsRef = useRef<LatLng[]>(points);
  useEffect(() => { pointsRef.current = points; }, [points]);

  const areaSqM = polygonAreaSqM(points);
  const invalid = points.length >= 4 && selfIntersects(points);

  const pushHistory = useCallback((snapshot: LatLng[]) => {
    // Cap the stack; a farmer will never undo forty steps and the memory is
    // pointless on a cheap phone.
    setHistory((h) => [...h.slice(-19), snapshot]);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setPoints(h[h.length - 1]);
      setNote(null);
      return h.slice(0, -1);
    });
  }, []);

  /* ---- create the map once ---------------------------------------- */
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const start = initial?.length ? centroid(initial)! : (centre ?? DEFAULT_CENTRE);
    const map = L.map(hostRef.current, {
      center: [start.lat, start.lng],
      zoom: initial?.length ? 17 : 16,
      zoomControl: true,
      attributionControl: true,
    });

    const imagery = L.tileLayer(IMAGERY.url, {
      attribution: IMAGERY.attribution,
      maxZoom: IMAGERY.maxZoom,
    });
    const places = L.tileLayer(PLACE_LABELS.url, { maxZoom: PLACE_LABELS.maxZoom });
    const roads = L.tileLayer(ROAD_LABELS.url, { maxZoom: ROAD_LABELS.maxZoom });
    const streets = L.tileLayer(STREETS.url, {
      attribution: STREETS.attribution,
      maxZoom: STREETS.maxZoom,
    });

    // Hybrid is the default: a farmer needs the names to find their field, and
    // plain imagery of rural Maharashtra is a lot of identical green squares.
    const hybrid = L.layerGroup([imagery, places, roads]);
    hybrid.addTo(map);

    L.control.layers(
      {
        'Satellite + names': hybrid,
        // Imagery alone — labels can sit right on top of a bund and get in the
        // way while tracing a boundary.
        'Satellite only': imagery,
        'Street map': streets,
      },
      undefined,
      { position: 'topright', collapsed: true },
    ).addTo(map);

    mapRef.current = map;

    // Leaflet measures the container on creation; inside a screen that is
    // still laying out it can come up zero-height and render grey.
    setTimeout(() => map.invalidateSize(), 150);

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- redraw polygon + handles whenever the corners change -------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polyRef.current?.remove();
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (points.length >= 2) {
      polyRef.current = L.polygon(points.map((p) => [p.lat, p.lng]), {
        color: invalid ? '#E5484D' : '#7CBF4F',
        weight: 3,
        fillColor: invalid ? '#E5484D' : '#7CBF4F',
        fillOpacity: 0.18,
      }).addTo(map);
    }

    if (readOnly) return;

    points.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lng], {
        draggable: true,
        icon: L.divIcon({
          className: '',
          html: '<span style="display:block;width:18px;height:18px;border-radius:50%;'
              + 'background:#fff;border:3px solid #7CBF4F;box-shadow:0 1px 4px rgba(0,0,0,.5)"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);

      // Snapshot once, when the drag begins — so Undo returns the corner to
      // where it started rather than stepping back through every frame.
      marker.on('dragstart', () => pushHistory(pointsRef.current));

      marker.on('drag', (e) => {
        const ll = (e.target as L.Marker).getLatLng();
        setPoints((prev) => prev.map((q, qi) =>
          qi === i ? { lat: ll.lat, lng: ll.lng } : q));
      });

      marker.on('dblclick', () => {
        setPoints((prev) => {
          if (prev.length <= 3) return prev;
          pushHistory(prev);
          return prev.filter((_, qi) => qi !== i);
        });
      });

      markersRef.current.push(marker);
    });
  }, [points, invalid, readOnly, pushHistory]);

  /* ---- report upward ---------------------------------------------- */
  useEffect(() => {
    onChange(points, invalid ? 0 : areaSqM);
  }, [points, areaSqM, invalid, onChange]);

  function drawStartingSquare() {
    const map = mapRef.current;
    const c = map
      ? { lat: map.getCenter().lat, lng: map.getCenter().lng }
      : (centre ?? DEFAULT_CENTRE);
    pushHistory(points);
    setPoints(squareAround(c, hintAcres && hintAcres > 0 ? hintAcres : 1));
    setNote('Drag each white corner onto your field boundary.');
  }

  function addCorner() {
    setPoints((prev) => {
      if (prev.length < 3) return prev;
      pushHistory(prev);
      // Insert at the midpoint of the longest edge — where more detail is
      // almost always wanted.
      let bestI = 0;
      let bestLen = -1;
      for (let i = 0; i < prev.length; i += 1) {
        const a = prev[i];
        const b = prev[(i + 1) % prev.length];
        const len = (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;
        if (len > bestLen) { bestLen = len; bestI = i; }
      }
      const a = prev[bestI];
      const b = prev[(bestI + 1) % prev.length];
      const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
      return [...prev.slice(0, bestI + 1), mid, ...prev.slice(bestI + 1)];
    });
  }

  function clearAll() {
    pushHistory(points);
    setPoints([]);
    setNote(null);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setNote('This device cannot report its location.');
      return;
    }
    setLocating(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.setView([here.lat, here.lng], 18);
        if (!pointsRef.current.length) {
          pushHistory([]);
          setPoints(squareAround(here, hintAcres && hintAcres > 0 ? hintAcres : 1));
          setNote('Drag each white corner onto your field boundary.');
        }
      },
      (err) => {
        setLocating(false);
        setNote(err.code === err.PERMISSION_DENIED
          ? 'Location permission was declined. Search for your village instead.'
          : 'Could not get your location. Search for your village instead.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div>
      <PlaceSearch onPick={(p) => mapRef.current?.setView([p.lat, p.lng], 17)} />

      <div className="relative mt-3 overflow-hidden rounded-card border border-hairline">
        <div ref={hostRef} className="h-72 w-full bg-raised" />

        {points.length >= 3 && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center">
            <span className="rounded-pill bg-canvas/85 px-4 py-2 text-center backdrop-blur">
              <span className="block text-[26px] font-bold leading-none text-ink">
                {(areaSqM / 4046.8564224).toFixed(2)}
              </span>
              <span className="block text-sm text-ink-muted">Acres</span>
            </span>
          </div>
        )}

        {!readOnly && (
          <button
            type="button"
            onClick={useMyLocation}
            className="absolute bottom-3 right-3 z-[1000] flex h-11 items-center gap-2 rounded-pill bg-canvas/90 px-4 text-body font-medium text-ink backdrop-blur"
          >
            {locating ? 'Locating…' : '📍 My location'}
          </button>
        )}
      </div>

      {!readOnly && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {points.length === 0 ? (
              <button type="button" onClick={drawStartingSquare} className="btn-primary">
                Draw my field
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={undo}
                  disabled={history.length === 0}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-card border border-hairline bg-surface text-body text-ink disabled:opacity-40"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 14 4 9l5-5" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 9h10a6 6 0 0 1 0 12h-3" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </button>
                <button type="button" onClick={addCorner}
                  className="h-11 flex-1 rounded-card border border-hairline bg-surface text-body text-ink">
                  + Corner
                </button>
                <button type="button" onClick={clearAll}
                  className="h-11 flex-1 rounded-card border border-hairline bg-surface text-body text-ink-muted">
                  Clear
                </button>
              </>
            )}
          </div>

          {invalid && (
            <p role="alert" className="mt-2 text-body text-danger">
              The boundary crosses itself, so the area cannot be measured. Drag
              the corners so the edges do not overlap, or press Back.
            </p>
          )}

          {note && !invalid && <p className="mt-2 text-body text-ink-muted">{note}</p>}
        </>
      )}

      {points.length >= 3 && !invalid && (
        <dl className="mt-3 space-y-1 text-body">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Area</dt>
            <dd className="font-medium">{formatArea(areaSqM)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Perimeter</dt>
            <dd className="font-medium">{Math.round(perimeterM(points))} m</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Corners</dt>
            <dd className="font-medium">{points.length}</dd>
          </div>
        </dl>
      )}

      {!readOnly && (
        <p className="mt-2 text-sm text-ink-faint">
          Drag a corner to move it, double-tap a corner to remove it, Back to
          undo. Measured from the corner coordinates — no internet needed for
          the calculation, only for the satellite picture.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Place search                                                        */
/* ------------------------------------------------------------------ */

function PlaceSearch({ onPick }: { onPick: (p: Place) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); return; }

    // Debounced: Nominatim's policy is about one request a second, and firing
    // per keystroke would get the app blocked.
    const timer = setTimeout(async () => {
      setBusy(true);
      setFailed(false);
      try {
        const url = `${GEOCODE_URL}?format=json&limit=6&countrycodes=in`
          + `&accept-language=en&q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
        setResults(rows.map((r) => ({
          label: r.display_name,
          lat: Number(r.lat),
          lng: Number(r.lon),
        })));
        setOpen(true);
      } catch {
        setFailed(true);
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-card border border-hairline bg-raised px-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          className="shrink-0 text-ink-faint">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search village, taluka or landmark"
          className="h-tap min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-faint focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            aria-label="Clear search"
            className="flex h-11 w-9 items-center justify-center text-ink-muted">✕</button>
        )}
      </div>

      {busy && <p className="mt-1 text-sm text-ink-faint">Searching…</p>}

      {failed && (
        <p className="mt-1 text-sm text-warn">
          Search is unavailable right now. Move the map by hand, or use 📍 My location.
        </p>
      )}

      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-[1100] mt-1 max-h-60 overflow-y-auto rounded-card border border-hairline bg-surface shadow-xl">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                onClick={() => { onPick(r); setOpen(false); }}
                className="flex min-h-[48px] w-full items-center px-4 py-2 text-left text-body text-ink hover:bg-raised"
              >
                {r.label}
              </button>
            </li>
          ))}
          <li className="px-4 py-2 text-sm text-ink-faint">Search © OpenStreetMap contributors</li>
        </ul>
      )}
    </div>
  );
}
