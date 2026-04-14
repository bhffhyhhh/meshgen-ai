import { useDismissEvent, useGetActiveAlerts } from "@/hooks/useChat";
import type { NewsEvent } from "@/types/chat";
import { MapPin, Navigation, Radio, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LatLon {
  lat: number;
  lon: number;
  accuracy?: number;
}

type GeoStatus = "idle" | "locating" | "granted" | "denied" | "error";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const POI_BADGES = [
  {
    label: "HOSPITAL",
    style: {
      color: "oklch(0.65 0.2 25 / 0.85)",
      border: "1px solid oklch(0.55 0.2 25 / 0.4)",
    },
  },
  {
    label: "COFFEE",
    style: {
      color: "oklch(0.75 0.18 85 / 0.85)",
      border: "1px solid oklch(var(--primary) / 0.4)",
    },
  },
  {
    label: "TRANSIT",
    style: {
      color: "oklch(0.7 0.15 230 / 0.85)",
      border: "1px solid oklch(0.6 0.18 240 / 0.4)",
    },
  },
  {
    label: "PARK",
    style: {
      color: "oklch(0.68 0.2 145 / 0.85)",
      border: "1px solid oklch(0.55 0.2 145 / 0.4)",
    },
  },
  {
    label: "SECURE ZONE",
    style: {
      color: "oklch(0.7 0.15 145 / 0.85)",
      border: "1px solid oklch(0.55 0.18 145 / 0.4)",
    },
  },
];

const LS_KEY = "meshgen_last_location";

// Map image bounds for lat/lng → pixel projection
// The staticmap.openstreetmap.de API returns a 280×160 image at zoom 14
const MAP_W = 280;
const MAP_H = 160;
const ZOOM = 14;

function buildMapUrl(lat: number, lon: number): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${ZOOM}&size=${MAP_W}x${MAP_H}&markers=${lat},${lon},red-pushpin`;
}

// ---------------------------------------------------------------------------
// Mercator lat/lng → pixel offset within the static map image
// ---------------------------------------------------------------------------
function latLngToPixel(
  eventLat: number,
  eventLng: number,
  centerLat: number,
  centerLng: number,
): { x: number; y: number } | null {
  try {
    // Tile size in pixels
    const tileSize = 256;
    const scale = 2 ** ZOOM;

    // World coordinates (Mercator)
    function worldX(lng: number) {
      return (
        (tileSize / (2 * Math.PI)) * scale * ((lng * Math.PI) / 180 + Math.PI)
      );
    }
    function worldY(lat: number) {
      const sinLat = Math.sin((lat * Math.PI) / 180);
      return (
        (tileSize / (2 * Math.PI)) *
        scale *
        (Math.PI - Math.log((1 + sinLat) / (1 - sinLat)) / 2)
      );
    }

    const cx = worldX(centerLng);
    const cy = worldY(centerLat);
    const ex = worldX(eventLng);
    const ey = worldY(eventLat);

    const dx = ex - cx;
    const dy = ey - cy;

    const px = MAP_W / 2 + dx;
    const py = MAP_H / 2 + dy;

    // Only show pins that fall within the map bounds (with small padding)
    const pad = 8;
    if (px < pad || px > MAP_W - pad || py < pad || py > MAP_H - pad)
      return null;

    return { x: px, y: py };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Severity → color
// ---------------------------------------------------------------------------
function severityColor(severity: NewsEvent["severity"]): string {
  switch (severity) {
    case "CRITICAL":
      return "oklch(0.65 0.25 27)";
    case "HIGH":
      return "oklch(0.65 0.25 27)";
    case "MEDIUM":
      return "oklch(0.75 0.16 85)";
    case "LOW":
      return "oklch(0.5 0.18 120)";
  }
}

function severityLabel(severity: NewsEvent["severity"]): string {
  switch (severity) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MED";
    case "LOW":
      return "LOW";
  }
}

// ---------------------------------------------------------------------------
// Country flag emoji from country name (best-effort)
// ---------------------------------------------------------------------------
function countryFlag(country: string): string {
  const map: Record<string, string> = {
    US: "🇺🇸",
    USA: "🇺🇸",
    "United States": "🇺🇸",
    UK: "🇬🇧",
    "United Kingdom": "🇬🇧",
    China: "🇨🇳",
    Russia: "🇷🇺",
    India: "🇮🇳",
    Japan: "🇯🇵",
    Brazil: "🇧🇷",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Israel: "🇮🇱",
    Ukraine: "🇺🇦",
    Global: "🌍",
  };
  return map[country] ?? "🌐";
}

// ---------------------------------------------------------------------------
// GPS status badge
// ---------------------------------------------------------------------------
type GpsBadgeStatus = "LOCKED" | "SEARCHING" | "OFFLINE";

function GpsBadge({ status }: { status: GpsBadgeStatus }) {
  const styles: Record<
    GpsBadgeStatus,
    { bg: string; text: string; border: string; dot: string }
  > = {
    LOCKED: {
      bg: "oklch(0.2 0.08 145)",
      text: "oklch(0.7 0.2 145)",
      border: "1px solid oklch(0.5 0.2 145 / 0.6)",
      dot: "oklch(0.65 0.2 145)",
    },
    SEARCHING: {
      bg: "oklch(0.2 0.08 90)",
      text: "oklch(0.75 0.18 85)",
      border: "1px solid oklch(var(--primary) / 0.5)",
      dot: "oklch(var(--primary))",
    },
    OFFLINE: {
      bg: "oklch(0.18 0.05 25)",
      text: "oklch(0.65 0.2 25)",
      border: "1px solid oklch(0.5 0.2 25 / 0.5)",
      dot: "oklch(0.6 0.22 25)",
    },
  };

  const s = styles[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase shrink-0"
      style={{ background: s.bg, color: s.text, border: s.border }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === "SEARCHING" ? "animate-pulse" : ""}`}
        style={{ background: s.dot }}
      />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Event pin popup
