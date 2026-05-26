import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { lookupCityLatLng, VENEZUELA_CENTER } from "@/lib/venezuela-geo";

type CityPoint = { city: string; weight: number };

let mapsLoader: Promise<any> | null = null;

function loadGoogleMaps(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).google?.maps) {
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

function isLovableDomain() {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com") || host === "localhost";
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
  const [mode, setMode] = useState<"heat" | "points">("heat");
  const lovableDomain = typeof window !== "undefined" ? isLovableDomain() : true;

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

  const maxWeight = useMemo(
    () => located.reduce((m, p) => Math.max(m, p.weight), 0),
    [located],
  );

  useEffect(() => {
    if (!lovableDomain) return;
    let cancelled = false;
    let map: any = null;
    let circles: any[] = [];
    let markers: any[] = [];
    let infoWindow: any = null;

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

        infoWindow = new g.maps.InfoWindow();

        if (mode === "heat") {
          // Google removed HeatmapLayer in Maps JS v3.65. Simulate a heatmap
          // with stacked weighted circles colored by intensity.
          const stops = [
            { t: 0.0, color: "#00c8b4" },
            { t: 0.25, color: "#9dc800" },
            { t: 0.5, color: "#f0a000" },
            { t: 0.75, color: "#e65028" },
            { t: 1.0, color: "#8c0050" },
          ];
          const pickColor = (ratio: number) => {
            for (let i = 1; i < stops.length; i++) {
              if (ratio <= stops[i].t) return stops[i].color;
            }
            return stops[stops.length - 1].color;
          };
          circles = located.flatMap((p) => {
            const ratio = p.weight / Math.max(1, maxWeight);
            const baseRadius = 25000 + ratio * 80000; // meters
            const color = pickColor(ratio);
            const layers = [
              { r: baseRadius * 1.6, opacity: 0.15 },
              { r: baseRadius * 1.1, opacity: 0.3 },
              { r: baseRadius * 0.7, opacity: 0.55 },
            ];
            return layers.map((l) =>
              new g.maps.Circle({
                strokeWeight: 0,
                fillColor: color,
                fillOpacity: l.opacity,
                map,
                center: { lat: p.lat, lng: p.lng },
                radius: l.r,
                clickable: false,
              }),
            );
          });
        } else {
          markers = located.map((p) => {
            const scale = 8 + Math.min(22, (p.weight / Math.max(1, maxWeight)) * 22);
            const m = new g.maps.Marker({
              position: { lat: p.lat, lng: p.lng },
              map,
              title: `${p.city}: ${p.weight}`,
              icon: {
                path: g.maps.SymbolPath.CIRCLE,
                scale,
                fillColor: "#e11d48",
                fillOpacity: 0.65,
                strokeColor: "#7f1d1d",
                strokeWeight: 1.5,
              },
            });
            m.addListener("click", () => {
              infoWindow.setContent(
                `<div style="font-size:12px"><strong>${p.city}</strong><br/>${p.weight} registros</div>`,
              );
              infoWindow.open({ map, anchor: m });
            });
            return m;
          });
        }
      })
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
      circles.forEach((c) => c.setMap(null));
      markers.forEach((m) => m.setMap(null));
      if (infoWindow) infoWindow.close();
    };
  }, [located, mode, maxWeight]);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-md border overflow-hidden">
            <Button
              size="sm"
              variant={mode === "heat" ? "default" : "ghost"}
              className="rounded-none h-7 px-2 text-xs"
              onClick={() => setMode("heat")}
            >
              Calor
            </Button>
            <Button
              size="sm"
              variant={mode === "points" ? "default" : "ghost"}
              className="rounded-none h-7 px-2 text-xs"
              onClick={() => setMode("points")}
            >
              Puntos
            </Button>
          </div>
          <Badge variant="secondary">{located.reduce((s, p) => s + p.weight, 0)} pts</Badge>
          {unknown.length > 0 && (
            <Badge variant="outline" title={unknown.map((u) => u.city).join(", ")}>
              {unknown.length} sin mapa
            </Badge>
          )}
        </div>
      </div>
      {!lovableDomain ? (
        <div className="h-80 rounded-md border bg-muted/30 grid place-items-center text-sm text-muted-foreground p-4 text-center">
          <div>
            <p className="font-medium text-foreground mb-1">Mapa solo disponible en preview</p>
            <p>El mapa de calor requiere Google Maps Platform, que solo está habilitado en el preview de Lovable.</p>
          </div>
        </div>
      ) : error ? (
        <div className="h-80 rounded-md border bg-muted/30 grid place-items-center text-sm text-muted-foreground p-4 text-center">
          {error}
        </div>
      ) : (
        <div ref={mapEl} className="h-80 w-full rounded-md overflow-hidden border" />
      )}
    </Card>
  );
}