import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Pause, Play, Satellite } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type VehicleStatus = "MOVING" | "STOPPED" | "EMERGENCY";

interface VehicleDef {
  id: string;
  label: string;
  emoji: string;
  markerColor: string;
  speed: number; // km/h
  status: VehicleStatus;
  route: [number, number][];
  routeName: string;
}

interface VehicleState {
  id: string;
  segIdx: number; // current segment start waypoint index
  frac: number; // 0.0–1.0 progress along current segment
  lat: number;
  lon: number;
  speed: number;
}

// ---------------------------------------------------------------------------
// Vehicle definitions
// ---------------------------------------------------------------------------
const VEHICLES: VehicleDef[] = [
  {
    id: "BUS-01",
    label: "BUS-01",
    emoji: "🚌",
    markerColor: "#3b82f6",
    speed: 35,
    status: "MOVING",
    routeName: "City Centre Loop",
    route: [
      [51.505, -0.09],
      [51.509, -0.082],
      [51.513, -0.075],
      [51.517, -0.083],
      [51.515, -0.098],
      [51.51, -0.107],
      [51.505, -0.09],
    ],
  },
  {
    id: "BUS-02",
    label: "BUS-02",
    emoji: "🚌",
    markerColor: "#06b6d4",
    speed: 28,
    status: "MOVING",
    routeName: "East-West Express",
    route: [
      [51.5, -0.12],
      [51.502, -0.105],
      [51.504, -0.09],
      [51.506, -0.073],
      [51.508, -0.058],
      [51.506, -0.073],
      [51.504, -0.09],
      [51.502, -0.105],
      [51.5, -0.12],
    ],
  },
  {
    id: "TRAM-01",
    label: "TRAM-01",
    emoji: "🚋",
    markerColor: "#22c55e",
    speed: 22,
    status: "MOVING",
    routeName: "Riverside Tram",
    route: [
      [51.498, -0.118],
      [51.499, -0.108],
      [51.5, -0.098],
      [51.501, -0.088],
      [51.499, -0.078],
      [51.497, -0.088],
      [51.498, -0.098],
      [51.498, -0.108],
      [51.498, -0.118],
    ],
  },
  {
    id: "DELIVERY-01",
    label: "DELIVERY-01",
    emoji: "🚐",
    markerColor: "#f97316",
    speed: 45,
    status: "MOVING",
    routeName: "Zone 1 Logistics",
    route: [
      [51.503, -0.13],
      [51.505, -0.115],
      [51.507, -0.1],
      [51.509, -0.085],
      [51.511, -0.07],
      [51.509, -0.085],
      [51.507, -0.1],
      [51.505, -0.115],
      [51.503, -0.13],
    ],
  },
  {
    id: "EMERGENCY-01",
    label: "EMERGENCY-01",
    emoji: "🚨",
    markerColor: "#ef4444",
    speed: 65,
    status: "EMERGENCY",
    routeName: "Rapid Response",
    route: [
      [51.512, -0.094],
      [51.508, -0.088],
      [51.503, -0.082],
      [51.498, -0.078],
      [51.494, -0.086],
      [51.498, -0.096],
      [51.503, -0.102],
      [51.508, -0.098],
      [51.512, -0.094],
    ],
  },
];

// ---------------------------------------------------------------------------
// Lerp helper
// ---------------------------------------------------------------------------
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Speed → fractional step per 100ms interval
// 1 km ≈ 0.009 degrees lat. Speed in km/h → km per 100ms = speed / 36000
// We normalize by segment length (rough: ~0.01–0.02 deg). Tuned visually.
function speedToStep(speed: number): number {
  return speed / 36000 / 0.012;
}