// ---------------------------------------------------------------------------
interface EventPopupProps {
  event: NewsEvent;
  onDismiss: () => void;
  onClose: () => void;
  style: React.CSSProperties;
}

function EventPopup({ event, onDismiss, onClose, style }: EventPopupProps) {
  const color = severityColor(event.severity);

  return (
    <div
      className="absolute rounded-md p-2 flex flex-col gap-1.5 min-w-[160px] max-w-[200px]"
      style={{
        ...style,
        zIndex: 50,
        background: "oklch(0.12 0.04 250 / 0.97)",
        border: `1px solid ${color}`,
        boxShadow: `0 0 12px ${color.replace(")", " / 0.3)")}`,
        backdropFilter: "blur(8px)",
      }}
      data-ocid="map-event-popup"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close popup"
        data-ocid="map-event-popup.close_button"
        className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: "oklch(var(--muted-foreground))" }}
      >
        <X className="w-2.5 h-2.5" />
      </button>

      {/* Severity badge */}
      <span
        className="inline-flex w-fit items-center text-[8px] font-mono tracking-widest px-1.5 py-0.5 rounded"
        style={{
          background: `${color.replace(")", " / 0.15)")}`,
          color,
          border: `1px solid ${color.replace(")", " / 0.4)")}`,
        }}
      >
        ⚠ {severityLabel(event.severity)}
      </span>

      {/* Title */}
      <p
        className="text-[10px] font-mono leading-snug pr-4"
        style={{ color: "oklch(0.9 0.03 250)" }}
      >
        {event.title.slice(0, 60)}
        {event.title.length > 60 ? "…" : ""}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px]">{countryFlag(event.country)}</span>
        <span
          className="text-[9px] font-mono truncate"
          style={{ color: "oklch(var(--muted-foreground) / 0.6)" }}
        >
          {event.source}
        </span>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        data-ocid="map-event-popup.confirm_button"
        className="mt-0.5 text-[9px] font-mono tracking-widest px-2 py-0.5 rounded transition-all duration-150 w-fit"
        style={{
          border: "1px solid oklch(var(--destructive) / 0.4)",
          color: "oklch(var(--destructive) / 0.8)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.background = "oklch(var(--destructive) / 0.1)";
          el.style.borderColor = "oklch(var(--destructive) / 0.7)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background = "transparent";
          el.style.borderColor = "oklch(var(--destructive) / 0.4)";
        }}
      >
        DISMISS
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event pins overlay
// ---------------------------------------------------------------------------
interface EventPinsProps {
  events: NewsEvent[];
  centerLat: number;
  centerLon: number;
  onDismiss: (id: string) => void;
}

