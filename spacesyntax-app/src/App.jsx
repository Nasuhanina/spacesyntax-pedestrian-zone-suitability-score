import { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import RouteSidebar from './components/RouteSidebar';
import { METRICS } from './data/metrics';
import { fetchPlaces } from './data/places';
import './App.css';

function computeRanges(features, key) {
  let min = Infinity;
  let max = -Infinity;
  for (const f of features) {
    const v = f.properties[key];
    if (v != null) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { min, max };
}

export default function App() {
  const [geoData, setGeoData] = useState({});
  const [ranges, setRanges] = useState({});
  const [currentMetric, setCurrentMetric] = useState('integration');
  const [loading, setLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [places, setPlaces] = useState(null);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState(null);

  const [routeMode, setRouteMode] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    async function loadAll() {
      try {
        const entries = await Promise.all(
          Object.values(METRICS).map(async (m) => {
            const res = await fetch(`http://localhost:5000/api/geo/${m.id}`);
            const data = await res.json();
            return { id: m.id, data };
          })
        );
        const dataMap = {};
        const rangeMap = {};
        for (const { id, data } of entries) {
          dataMap[id] = data;
          rangeMap[id] = computeRanges(data.features, METRICS[id].key);
        }
        setGeoData(dataMap);
        setRanges(rangeMap);
      } catch (err) {
        console.error('Failed to load GeoJSON', err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const handleMetricChange = useCallback((id) => {
    setCurrentMetric(id);
  }, []);

  const handleAnalysisResult = useCallback((result) => {
    setAnalysisResult(result);
  }, []);

  const handleAnalysisLoading = useCallback((loading) => {
    setAnalysisLoading(loading);
  }, []);

  useEffect(() => {
    if (!analysisResult || !analysisResult.result) {
      setPlaces(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setPlacesLoading(true);
      setPlacesError(null);
      try {
        const data = await fetchPlaces(analysisResult.center.lat, analysisResult.center.lng);
        if (!cancelled) setPlaces(data);
      } catch (err) {
        if (!cancelled) setPlacesError(err.message);
      } finally {
        if (!cancelled) setPlacesLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [analysisResult]);

  const handleClearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setPlaces(null);
    setPlacesError(null);
  }, []);

  const handleToggleRouteMode = useCallback(() => {
    setRouteMode((prev) => {
      if (prev) {
        setRouteData(null);
      }
      return !prev;
    });
  }, []);

  const handleRouteResult = useCallback((data) => {
    setRouteData(data);
  }, []);

  const handleRouteLoading = useCallback((loading) => {
    setRouteLoading(loading);
  }, []);

  const handleClearRoute = useCallback(() => {
    setRouteData(null);
    setRouteMode(false);
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading space syntax data...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        metrics={METRICS}
        currentMetric={currentMetric}
        onChange={handleMetricChange}
        geoData={geoData[currentMetric]}
        ranges={ranges[currentMetric]}
        analysisResult={analysisResult}
        analysisLoading={analysisLoading}
        onClearAnalysis={handleClearAnalysis}
        places={places}
        placesLoading={placesLoading}
        placesError={placesError}
      />
      <MapView
        geoData={geoData[currentMetric]}
        metric={METRICS[currentMetric]}
        range={ranges[currentMetric]}
        onAnalysisResult={handleAnalysisResult}
        onAnalysisLoading={handleAnalysisLoading}
        places={places}
        routeMode={routeMode}
        onRouteResult={handleRouteResult}
        onRouteLoading={handleRouteLoading}
        routeData={routeData}
      />
      <RouteSidebar
        routeMode={routeMode}
        onToggleRouteMode={handleToggleRouteMode}
        routeData={routeData}
        routeLoading={routeLoading}
        onClearRoute={handleClearRoute}
      />
    </div>
  );
}
