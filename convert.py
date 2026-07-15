import json
import os
from pyproj import Transformer

SRC_CRS = "EPSG:3375"
DST_CRS = "EPSG:4326"

transformer = Transformer.from_crs(SRC_CRS, DST_CRS, always_xy=True)

INPUT_DIR = r"D:\spacesyntax\spacesyntax"
OUTPUT_DIR = r"D:\spacesyntax\spacesyntax"

files = ["integration-800.geojson", "choice-800.geojson", "connectivity.geojson"]

KEEP_PROPS = {
    "integration-800.geojson": [
        "T1024_Integration", "T1024_Integration_R800_metric",
        "T1024_Choice", "T1024_Choice_R800_metric",
        "Segment_Length", "Connectivity",
    ],
    "choice-800.geojson": [
        "T1024_Choice", "T1024_Choice_R800_metric",
        "T1024_Integration", "T1024_Integration_R800_metric",
        "Segment_Length", "Connectivity",
    ],
    "connectivity.geojson": [
        "T1024_Integration", "T1024_Integration_R800_metric",
        "T1024_Choice", "T1024_Choice_R800_metric",
        "Segment_Length", "Connectivity",
    ],
}

def convert_coords(coords):
    if isinstance(coords[0], list):
        return [convert_coords(c) for c in coords]
    x, y = coords[:2]
    lon, lat = transformer.transform(x, y)
    return [lon, lat] + coords[2:]

for fname in files:
    in_path = os.path.join(INPUT_DIR, fname)
    out_name = fname.replace(".geojson", "-wgs84.geojson")
    out_path = os.path.join(OUTPUT_DIR, out_name)

    with open(in_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    keep = KEEP_PROPS.get(fname, [])
    for feat in data["features"]:
        feat["geometry"]["coordinates"] = convert_coords(feat["geometry"]["coordinates"])
        feat["properties"] = {k: feat["properties"].get(k) for k in keep}

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"Converted {fname} -> {out_name} ({len(data['features'])} features)")
