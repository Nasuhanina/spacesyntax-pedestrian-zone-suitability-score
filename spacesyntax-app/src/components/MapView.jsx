import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getColor } from '../data/metrics';
import { POI_CATEGORY_COLORS, GROUP_MAP } from '../data/places';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function styleFeature(feature, metric, range) {
  const val = feature.properties[metric.key];
  if (val == null) return { color: '#333', weight: 1, opacity: 0.3 };
  const color = getColor(val, range.min, range.max, metric.colors);
  return { color, weight: 1.5, opacity: 0.85 };
}


function getPoiInfo(types) {
  if (!types) return { color: '#7f8c8d', category: 'Other' };
  for (const [cat, tags] of Object.entries(GROUP_MAP)) {
    if (types.some(t => tags.includes(t))) return { color: POI_CATEGORY_COLORS[cat], category: cat };
  }
  return { color: '#7f8c8d', category: 'Other' };
}

export default function MapView({ geoData, metric, range, onAnalysisResult, onAnalysisLoading, places, routeMode, onRouteResult, onRouteLoading, routeData }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const circleRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const onResultRef = useRef(onAnalysisResult);
  const onLoadingRef = useRef(onAnalysisLoading);

  const routeModeRef = useRef(routeMode);
  const onRouteResultRef = useRef(onRouteResult);
  const onRouteLoadingRef = useRef(onRouteLoading);
  const routeClickCountRef = useRef(0);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  onResultRef.current = onAnalysisResult;
  onLoadingRef.current = onAnalysisLoading;
  onRouteResultRef.current = onRouteResult;
  onRouteLoadingRef.current = onRouteLoading;
  routeModeRef.current = routeMode;

  function clearRouteLayers(map) {
    if (originMarkerRef.current) {
      map.removeLayer(originMarkerRef.current);
      originMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    routeClickCountRef.current = 0;
  }

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [3.065, 101.51],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', async (e) => {
      if (routeModeRef.current) {
        const count = routeClickCountRef.current;

        if (count === 2) {
          clearRouteLayers(map);
        }

        if (routeClickCountRef.current === 0) {
          const marker = L.circleMarker(e.latlng, {
            radius: 10,
            color: '#fff',
            weight: 2,
            fillColor: '#3498db',
            fillOpacity: 0.9,
          });
          marker.bindTooltip('Origin', { permanent: true, direction: 'top', offset: [0, -10] });
          marker.addTo(map);
          originMarkerRef.current = marker;
          routeClickCountRef.current = 1;
          return;
        }

        if (routeClickCountRef.current === 1) {
          const marker = L.circleMarker(e.latlng, {
            radius: 10,
            color: '#fff',
            weight: 2,
            fillColor: '#e74c3c',
            fillOpacity: 0.9,
          });
          marker.bindTooltip('Destination', { permanent: true, direction: 'top', offset: [0, -10] });
          marker.addTo(map);
          destMarkerRef.current = marker;
          routeClickCountRef.current = 2;

          const origin = originMarkerRef.current.getLatLng();
          const dest = e.latlng;

          const loadingRef = onRouteLoadingRef.current;
          const resultRef = onRouteResultRef.current;
          try {
            if (loadingRef) loadingRef(true);
            const res = await fetch(
              `http://localhost:5000/api/directions?origin_lat=${origin.lat}&origin_lng=${origin.lng}&dest_lat=${dest.lat}&dest_lng=${dest.lng}`
            );
            const data = await res.json();
            if (resultRef) resultRef(data);
          } catch (err) {
            console.error('[Route] Error:', err);
            if (resultRef) resultRef({ error: err.message || 'Route fetch failed' });
          } finally {
            if (loadingRef) loadingRef(false);
          }
          return;
        }
        return;
      }

      const loadingRef = onLoadingRef.current;
      const resultRef = onResultRef.current;
      try {
        if (loadingRef) loadingRef(true);

        if (circleRef.current) map.removeLayer(circleRef.current);
        if (highlightLayerRef.current) map.removeLayer(highlightLayerRef.current);

        const center = e.latlng;
        const circle = L.circle(center, {
          radius: 800,
          color: '#e94560',
          fillColor: '#e94560',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '4 4',
        });
        circle.addTo(map);
        circleRef.current = circle;

        const res = await fetch(
          `http://localhost:5000/api/analyze?lat=${center.lat}&lng=${center.lng}&radius=800`
        );
        const data = await res.json();

        if (data.featureCollection) {
          const pzssColors = ['#313695','#4575b4','#74add1','#abd9e9','#fee090','#fdae61','#f46d43','#d73027','#a50026'];
          const props = data.featureCollection.features.map((f) => f.properties._pzss);
          const pzssMin = Math.min(...props);
          const pzssMax = Math.max(...props);

          const hl = L.geoJSON(data.featureCollection, {
            style: (f) => ({
              color: getColor(f.properties._pzss, pzssMin, pzssMax, pzssColors),
              weight: 3,
              opacity: 1,
            }),
          });
          hl.addTo(map);
          highlightLayerRef.current = hl;
        }

        if (resultRef) {
          resultRef({
            result: data.result,
            center: { lat: center.lat, lng: center.lng },
          });
        }
      } catch (err) {
        console.error('[PZSS] Analysis error:', err);
        if (resultRef) {
          resultRef({
            result: null,
            center: { lat: e.latlng.lat, lng: e.latlng.lng },
            error: err.message || 'Analysis failed',
          });
        }
      } finally {
        if (loadingRef) loadingRef(false);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geoData) return;

    if (layerRef.current) {
      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
      map.removeLayer(layerRef.current);
    }

    const layer = L.geoJSON(geoData, {
      style: (f) => styleFeature(f, metric, range),
    });

    layer.addTo(map);
    layerRef.current = layer;

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geoData, metric, range]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (poiLayerRef.current) {
      map.removeLayer(poiLayerRef.current);
      poiLayerRef.current = null;
    }

    if (!places || !places.raw || places.raw.length === 0) return;

    const group = L.layerGroup();

    for (const place of places.raw) {
      const lat = place.geometry.location.lat;
      const lng = place.geometry.location.lng;
      const { color, category } = getPoiInfo(place.types);

      const marker = L.circleMarker([lat, lng], {
        radius: 5,
        color: '#fff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.9,
      });

      marker.bindTooltip(place.name, { direction: 'top', offset: [0, -5] });
      marker.bindPopup(`
        <strong>${place.name}</strong><br/>
        <span style="color:${color}">●</span> ${category}<br/>
        ${place.vicinity || ''}
      `);

      group.addLayer(marker);
    }

    group.addTo(map);
    poiLayerRef.current = group;
  }, [places]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (!routeData || !routeData.routes || routeData.routes.length === 0) return;

    const path = routeData.routes[0].overview_path;
    if (!path || path.length === 0) return;

    const latlngs = path.map((p) => [p[0], p[1]]);
    const line = L.polyline(latlngs, {
      color: '#3498db',
      weight: 5,
      opacity: 0.8,
    });
    line.addTo(map);
    routeLineRef.current = line;

    map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }, [routeData]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!routeMode) {
      clearRouteLayers(map);
    }
  }, [routeMode]);

  return <div ref={mapRef} className="map" />;
}
