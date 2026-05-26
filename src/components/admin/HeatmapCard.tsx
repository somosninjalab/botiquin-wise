/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lookupCityLatLng, VENEZUELA_CENTER } from "@/lib/venezuela-geo";

type CityPoint = { city: string; weight: number };

let mapsLoader: Promise<typeof google> | null = null;

function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window !== "undefined" && (window as any).google?.maps?.visualization) {
    return Promise.resolve((window as any).google);
  }
  if (mapsLoader) return mapsLoader;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps browser key not configured"));

  mapsLoader = new Promise((resolve, reject) => {
    (window as any).__initLovableMaps = () => resolve((window as any).google);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key,
      libraries: "visualization",
      loading: "async",
      callback: "__initLovableMaps",
    });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(s);
  });
  return mapsLoader;
}

export function HeatmapCard({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle?: string;
  points: CityPoint[];
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { located, unknown } = useMemo(() => {
    const located: Array<CityPoint & { lat: number; lng: number }> = [];
    const unknown: CityPoint[] = [];
    for (const p of points) {
      const coord = lookupCityLatLng(p.city);
      if (coord) located.push({ ...p, ...coord });
      else unknown.push(p);
    }
    return { located, unknown };
  }, [points]);

  useEffect(() => {
    let cancelled = false;
    let map: google.maps.Map | null = null;
    let heat: google.maps.visualization.HeatmapLayer | null = null;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapEl.current) return;
        map = new g.maps.Map(mapEl.current, {
          center: VENEZUELA_CENTER,
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
          ],
        });
        const data = located.map((p) => ({
          location: new g.maps.LatLng(p.lat, p.lng),
          weight: p.weight,
        }));
        heat = new g.maps.visualization.HeatmapLayer({
          data,
          map,
          radius: 30,
          opacity: 0.7,
        });
      })
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
      if (heat) heat.setMap(null);
    };
  }, [located]);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{located.reduce((s, p) => s + p.weight, 0)} pts</Badge>
          {unknown.length > 0 && (
            <Badge variant="outline" title={unknown.map((u) => u.city).join(", ")}>
              {unknown.length} sin mapa
            </Badge>
          )}
        </div>
      </div>
      {error ? (
        <div className="h-80 rounded-md border bg-muted/30 grid place-items-center text-sm text-muted-foreground p-4 text-center">
          {error}
        </div>
      ) : (
        <div ref={mapEl} className="h-80 w-full rounded-md overflow-hidden border" />
      )}
    </Card>
  );
}