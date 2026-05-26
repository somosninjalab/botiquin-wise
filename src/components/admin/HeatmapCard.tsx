/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    let cancelled = false;
    let map: google.maps.Map | null = null;
    let heat: google.maps.visualization.HeatmapLayer | null = null;
    let markers: google.maps.Marker[] = [];
    let infoWindow: google.maps.InfoWindow | null = null;

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

        if (mode === "heat") {
          const data = located.map((p) => ({
            location: new g.maps.LatLng(p.lat, p.lng),
            weight: p.weight,
          }));
          heat = new g.maps.visualization.HeatmapLayer({
            data,
            map,
            radius: 45,
            opacity: 0.85,
            dissipating: true,
            maxIntensity: Math.max(3, maxWeight),
            gradient: [
              "rgba(0, 255, 200, 0)",
              "rgba(0, 200, 180, 0.5)",
              "rgba(0, 180, 120, 0.7)",
              "rgba(180, 200, 0, 0.85)",
              "rgba(240, 160, 0, 0.9)",
              "rgba(230, 80, 40, 0.95)",
              "rgba(200, 20, 60, 1)",
              "rgba(140, 0, 80, 1)",
            ],
          });
        } else {
          infoWindow = new g.maps.InfoWindow();
          markers = located.map((p) => {
            const scale = 8 + Math.min(22, (p.weight / Math.max(1, maxWeight)) * 22);
            const m = new g.maps.Marker({
              position: { lat: p.lat, lng: p.lng },
              map: map!,
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
              infoWindow!.setContent(
                `<div style="font-size:12px"><strong>${p.city}</strong><br/>${p.weight} registros</div>`,
              );
              infoWindow!.open({ map: map!, anchor: m });
            });
            return m;
          });
        }
      })
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
      if (heat) heat.setMap(null);
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