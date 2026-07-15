export const METRICS = {
  integration: {
    id: 'integration',
    label: 'Integration (HH)',
    short: 'Integration',
    key: 'T1024_Integration',
    file: '/data/integration-800-wgs84.geojson',
    description:
      'Integration measures how many turns it takes to reach every other street segment from a given segment. High integration (warm) means the street is topologically central — easily accessible with few turns. Low integration (cool) means the street is more isolated. Integration is correlated with pedestrian movement, land value, and urban vitality.',
    colors: ['#313695','#4575b4','#74add1','#abd9e9','#fee090','#fdae61','#f46d43','#d73027','#a50026'],
  },
  choiceDefault: {
    id: 'choiceDefault',
    label: 'Choice (Default)',
    short: 'Choice',
    key: 'T1024_Choice',
    file: '/data/choice-800-wgs84.geojson',
    description:
      'Choice (Default) measures how likely a street segment is to be used as a through-route in the shortest paths between all pairs of segments across the entire system. High choice (warm) means the segment lies on many shortest paths — it is a likely route for through-movement. Low choice (cool) means it is rarely on the shortest path between other segments.',
    colors: ['#313695','#4575b4','#74add1','#abd9e9','#fee090','#fdae61','#f46d43','#d73027','#a50026'],
  },
  choice800: {
    id: 'choice800',
    label: 'Choice (800m)',
    short: 'Choice 800m',
    key: 'T1024_Choice_R800_metric',
    file: '/data/choice-800-wgs84.geojson',
    description:
      'Choice (800m) measures through-movement potential within an 800-metre metric radius from each segment. It captures local movement patterns — which streets are most likely used for short trips within a neighbourhood. High values indicate streets important for local connectivity and pedestrian flow at the neighbourhood scale.',
    colors: ['#313695','#4575b4','#74add1','#abd9e9','#fee090','#fdae61','#f46d43','#d73027','#a50026'],
  },
  connectivity: {
    id: 'connectivity',
    label: 'Connectivity',
    short: 'Connectivity',
    key: 'Connectivity',
    file: '/data/connectivity-wgs84.geojson',
    description:
      'Connectivity is the simplest measure: the number of immediate neighbours (intersections/junctions) directly connected to a street segment. Higher values mean a street has more direct connections. It is a local measure, unlike Integration and Choice which are global. Connectivity influences wayfinding and local accessibility.',
    colors: ['#313695','#4575b4','#74add1','#abd9e9','#fee090','#fdae61','#f46d43','#d73027','#a50026'],
  },
};

export function getColor(value, min, max, colors) {
  if (max === min) return colors[Math.floor(colors.length / 2)];
  const t = (value - min) / (max - min);
  const idx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 1);
  return colors[Math.max(0, idx)];
}
