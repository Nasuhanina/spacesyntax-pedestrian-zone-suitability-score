import { distance } from '@turf/turf';

const RADIUS_KM = 0.8;

export const PZSS_WEIGHTS = {
  integration800: 0.35,
  choice800: 0.25,
  connectivity: 0.10,
  choiceRn: -0.10,
};

export const FIELD_MAP = {
  integration800: 'T1024_Integration_R800_metric',
  choice800: 'T1024_Choice_R800_metric',
  connectivity: 'Connectivity',
  choiceRn: 'T1024_Choice',
};

export function findFeaturesWithinRadius(features, center) {
  return features.filter((f) => {
    const coords = f.geometry.coordinates;
    const mid = coords.length === 2
      ? [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2]
      : coords[Math.floor(coords.length / 2)];
    const d = distance([center.lng, center.lat], mid, { units: 'kilometers' });
    return d <= RADIUS_KM;
  });
}

function normalize(arr) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max === min) return arr.map(() => 0.5);
  return arr.map((v) => (v - min) / (max - min));
}

export function computePZSS(features) {
  if (!features || features.length === 0) return null;

  const raw = {};
  for (const key of Object.keys(FIELD_MAP)) {
    raw[key] = features.map((f) => f.properties[FIELD_MAP[key]] ?? 0);
  }

  const norm = {};
  for (const key of Object.keys(FIELD_MAP)) {
    norm[key] = normalize(raw[key]);
  }

  const scores = features.map((_, i) => {
    let score = 0;
    for (const key of Object.keys(PZSS_WEIGHTS)) {
      score += PZSS_WEIGHTS[key] * norm[key][i];
    }
    return score;
  });

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const scores100 = scores.map((s) => ((s - minScore) / range) * 100);

  const sorted = [...scores100].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

  const bestIdx = scores100.indexOf(Math.max(...scores100));
  const worstIdx = scores100.indexOf(Math.min(...scores100));

  const zoneRanges = {};
  for (const key of Object.keys(FIELD_MAP)) {
    const vals = raw[key];
    zoneRanges[key] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
      mean: vals.reduce((s, v) => s + v, 0) / vals.length,
    };
  }

  return {
    count: n,
    mean: +mean.toFixed(2),
    min: +sorted[0].toFixed(2),
    max: +sorted[n - 1].toFixed(2),
    median: n % 2 === 0
      ? +((sorted[n / 2 - 1] + sorted[n / 2]) / 2).toFixed(2)
      : +sorted[Math.floor(n / 2)].toFixed(2),
    std: +Math.sqrt(variance).toFixed(2),
    bestSegment: {
      index: bestIdx,
      score: +scores100[bestIdx].toFixed(2),
      props: features[bestIdx].properties,
    },
    worstSegment: {
      index: worstIdx,
      score: +scores100[worstIdx].toFixed(2),
      props: features[worstIdx].properties,
    },
    zoneRanges,
    scores: scores100,
  };
}
