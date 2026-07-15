# Space Syntax Visualizer & Pedestrian Zone Suitability Score (PZSS)

An interactive web application that visualizes urban street network analysis using Space Syntax theory and computes a **Pedestrian Zone Suitability Score (PZSS)** for any chosen location.

Click anywhere on the map to analyze an 800m radius zone. The app overlays street segments colored by PZSS, shows nearby Points of Interest (POIs) from Google Places, and displays detailed score statistics.

---

## What is Space Syntax?

Space Syntax is a set of theories and techniques for analyzing spatial configurations in urban environments. It models the street network as a graph where segments are nodes and intersections are edges, then computes metrics that describe how the network is used:

| Metric | Description |
|--------|-------------|
| **Integration (HH)** | How topologically central a street is — how few turns it takes to reach all other segments. High integration correlates with pedestrian activity, land value, and vitality. |
| **Choice (Default)** | How likely a street is used as a through-route in the shortest paths between all pairs of segments across the entire system. |
| **Choice (800m)** | Through-movement potential limited to an 800-metre metric radius — captures neighbourhood-scale movement patterns. |
| **Connectivity** | Number of immediate neighbours (intersections) directly connected to a segment. A simple local measure. |

---

## Pedestrian Zone Suitability Score (PZSS)

PZSS is a composite score (0–100) that rates how suitable a street segment is for pedestrian activity within an 800m radius zone. It combines four space syntax metrics using weighted normalization:

### Formula

```
PZSS = 0.35 × norm(Integration800) + 0.25 × norm(Choice800)
       + 0.10 × norm(Connectivity) - 0.10 × norm(ChoiceRn)
```

Each raw metric is min-max normalized to [0, 1] across the segments in the analyzed zone before weighting.

### Weights rationale

| Component | Weight | Rationale |
|-----------|--------|-----------|
| Integration800 | +0.35 | Topological centrality is the strongest predictor of pedestrian footfall — accessible streets attract more walking. |
| Choice800 | +0.25 | Local through-movement captures neighbourhood-scale route potential important for walking trips. |
| Connectivity | +0.10 | Direct intersections add marginal walkability benefit (already partially captured by Integration). |
| ChoiceRn | –0.10 | Global through-movement (Choice at infinity radius) penalizes high-traffic arterial roads dominated by vehicular through-traffic, which are less pedestrian-friendly. |

### Interpretation

- **High PZSS (70–100)**: Streets that are topologically central, locally well-connected, and not dominated by global through-traffic — ideal for pedestrian activity, retail frontages, and public life.
- **Medium PZSS (30–70)**: Moderately suitable streets with balanced characteristics.
- **Low PZSS (0–30)**: Isolated or vehicular-dominated streets — less suitable for walking.

---

## Tech Stack

### Frontend
- **React 19** with Vite
- **Leaflet** (via `react-leaflet`) — interactive map rendering
- **Oxlint** — linting
- **@turf/turf** — geospatial calculations

### Backend
- **Flask** (Python 3) — REST API
- **Google Places API** — Point of Interest data
- Pre-computed DepthmapX `.geojson` files for Shah Alam, Selangor (stored in `backend/data/`)

---

## Setup

### Prerequisites
- Node.js 20+
- Python 3.10+
- Google Places API key

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

Create `backend/.env`:

```
GOOGLE_PLACES_API_KEY=your_key_here
```

```bash
python app.py
```

The API runs on `http://localhost:5000`.

### Frontend

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`.

---

## API Endpoints

### `GET /api/geo/:metric`
Returns GeoJSON for a space syntax metric. `:metric` is one of `integration`, `choiceDefault`, `choice800`, `connectivity`.

### `GET /api/analyze?lat=&lng=&radius=800`
Computes PZSS for the 800m zone around the given coordinate. Returns the score statistics and a GeoJSON feature collection with `_pzss` on each feature for map coloring.

### `GET /api/places?lat=&lng=&radius=800`
Proxies Google Places Nearby Search, paginating through all results. Returns categorized POIs.

---

## Data

The space syntax network analysis was computed using **DepthmapX** for Shah Alam, Selangor, Malaysia. The segment map was derived from OpenStreetMap road centerlines. The following `.geojson` files are in `backend/data/`:

- `integration-800-wgs84.geojson` — Integration (HH) with Angular Segment Analysis, radius 800m metric
- `choice-800-wgs84.geojson` — Choice with Angular Segment Analysis (both default and 800m radius)
- `connectivity-wgs84.geojson` — Connectivity (number of direct neighbours)

All files are in WGS84 (EPSG:4326) coordinate reference system.