// ---------------------------------------------------------------------------
// Icon factory
// ---------------------------------------------------------------------------
function makeIcon(def: VehicleDef): L.DivIcon {
  const isEmergency = def.status === "EMERGENCY";
  const pulse = isEmergency
    ? "animation:emergencyPulse 0.8s ease-in-out infinite;"
    : "";
  return L.divIcon({
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
    html: `
      <style>
        @keyframes emergencyPulse {
          0%,100%{box-shadow:0 0 6px ${def.markerColor},0 0 14px ${def.markerColor}88;}
          50%{box-shadow:0 0 14px ${def.markerColor},0 0 28px ${def.markerColor}cc;}
        }
      </style>
      <div style="
        width:38px;height:38px;
        border-radius:50%;
        background:rgba(10,14,30,0.93);
        border:2px solid ${def.markerColor};
        box-shadow:0 0 8px ${def.markerColor}88;
        display:flex;align-items:center;justify-content:center;
        font-size:17px;
        position:relative;
        ${pulse}
      ">
        ${def.emoji}
      </div>`,
  });
}

// ---------------------------------------------------------------------------
// Popup HTML
// ---------------------------------------------------------------------------
function buildPopup(def: VehicleDef, speed: number): string {
  const statusColor =
    def.status === "EMERGENCY"
      ? "#ef4444"
      : def.status === "MOVING"
        ? "#4ade80"
        : "#6b7280";
  return `
    <div style="
      background:#0a0e1e;
      border:1px solid ${def.markerColor}60;
      border-radius:6px;
      padding:10px 12px;
      min-width:180px;
      font-family:'Share Tech Mono',monospace;
      color:#e2c96e;
    ">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${def.markerColor};margin-bottom:4px;text-shadow:0 0 6px ${def.markerColor}88;">
        ${def.emoji} ${def.label}
      </div>
      <div style="font-size:9px;color:#9ca3af;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">${def.routeName}</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
        <span style="font-size:9px;color:#9ca3af;letter-spacing:.1em;text-transform:uppercase;">STATUS</span>
        <span style="font-size:9px;font-weight:700;color:${statusColor};text-shadow:0 0 4px ${statusColor};">${def.status}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:9px;color:#9ca3af;letter-spacing:.1em;text-transform:uppercase;">SPEED</span>
        <span style="font-size:9px;color:#e2c96e;">${Math.round(speed)} KM/H</span>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Initial vehicle states (start at waypoint 0, frac 0)
// ---------------------------------------------------------------------------
function initStates(): VehicleState[] {
  return VEHICLES.map((def) => ({
    id: def.id,
    segIdx: 0,
    frac: Math.random(), // stagger start positions
    lat: def.route[0][0],
    lon: def.route[0][1],
    speed: def.speed,
  }));
}

// ---------------------------------------------------------------------------
// TransportTracker widget
// ---------------------------------------------------------------------------
export default function TransportTracker() {
  const [running, setRunning] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const statesRef = useRef<VehicleState[]>(initStates());
  const runningRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep runningRef in sync with state
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // ── Initialize Leaflet map ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const map = L.map(containerRef.current, {
      center: [51.505, -0.09],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" as string },
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Route polylines (gold, 40% opacity)
    for (const def of VEHICLES) {
      L.polyline(def.route, {
        color: "#d4a417",
        opacity: 0.4,
        weight: 1.5,
        dashArray: "5 7",
      }).addTo(map);
    }

    // Vehicle markers
    const initSt = statesRef.current;
    for (let i = 0; i < VEHICLES.length; i++) {
      const def = VEHICLES[i];
      const st = initSt[i];
      const marker = L.marker([st.lat, st.lon], { icon: makeIcon(def) })
        .addTo(map)
        .bindPopup(buildPopup(def, def.speed), {
          className: "hud-popup",
          maxWidth: 220,
          closeButton: false,
        });
      markersRef.current[def.id] = marker;
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      initializedRef.current = false;
    };
  }, []);

  // ── Smooth animation at 100ms intervals ──────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!runningRef.current) return;

      statesRef.current = statesRef.current.map((st, i) => {
        const def = VEHICLES[i];
        const route = def.route;
        const step = speedToStep(def.speed);

        let { segIdx, frac } = st;
        frac += step;

        // Advance to next segment(s) if fraction overflows
        while (frac >= 1.0) {
          frac -= 1.0;
          segIdx = (segIdx + 1) % (route.length - 1);
        }

        const wA = route[segIdx];
        const wB = route[segIdx + 1] ?? route[0];
        const lat = lerp(wA[0], wB[0], frac);
        const lon = lerp(wA[1], wB[1], frac);

        // Update Leaflet marker
        const marker = markersRef.current[def.id];
        if (marker) {
          marker.setLatLng([lat, lon]);
          marker.setPopupContent(buildPopup(def, def.speed));
        }

        return { ...st, segIdx, frac, lat, lon };
      });

      setLastUpdate(new Date());
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const toggleRunning = () => setRunning((r) => !r);

  const focusVehicle = (id: string) => {
    setSelectedId(id);
    const idx = statesRef.current.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const st = statesRef.current[idx];
    const marker = markersRef.current[id];
    const map = mapRef.current;
    if (map && marker) {
      map.setView([st.lat, st.lon], 14, { animate: true });
      marker.openPopup();
    }
  };

  const timeStr = lastUpdate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className="hud-panel rounded-lg p-3 flex flex-col gap-2.5"
      data-ocid="transport-tracker"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full" />
          <span className="text-[11px] font-mono text-primary/90 tracking-widest uppercase text-glow-gold">
            Transport Tracker
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono border border-primary/40 bg-primary/5 px-1.5 py-px rounded tracking-widest"
            style={{ color: "oklch(var(--primary))" }}
          >
            5 ACTIVE
          </span>
          <Satellite className="w-3.5 h-3.5 text-primary/60" />
          <button
            type="button"
            onClick={toggleRunning}
            aria-label={running ? "Pause tracking" : "Resume tracking"}
            className="text-primary/60 hover:text-primary transition-colors duration-200"
            data-ocid="transport-toggle-btn"
          >
            {running ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Map container ── */}
      <div
        className="relative rounded overflow-hidden border border-border/60"
        style={{ background: "#0a0e1e" }}
      >
        {/* HUD corner decorations */}
        <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-primary/60 rounded-tl z-10 pointer-events-none" />
        <div className="absolute top-1 right-1 w-3 h-3 border-t border-r border-primary/60 rounded-tr z-10 pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-primary/60 rounded-bl z-10 pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-primary/60 rounded-br z-10 pointer-events-none" />

        <div
          ref={containerRef}
          className="h-[200px] w-full"
          style={{ background: "#0a0e1e" }}
        />
      </div>

      {/* ── Vehicle list ── */}
      <div className="flex flex-col gap-1" data-ocid="vehicle-list">
        {VEHICLES.map((def, i) => {
          const isEmergency = def.status === "EMERGENCY";
          const isSelected = selectedId === def.id;
          const dotStyle = isEmergency
            ? { background: "#ef4444", boxShadow: "0 0 6px #ef4444" }
            : { background: "#4ade80", boxShadow: "0 0 4px #4ade8088" };

          return (
            <button
              type="button"
              key={def.id}
              onClick={() => focusVehicle(def.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-smooth text-left w-full ${
                isSelected
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/30 bg-background/30 hover:border-primary/40 hover:bg-primary/5"
              }`}
              data-ocid={`vehicle-row.item.${i + 1}`}
            >
              <span className="text-sm leading-none shrink-0">{def.emoji}</span>
              <span
                className="text-[10px] font-mono truncate flex-1 min-w-0 tracking-wider"
                style={{ color: def.markerColor }}
              >
                {def.label}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/60 tabular-nums shrink-0">
                {def.speed} km/h
              </span>
              {/* Status dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isEmergency ? "animate-pulse" : ""}`}
                style={dotStyle}
              />
            </button>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${running ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`}
          />
          <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest">
            {running ? "LIVE · 5 ACTIVE" : "PAUSED"}
          </span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/35 tabular-nums tracking-wider">
          {timeStr}
        </span>
      </div>
    </div>
  );
}
