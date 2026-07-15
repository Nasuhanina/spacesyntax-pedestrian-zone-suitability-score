import os
import json
import math
import time
import requests
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS


load_dotenv()

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])

DATA_DIR = Path(__file__).parent / "data"
GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

GEO_MAP = {
    "integration": "integration-800-wgs84.geojson",
    "choiceDefault": "choice-800-wgs84.geojson",
    "choice800": "choice-800-wgs84.geojson",
    "connectivity": "connectivity-wgs84.geojson",
}

PZSS_WEIGHTS = {
    "integration800": 0.35,
    "choice800": 0.25,
    "connectivity": 0.10,
    "choiceRn": -0.10,
}

FIELD_MAP = {
    "integration800": "T1024_Integration_R800_metric",
    "choice800": "T1024_Choice_R800_metric",
    "connectivity": "Connectivity",
    "choiceRn": "T1024_Choice",
}

def haversine_km(lon1, lat1, lon2, lat2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def segment_midpoint(feature):
    coords = feature["geometry"]["coordinates"]
    if len(coords) == 2:
        return [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2]
    mid = len(coords) // 2
    return [coords[mid][0], coords[mid][1]]

def normalize(arr):
    mn = min(arr)
    mx = max(arr)
    if mx == mn:
        return [0.5] * len(arr)
    return [(v - mn) / (mx - mn) for v in arr]

def compute_pzss(features):
    if not features:
        return None

    raw = {}
    for key in FIELD_MAP:
        prop_key = FIELD_MAP[key]
        raw[key] = [f["properties"].get(prop_key, 0) or 0 for f in features]

    norm = {key: normalize(raw[key]) for key in FIELD_MAP}

    scores = []
    for i in range(len(features)):
        s = 0
        for key in PZSS_WEIGHTS:
            s += PZSS_WEIGHTS[key] * norm[key][i]
        scores.append(s)

    min_s = min(scores)
    max_s = max(scores)
    rng = max_s - min_s or 1
    scores100 = [(s - min_s) / rng * 100 for s in scores]

    sorted_s = sorted(scores100)
    n = len(sorted_s)
    mean = sum(sorted_s) / n
    variance = sum((v - mean) ** 2 for v in sorted_s) / n

    best_idx = scores100.index(max(scores100))
    worst_idx = scores100.index(min(scores100))

    zone_ranges = {}
    for key in FIELD_MAP:
        vals = raw[key]
        zone_ranges[key] = {
            "min": min(vals),
            "max": max(vals),
            "mean": sum(vals) / len(vals),
        }

    return {
        "count": n,
        "mean": round(mean, 2),
        "min": round(sorted_s[0], 2),
        "max": round(sorted_s[-1], 2),
        "median": round(
            (sorted_s[n // 2 - 1] + sorted_s[n // 2]) / 2 if n % 2 == 0 else sorted_s[n // 2],
            2,
        ),
        "std": round(math.sqrt(variance), 2),
        "bestSegment": {
            "index": best_idx,
            "score": round(scores100[best_idx], 2),
            "props": features[best_idx]["properties"],
        },
        "worstSegment": {
            "index": worst_idx,
            "score": round(scores100[worst_idx], 2),
            "props": features[worst_idx]["properties"],
        },
        "zoneRanges": zone_ranges,
        "scores": scores100,
    }

def find_features_within_radius(features, center_lat, center_lng, radius_km):
    matched = []
    for f in features:
        pt = segment_midpoint(f)
        d = haversine_km(center_lng, center_lat, pt[0], pt[1])
        if d <= radius_km:
            matched.append(f)
    return matched

@app.route("/api/geo/<metric>")
def get_geo(metric):
    fname = GEO_MAP.get(metric)
    if not fname:
        return jsonify({"error": f"Unknown metric: {metric}"}), 400
    path = DATA_DIR / fname
    if not path.exists():
        return jsonify({"error": "Data not found"}), 404
    with open(path, "r", encoding="utf-8") as f:
        return jsonify(json.load(f))

@app.route("/api/places")
def get_places():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    radius = request.args.get("radius", 800)
    if not lat or not lng:
        return jsonify({"error": "lat and lng required"}), 400
    if not GOOGLE_API_KEY:
        return jsonify({"error": "Server misconfigured: GOOGLE_PLACES_API_KEY not set"}), 500

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {"location": f"{lat},{lng}", "radius": radius, "key": GOOGLE_API_KEY}
    all_results = []
    final_status = "ZERO_RESULTS"

    try:
        while True:
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            final_status = data.get("status", "ZERO_RESULTS")

            if data.get("results"):
                all_results.extend(data["results"])

            next_token = data.get("next_page_token")
            if not next_token:
                break

            time.sleep(3)
            params = {"pagetoken": next_token, "key": GOOGLE_API_KEY}

        return jsonify({"status": final_status, "results": all_results})
    except requests.RequestException as e:
        return jsonify({"error": f"Places API error: {str(e)}"}), 502

@app.route("/api/analyze")
def analyze():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    radius = request.args.get("radius", 800, type=int)
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400

    geo_path = DATA_DIR / "integration-800-wgs84.geojson"
    if not geo_path.exists():
        return jsonify({"error": "GeoJSON data not found"}), 500

    with open(geo_path, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    features = geojson.get("features", [])

    matched = find_features_within_radius(features, lat, lng, radius / 1000)

    if not matched:
        return jsonify({"result": None, "featureCollection": None})

    result = compute_pzss(matched)

    if result and result.get("scores"):
        for i, f in enumerate(matched):
            f["properties"]["_pzss"] = result["scores"][i]
        result.pop("scores", None)

    fc = {"type": "FeatureCollection", "features": matched}

    return jsonify({"result": result, "featureCollection": fc})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
