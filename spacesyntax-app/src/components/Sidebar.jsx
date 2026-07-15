import { useState, useMemo } from 'react';
import { getColor } from '../data/metrics';
import { POI_CATEGORY_COLORS } from '../data/places';

function Collapsible({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <div className="collapsible">
      <button className="collapsible-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className={`collapsible-arrow ${open ? 'open' : ''}`}>▸</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

function Stats({ geoData, metric, range }) {
  const stats = useMemo(() => {
    if (!geoData) return null;
    const key = metric.key;
    const vals = geoData.features
      .map((f) => f.properties[key])
      .filter((v) => v != null)
      .sort((a, b) => a - b);

    if (vals.length === 0) return null;

    const sum = vals.reduce((s, v) => s + v, 0);
    const mean = sum / vals.length;
    const median =
      vals.length % 2 === 0
        ? (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2
        : vals[Math.floor(vals.length / 2)];
    const p95 = vals[Math.floor(vals.length * 0.95)];

    return { min: range.min, max: range.max, mean, median, p95, count: vals.length };
  }, [geoData, metric, range]);

  if (!stats) return null;

  const fmt = (v) =>
    typeof v === 'number'
      ? v >= 1000
        ? v.toLocaleString(undefined, { maximumFractionDigits: 1 })
        : v.toFixed(4)
      : v;

  return (
    <div className="stats">
      {['min', 'max', 'mean', 'median', 'p95', 'count'].map((k) => (
        <div className="stat" key={k}>
          <span className="label">{k === 'p95' ? '95th %ile' : k.charAt(0).toUpperCase() + k.slice(1)}</span>
          <span className="value">{k === 'count' ? stats[k].toLocaleString() : fmt(stats[k])}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ metric, range }) {
  const stops = 9;
  const gradStops = Array.from({ length: stops }, (_, i) => {
    const t = i / (stops - 1);
    const val = range.min + t * (range.max - range.min);
    return `${getColor(val, range.min, range.max, metric.colors)} ${(t * 100).toFixed(0)}%`;
  });

  return (
    <div className="legend">
      <div className="gradient" style={{ background: `linear-gradient(to right, ${gradStops.join(',')})` }} />
      <div className="labels">
        <span>Low {metric.short}</span>
        <span>High {metric.short}</span>
      </div>
    </div>
  );
}

function AnalysisPanel({ result, analysisLoading, onClear, places, placesLoading, placesError }) {
  if (!result) return null;

  const r = result.result;
  const fmt = (v) => (v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : v.toFixed(4));

  return (
    <div className="analysis-panel">
      {analysisLoading && (
        <div className="analysis-loading">
          <div className="loading-spinner-inline" />
          <span>Computing analysis...</span>
        </div>
      )}

      <div className="analysis-header">
        <h3>PZSS — Zone Analysis</h3>
        <button className="clear-btn" onClick={onClear} title="Clear analysis">×</button>
      </div>
      <p className="analysis-desc">
        800m radius at ({result.center.lat.toFixed(5)}, {result.center.lng.toFixed(5)})
      </p>

      {result.error ? (
        <p className="analysis-desc" style={{ color: '#e74c3c' }}>Error: {result.error}</p>
      ) : !r ? (
        <p className="analysis-desc" style={{ color: '#e74c3c' }}>No street segments found within this 800m radius.</p>
      ) : (
        <>

      <div className="analysis-score">
        <span className="score-label">Mean PZSS</span>
        <span className="score-value">{r.mean}</span>
      </div>

      <Collapsible title="Score Details" defaultOpen={false}>
        <div className="stats">
          <div className="stat"><span className="label">Segments</span><span className="value">{r.count.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Min</span><span className="value">{r.min}</span></div>
          <div className="stat"><span className="label">Max</span><span className="value">{r.max}</span></div>
          <div className="stat"><span className="label">Median</span><span className="value">{r.median}</span></div>
          <div className="stat"><span className="label">Std Dev</span><span className="value">{r.std}</span></div>
        </div>

        <h4 style={{ fontSize: '0.8rem', color: '#888', margin: '10px 0 4px' }}>Raw Ranges in Zone</h4>
        <div className="stats">
          {Object.entries(r.zoneRanges).map(([key, vals]) => (
            <div className="stat" key={key}>
              <span className="label">{key}</span>
              <span className="value">{fmt(vals.min)} – {fmt(vals.max)}</span>
            </div>
          ))}
        </div>
      </Collapsible>

      <Collapsible title={`Nearby Places${places ? ` (${places.total})` : ''}`} defaultOpen={true}>
        {placesLoading && (
          <div className="analysis-loading-sm">
            <div className="loading-spinner-inline" />
            <span>Loading places...</span>
          </div>
        )}
        {placesError && <p className="places-error">{placesError}</p>}
        {places && (
          <>
            <div className="poi-total">
              <span className="poi-total-label">Total POIs within 800m</span>
              <span className="poi-total-number">{places.total}</span>
            </div>
            <div className="places-categories">
              {places.categories.map((c, i) => (
                <div className="place-cat" key={c.category}>
                  <div className="place-cat-left">
                    <span className="place-cat-rank">{i + 1}</span>
                    <span className="place-cat-dot" style={{ color: POI_CATEGORY_COLORS[c.category] || '#7f8c8d' }}>●</span>
                    <span className="place-cat-name">{c.category}</span>
                  </div>
                  <span className="place-cat-count">{c.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Collapsible>

      </>
      )}
    </div>
  );
}

export default function Sidebar({ metrics, currentMetric, onChange, geoData, ranges, analysisResult, analysisLoading, onClearAnalysis, places, placesLoading, placesError }) {
  return (
    <aside className="sidebar">
      <h1>Space Syntax Visualizer</h1>
      <p className="subtitle">Shah Alam, Selangor — Click map to analyze a zone</p>

      <div className="controls">
        {Object.values(metrics).map((m) => (
          <button
            key={m.id}
            className={`metric-btn${m.id === currentMetric ? ' active' : ''}`}
            onClick={() => onChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="info-panel">
        {analysisResult ? (
          <AnalysisPanel
            result={analysisResult}
            analysisLoading={analysisLoading}
            onClear={onClearAnalysis}
            places={places}
            placesLoading={placesLoading}
            placesError={placesError}
          />
        ) : (
          <>
            <h3>{metrics[currentMetric].label}</h3>
            <p>{metrics[currentMetric].description}</p>
            {ranges && <Legend metric={metrics[currentMetric]} range={ranges} />}
            {geoData && ranges && (
              <Stats geoData={geoData} metric={metrics[currentMetric]} range={ranges} />
            )}
          </>
        )}
      </div>
    </aside>
  );
}
