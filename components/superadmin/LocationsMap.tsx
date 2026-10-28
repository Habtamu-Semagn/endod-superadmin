"use client";

// Hospitals and clinics on a map: Leaflet with OpenStreetMap tiles (free, no
// key), as the patient app draws them. Pins are drawn with CSS (no image
// files to bundle), coloured by status.

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = { id: string; latitude: number; longitude: number; label: string; status: string };

const ADDIS_ABABA: [number, number] = [9.03, 38.74];
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const COLOURS: Record<string, string> = { approved: "#059669", pending: "#2563eb", suspended: "#e11d48" };

function pin(status: string): string {
  const colour = COLOURS[status] ?? "#475569";
  return (
    `<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;background:${colour};` +
    'border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>'
  );
}

export default function LocationsMap({ points, onSelect }: { points: MapPoint[]; onSelect: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });
  const shown = JSON.stringify(points.map((p) => [p.id, p.latitude, p.longitude, p.label, p.status]));

  // Leaflet needs the browser: loaded here, once.
  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !box.current || map.current) return;
      leaflet.current = L;
      map.current = L.map(box.current, { center: ADDIS_ABABA, zoom: 6, scrollWheelZoom: false });
      map.current.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
      const current = map.current;
      resize = new ResizeObserver(() => current.invalidateSize());
      resize.observe(box.current);
      setReady(true);
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leaflet.current;
    if (!ready || !L || !map.current || !layer.current) return;
    layer.current.clearLayers();
    const bounds = L.latLngBounds([]);
    for (const point of JSON.parse(shown) as [string, number, number, string, string][]) {
      const [id, latitude, longitude, label, status] = point;
      const position: [number, number] = [latitude, longitude];
      L.marker(position, {
        icon: L.divIcon({ className: "", html: pin(status), iconSize: [20, 20], iconAnchor: [10, 20] }),
        title: label,
        alt: label,
      })
        .on("click", () => select.current(id))
        .addTo(layer.current);
      bounds.extend(position);
    }
    if (bounds.isValid()) map.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [ready, shown]);

  return (
    <div
      ref={box}
      data-testid="locations-map"
      className="h-[420px] w-full rounded-xl border border-slate-200 bg-slate-100 z-0"
      aria-label="Map of hospitals and clinics"
    />
  );
}
