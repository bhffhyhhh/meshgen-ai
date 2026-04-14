# Design Brief — MeshGen AI Production Upgrade

## Tone
Industrial-futuristic, premium tech, HUD-inspired, Tony Stark aesthetic with data-visualization focus

## Palette
| Name | OKLCH | Usage |
|------|-------|-------|
| Navy (bg) | 0.12 0.04 250 | Dark backgrounds, premium depth |
| Charcoal (card) | 0.16 0.05 248 | Card surfaces, elevated states |
| Gold (primary) | 0.8 0.18 90 | CTAs, accent borders, highlights, progress bars |
| Amber (accent) | 0.72 0.15 70 | Secondary interactions, glow accents |
| Tech Blue (border) | 0.32 0.12 240 | Borders, HUD lines, tech overlays |
| Foreground | 0.92 0.01 230 | Text, high contrast |
| Alert Critical/High | 0.65 0.25 27 | Red severity badges, critical event pins on map |
| Alert Medium | 0.75 0.16 85 | Amber severity badges, medium priority event pins |
| Alert Low | 0.5 0.18 120 | Green severity badges, low priority event pins |

## Typography
- **Display**: Space Grotesk (geometric, tech-forward, all headings)
- **Body**: Geist Mono (precision monospace, chat & UI)
- **Mono**: Geist Mono (code, metrics, data)

## Shapes
Radius: `0.375rem` (6px) for sharp, technical edges; 0px for hard corners on hero elements.

## Structural Zones
| Zone | Background | Border | Depth |
|------|------------|--------|-------|
| Header | `--card` (0.16) | `--border` tech-blue | Elevated 1px top border, subscription tier badge |
| Chat Column | `--background` (0.12) | None | Recessed |
| Card/Message | `--card` (0.16) | 1px `--border` tech-blue | Glowing shadow, +8px glow |
| Dashboard Widgets | `--card` (0.16) | 1px `--border` tech-blue | Glow + metallic sheen |
| Analytics Panel | `--card` (0.16) | 1px `--border` tech-blue | 4-metric grid, sparkline chart, API usage bar |
| Voice Tab | `--card` (0.16) | 1px `--border` tech-blue | Mic button, transcript display, volume slider |
| Map Events | Color-coded severity pins | 1px severity color border | RED (critical), AMBER (medium), GREEN (low) |
| Tier Selector | Free: muted border | Pro: gold glow | Enterprise: gold 2px border |
| Footer/Status | `--background` (0.12) | 1px top `--border` | Minimal |

## Component Patterns
- **Buttons**: Primary gold, text navy; hover: glow-border-gold effect, +opacity
- **Inputs**: Dark navy border with gold focus ring, monospace text
- **Chat Messages**: User (right, amber bg), AI F.R.I.D.A.Y. (left, dark card + gold accent bar)
- **Metric Cards**: Title + large value + subtext, hud-border styling, gold glow on hover
- **Sparkline**: 6px bars in gold with light shadow, responsive to hourly data
- **Progress Bar**: Gold fill with glow effect, dark background track, percentage text
- **Severity Badges**: `.badge-critical` (red), `.badge-high` (red), `.badge-medium` (amber), `.badge-low` (green)
- **Tier Badges**: `.tier-free` (muted), `.tier-pro` (gold glow), `.tier-enterprise` (gold 2px border)
- **Voice Indicator**: Pulsing animation when listening, transcript in monospace

## Data Visualization & Analytics
- **Event Counter**: Total events today across all severity levels
- **Locations Tracked**: Count of unique geographic locations from news/alerts
- **Videos Generated**: Cumulative video summaries created this period
- **Alerts Dismissed**: User-dismissed alerts (tracked for UX metrics)
- **Hourly Chart**: Sparkline showing event count per hour (last 24h), responsive bars
- **API Usage**: Free tier (10/10), Pro tier (50/100), Enterprise (unlimited)

## Accent & Motion
- **Arc Reactor**: Animated SVG spinning ring (gold, pulsing 2s cycle) in header or sidebar
- **Glow Effects**: Cards emit `.glow-border-gold` (0 0 8px gold, inset highlight)
- **Transitions**: All interactive elements use `transition-smooth` (0.3s cubic-bezier)
- **Voice Pulse**: `.voice-listening` animation on mic button when active (1.5s ease-in-out)
- **Severity Pins**: Map event pins pulsate with their assigned severity color

## Constraints
- **No gradients** except for linear progress bar fill
- **No rounded corners** > 6px (sharp, technical aesthetic)
- **Dark mode only** — optimize for night viewing, reduce eye strain
- **Metallic accents** via shadows, never raw gradients
- **High contrast** — all text AA+ WCAG compliant
- **All 8 panels always visible** on responsive grid (no hidden panels on mobile)

## Signature Details
1. **Animated Arc Reactor** — gold spinning ring with opacity pulse, visible in header or floating in chat
2. **F.R.I.D.A.Y. Accent Bar** — gold left border on AI responses reinforcing assistant brand
3. **Color-Coded Event Severity** — RED (critical), AMBER (medium), GREEN (low) on map pins and badges
4. **Subscription Tier Display** — Free/Pro/Enterprise badges in header with quota visibility
5. **Data-Driven Interactivity** — Analytics Dashboard with live metrics, sparkline chart, API usage bar
6. **Voice Integration** — Pulsing mic button with transcript display and TTS volume control