function EventPins({
  events,
  centerLat,
  centerLon,
  onDismiss,
}: EventPinsProps) {
  const [activePopup, setActivePopup] = useState<string | null>(null);

  return (
    <>
      {events.map((event) => {
        const pos = latLngToPixel(event.lat, event.lng, centerLat, centerLon);
        if (!pos) return null;

        const color = severityColor(event.severity);
        const isDismissed = event.dismissed;
        const isActive = activePopup === event.id;

        // Determine popup position: flip to left/up if near right/bottom edge
        const popupLeft = pos.x > MAP_W - 160 ? "auto" : "8px";
        const popupRight = pos.x > MAP_W - 160 ? "8px" : "auto";
        const popupTop = pos.y > MAP_H - 120 ? "auto" : "8px";
        const popupBottom = pos.y > MAP_H - 120 ? "8px" : "auto";

        return (
          <div
            key={event.id}
            className="absolute"
            style={{
              left: pos.x - 6,
              top: pos.y - 6,
              opacity: isDismissed ? 0.3 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            {/* Pin dot */}
            <button
              type="button"
              aria-label={`Event: ${event.title}`}
              data-ocid={`map-event-pin.${event.id}`}
              onClick={() => setActivePopup(isActive ? null : event.id)}
              className="w-3 h-3 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-150"
              style={{
                background: color,
                boxShadow: `0 0 6px ${color.replace(")", " / 0.7)")}`,
                border: "1px solid oklch(1 0 0 / 0.4)",
              }}
            />

            {/* Popup */}
            {isActive && !isDismissed && (
              <EventPopup
                event={event}
                onClose={() => setActivePopup(null)}
                onDismiss={() => {
                  onDismiss(event.id);
                  setActivePopup(null);
                }}
                style={{
                  left: popupLeft,
                  right: popupRight,
                  top: popupTop,
                  bottom: popupBottom,
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// MapTracking widget
// ---------------------------------------------------------------------------
export default function MapTracking() {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<LatLon | null>(null);
  const [mapError, setMapError] = useState(false);
  const [showEventPins, setShowEventPins] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Active alerts from backend (30s polling)
  const { data: activeAlerts = [] } = useGetActiveAlerts();
  const dismissMutation = useDismissEvent();

  // Active (non-dismissed) count
  const activeCount = activeAlerts.filter((e) => !e.dismissed).length;

  // Restore persisted coords
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LatLon;
        if (typeof parsed.lat === "number" && typeof parsed.lon === "number") {
          setCoords(parsed);
          setStatus("granted");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Request on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: LatLon = {
          lat: Math.round(pos.coords.latitude * 1e5) / 1e5,
          lon: Math.round(pos.coords.longitude * 1e5) / 1e5,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setCoords(loc);
        setStatus("granted");
        setMapError(false);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(loc));
        } catch {
          /* quota */
        }
      },
      () => setStatus("denied"),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const handleRefresh = () => {
    if (!navigator.geolocation) return;
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: LatLon = {
          lat: Math.round(pos.coords.latitude * 1e5) / 1e5,
          lon: Math.round(pos.coords.longitude * 1e5) / 1e5,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setCoords(loc);
        setStatus("granted");
        setMapError(false);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(loc));
        } catch {
          /* quota */
        }
      },
      () => setStatus("denied"),
      { timeout: 10_000 },
    );
  };

  const gpsBadgeStatus: GpsBadgeStatus =
    status === "granted"
      ? "LOCKED"
      : status === "locating"
        ? "SEARCHING"
        : "OFFLINE";

  const showMap =
    (status === "granted" || status === "idle") && coords && !mapError;

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: "oklch(var(--card))",
        border: "1px solid oklch(var(--border))",
        boxShadow:
          "0 0 20px oklch(0.6 0.18 240 / 0.15), 0 4px 24px oklch(0 0 0 / 0.4), inset 0 0 12px oklch(var(--primary) / 0.03)",
      }}
      data-ocid="map-tracking"
    >
      {/* Scan-line overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-lg"
        aria-hidden="true"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0 0 0 / 0.03) 2px, oklch(0 0 0 / 0.03) 4px)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary pulse-reactor" />
            <span className="text-[11px] font-mono text-primary/80 tracking-[0.3em] uppercase text-glow-gold">
              Location Intel
            </span>
            {/* Active events badge */}
            {activeCount > 0 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono tracking-widest"
                style={{
                  background: "oklch(0.65 0.25 27 / 0.15)",
                  color: "oklch(0.75 0.18 85)",
                  border: "1px solid oklch(0.65 0.25 27 / 0.4)",
                }}
                data-ocid="map-active-events-badge"
              >
                {activeCount} ACTIVE EVENTS
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Live Events toggle */}
            <button
              type="button"
              onClick={() => setShowEventPins((v) => !v)}
              aria-label="Toggle live event pins"
              data-ocid="map-live-events-toggle"
              title={showEventPins ? "Hide event pins" : "Show event pins"}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-widest transition-all duration-150"
              style={{
                border: showEventPins
                  ? "1px solid oklch(0.65 0.25 27 / 0.6)"
                  : "1px solid oklch(var(--border) / 0.4)",
                color: showEventPins
                  ? "oklch(0.75 0.18 85)"
                  : "oklch(var(--muted-foreground) / 0.4)",
                background: showEventPins
                  ? "oklch(0.65 0.25 27 / 0.1)"
                  : "transparent",
              }}
            >
              <Radio className="w-2.5 h-2.5" />
              LIVE
            </button>

            <GpsBadge status={gpsBadgeStatus} />

            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh location"
              data-ocid="map-refresh-btn"
              disabled={status === "locating"}
              className="flex items-center justify-center w-6 h-6 rounded transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                border: "1px solid oklch(var(--primary) / 0.3)",
                color: "oklch(var(--primary) / 0.6)",
              }}
              onMouseEnter={(e) => {
                if (status !== "locating") {
                  const el = e.currentTarget;
                  el.style.borderColor = "oklch(var(--primary) / 0.7)";
                  el.style.color = "oklch(var(--primary))";
                  el.style.background = "oklch(var(--primary) / 0.08)";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "oklch(var(--primary) / 0.3)";
                el.style.color = "oklch(var(--primary) / 0.6)";
                el.style.background = "transparent";
              }}
            >
              <RefreshCw
                className={`w-3 h-3 ${status === "locating" ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -mt-1" />

        {/* Map area */}
        <div
          ref={mapContainerRef}
          className="relative rounded overflow-hidden"
          style={{
            border: "1px solid oklch(var(--border) / 0.6)",
            background: "oklch(var(--background) / 0.5)",
          }}
        >
          {/* Locating state */}
          {status === "locating" && (
            <div className="h-[140px] flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "oklch(var(--primary))",
                    animation: "reactor-pulse 1s ease-in-out infinite",
                  }}
                />
                <span className="text-[11px] font-mono text-primary/80 tracking-widest animate-text-glow">
                  LOCATING...
                </span>
              </div>
              <span
                className="text-[9px] font-mono tracking-wider"
                style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
              >
                ACQUIRING GPS SIGNAL
              </span>
            </div>
          )}

          {/* Denied state */}
          {status === "denied" && (
            <div className="h-[140px] flex flex-col items-center justify-center gap-3 px-4">
              <div className="flex items-center gap-2">
                <MapPin
                  className="w-4 h-4"
                  style={{ color: "oklch(var(--destructive) / 0.7)" }}
                />
                <span
                  className="text-[11px] font-mono tracking-widest"
                  style={{ color: "oklch(var(--destructive) / 0.85)" }}
                >
                  GEOLOCATION RESTRICTED
                </span>
              </div>
              <span
                className="text-[9px] font-mono tracking-wider text-center leading-snug"
                style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
              >
                BROWSER PERMISSION REQUIRED
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                className="text-[10px] font-mono tracking-widest px-3 py-1 rounded transition-all duration-150"
                style={{
                  border: "1px solid oklch(var(--primary) / 0.4)",
                  color: "oklch(var(--primary) / 0.8)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "oklch(var(--primary) / 0.08)";
                  el.style.borderColor = "oklch(var(--primary) / 0.7)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "transparent";
                  el.style.borderColor = "oklch(var(--primary) / 0.4)";
                }}
                data-ocid="map-request-access-btn"
              >
                REQUEST ACCESS
              </button>
            </div>
          )}

          {/* Map tile unavailable */}
          {(status === "granted" || status === "idle") &&
            coords &&
            mapError && (
              <div className="h-[140px] flex flex-col items-center justify-center gap-2">
                <MapPin
                  className="w-5 h-5"
                  style={{ color: "oklch(var(--primary) / 0.4)" }}
                />
                <span
                  className="text-[9px] font-mono tracking-wider"
                  style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
                >
                  MAP TILE UNAVAILABLE
                </span>
                <span
                  className="text-[9px] font-mono"
                  style={{ color: "oklch(var(--primary) / 0.5)" }}
                >
                  {coords.lat.toFixed(4)}° N · {coords.lon.toFixed(4)}°
                </span>
              </div>
            )}

          {/* Map image + event pins overlay */}
          {showMap && (
            <div
              className="relative"
              style={{ width: MAP_W, height: MAP_H, maxWidth: "100%" }}
            >
              <img
                src={buildMapUrl(coords.lat, coords.lon)}
                alt={`Map at ${coords.lat}, ${coords.lon}`}
                className="w-full object-cover"
                style={{ height: MAP_H }}
                onError={() => setMapError(true)}
              />

              {/* Scan-line on map */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0 0 0 / 0.04) 2px, oklch(0 0 0 / 0.04) 4px)",
                }}
              />

              {/* HUD corner brackets */}
              <div
                className="absolute top-1 left-1 w-3 h-3 pointer-events-none"
                style={{
                  borderTop: "1px solid oklch(var(--primary) / 0.7)",
                  borderLeft: "1px solid oklch(var(--primary) / 0.7)",
                }}
              />
              <div
                className="absolute top-1 right-1 w-3 h-3 pointer-events-none"
                style={{
                  borderTop: "1px solid oklch(var(--primary) / 0.7)",
                  borderRight: "1px solid oklch(var(--primary) / 0.7)",
                }}
              />
              <div
                className="absolute bottom-1 left-1 w-3 h-3 pointer-events-none"
                style={{
                  borderBottom: "1px solid oklch(var(--primary) / 0.7)",
                  borderLeft: "1px solid oklch(var(--primary) / 0.7)",
                }}
              />
              <div
                className="absolute bottom-1 right-1 w-3 h-3 pointer-events-none"
                style={{
                  borderBottom: "1px solid oklch(var(--primary) / 0.7)",
                  borderRight: "1px solid oklch(var(--primary) / 0.7)",
                }}
              />

              {/* Pulsing gold crosshair at center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-6 h-6 rounded-full animate-pulse"
                  style={{
                    border: "1.5px solid oklch(var(--primary) / 0.85)",
                    boxShadow: "0 0 8px oklch(var(--primary) / 0.5)",
                  }}
                />
                <div
                  className="absolute w-px h-4"
                  style={{ background: "oklch(var(--primary) / 0.7)" }}
                />
                <div
                  className="absolute h-px w-4"
                  style={{ background: "oklch(var(--primary) / 0.7)" }}
                />
              </div>

              {/* Event pins overlay */}
              {showEventPins && activeAlerts.length > 0 && (
                <div
                  className="absolute inset-0"
                  data-ocid="map-event-pins-overlay"
                >
                  <EventPins
                    events={activeAlerts}
                    centerLat={coords.lat}
                    centerLon={coords.lon}
                    onDismiss={(id) => dismissMutation.mutate(id)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coordinates */}
        {coords && (
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded"
            style={{
              border: "1px solid oklch(var(--border) / 0.4)",
              background: "oklch(var(--background) / 0.4)",
            }}
            data-ocid="map-coords"
          >
            <Navigation
              className="w-3 h-3 shrink-0"
              style={{ color: "oklch(var(--primary) / 0.5)" }}
            />
            <code
              className="text-[10px] font-mono tracking-wider"
              style={{ color: "oklch(var(--primary) / 0.85)" }}
            >
              {coords.lat.toFixed(5)}° N &nbsp;·&nbsp; {coords.lon.toFixed(5)}°
            </code>
            {coords.accuracy && (
              <span
                className="ml-auto text-[9px] font-mono shrink-0"
                style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
              >
                ±{coords.accuracy}m
              </span>
            )}
          </div>
        )}

        {/* POI badges */}
        <div className="flex flex-wrap gap-1.5" data-ocid="map-poi-badges">
          {POI_BADGES.map((poi) => (
            <span
              key={poi.label}
              className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded"
              style={{
                ...poi.style,
                background: "oklch(var(--muted) / 0.2)",
              }}
            >
              {poi.label}
            </span>
          ))}
        </div>

        {/* Footer status */}
        <div
          className="flex items-center gap-1.5 pt-1"
          style={{ borderTop: "1px solid oklch(var(--border) / 0.3)" }}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${status === "granted" || status === "locating" ? "animate-pulse" : ""}`}
            style={{
              background:
                status === "granted"
                  ? "oklch(0.65 0.2 145 / 0.8)"
                  : status === "locating"
                    ? "oklch(var(--primary))"
                    : "oklch(var(--destructive) / 0.6)",
            }}
          />
          <span
            className="text-[10px] font-mono tracking-widest"
            style={{ color: "oklch(var(--muted-foreground) / 0.4)" }}
          >
            {status === "granted"
              ? "GPS LOCK · SIGNAL STRONG"
              : status === "locating"
                ? "ACQUIRING SIGNAL..."
                : "NO GPS SIGNAL"}
          </span>
          {activeCount > 0 && showEventPins && (
            <span
              className="ml-auto text-[9px] font-mono"
              style={{ color: "oklch(0.65 0.25 27 / 0.7)" }}
            >
              {activeCount} PIN{activeCount !== 1 ? "S" : ""} LIVE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
