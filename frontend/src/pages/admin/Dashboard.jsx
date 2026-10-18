import { useEffect, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  BarChart3,
  IndianRupee,
  MapPinned,
  ShieldCheck,
  Users,
  TrendingUp,
  Sun,
  CloudRain,
  Flame,
  Grid
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../../services/api';
import { money, dateLabel } from '../../utils/ui';
import { Spinner, Stat } from '../../components/UI';

export default function Dashboard() {
  const [data, setData] = useState();
  const [forecast, setForecast] = useState();
  const [heatmap, setHeatmap] = useState();
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/analytics/forecast/').catch(() => ({ data: null })),
      api.get('/analytics/heatmap/').catch(() => ({ data: null }))
    ])
      .then(([dashRes, forecastRes, heatmapRes]) => {
        setData(dashRes.data);
        setForecast(forecastRes?.data);
        setHeatmap(heatmapRes?.data);
      })
      .catch(e => setError(e.response?.data?.message || 'Could not load dashboard statistics.'));
  }, []);

  if (error) return <div className="empty"><b>Dashboard unavailable</b><span>{error}</span></div>;
  if (!data) return <Spinner label="Loading owner dashboard..." />;

  const s = data.summary;
  const w = data.weatherSummary;

  return (
    <div>
      <div className="page-head">
        <div>
          <small>OWNER BUSINESS INTELLIGENCE</small>
          <h1>Good morning. Club in motion.</h1>
          <p>Database-backed metrics, live Baner weather telemetry, and predictive demand modeling.</p>
        </div>
        <span className="admin-pill"><ShieldCheck size={15} /> Backend protected</span>
      </div>

      {/* Live Pune Weather Telemetry Widget */}
      {w && (
        <div className="weather-banner favorable" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {w.rainChance >= 50 ? <CloudRain size={24} color="#ff6b6b" /> : <Sun size={24} color="#c8ff00" />}
            <div>
              <span className="weather-badge green">LIVE FACILITY TELEMETRY</span>
              <h4 style={{ margin: '4px 0 2px' }}>{w.location} · {w.condition} ({w.temperature}°C)</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--white-soft)' }}>
                Precipitation probability: {w.rainChance}% · Outdoor turfs evaluated in real-time.
              </p>
            </div>
          </div>
          <span className="weather-badge amber">Auto Rain-Check Active</span>
        </div>
      )}

      {/* Core KPI Metrics */}
      <div className="stats-grid">
        <Stat label="Total users" value={s.totalUsers} Icon={Users} />
        <Stat label="Total bookings" value={s.totalBookings} Icon={CalendarCheck} />
        <Stat label="Today's bookings" value={s.todayBookings} Icon={Activity} />
        <Stat label="Upcoming" value={s.upcomingBookings} Icon={TrendingUp} />
        <Stat label="Active memberships" value={s.activeMemberships} Icon={ShieldCheck} />
        <Stat label="Facilities online" value={s.availableFacilities} Icon={MapPinned} />
        <Stat label="Total Revenue" value={money(s.revenue)} Icon={IndianRupee} />
      </div>

      {/* Charts Grid */}
      <div className="admin-chart-grid">
        <section className="panel chart-panel">
          <div className="section-head">
            <div>
              <small>BOOKING TREND</small>
              <h2>Last 7 days</h2>
            </div>
            <BarChart3 size={18} />
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tickFormatter={v => v.slice(5)} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#69d7b2" fill="#69d7b2" fillOpacity={0.14} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="section-head">
            <div>
              <small>SPORT MIX</small>
              <h2>Bookings by sport</h2>
            </div>
            <Activity size={18} />
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sportWise.slice(0, 7)} layout="vertical" margin={{ left: 20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={85} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 7, 7, 0]} fill="#77aef3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* ML Forward-Looking 7-Day Demand Forecast */}
      {forecast && (
        <div className="panel" style={{ marginTop: '24px' }}>
          <div className="section-head">
            <div>
              <small className="eyebrow-accent">MACHINE LEARNING PREDICTION</small>
              <h2>7-Day Projected Occupancy & Revenue (scikit-learn Ridge)</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="weather-badge green">Projected Revenue: ₹{Number(forecast.total_projected_revenue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date & Day</th>
                  <th>Predicted Occupancy</th>
                  <th>Projected Bookings</th>
                  <th>Projected Revenue</th>
                  <th>Peak Windows</th>
                  <th>Weather Outlook</th>
                </tr>
              </thead>
              <tbody>
                {forecast.daily_forecast?.map(f => (
                  <tr key={f.date}>
                    <td>
                      <b>{f.day}</b>
                      <div className="sub">{f.date} {f.is_weekend ? '(Weekend Surge)' : ''}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${f.predicted_occupancy_pct}%`, height: '100%', background: f.predicted_occupancy_pct >= 75 ? '#ff6b6b' : f.predicted_occupancy_pct >= 50 ? '#f6c85f' : '#69d7b2' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{f.predicted_occupancy_pct}%</span>
                      </div>
                    </td>
                    <td><b>{f.projected_bookings}</b> slots</td>
                    <td><b>₹{Number(f.projected_revenue).toLocaleString('en-IN')}</b></td>
                    <td><span className="sub">{f.peak_hours}</span></td>
                    <td><span className="weather-badge green" style={{ fontSize: '10px' }}>{f.weather_outlook}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demand Heatmap Matrix (7 Days x 17 Hours) */}
      {heatmap && heatmap.matrix && (
        <div className="panel" style={{ marginTop: '24px' }}>
          <div className="section-head">
            <div>
              <small className="eyebrow-accent">OPERATIONAL HEATMAP</small>
              <h2>Weekly Court Demand Matrix (06:00 – 22:00)</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="heatmap-cell discount" style={{ padding: '4px 8px' }}>Off-Peak (&lt;40%)</span>
              <span className="heatmap-cell normal" style={{ padding: '4px 8px' }}>Standard (40-70%)</span>
              <span className="heatmap-cell high" style={{ padding: '4px 8px' }}>High (70-85%)</span>
              <span className="heatmap-cell surge" style={{ padding: '4px 8px' }}>Peak Surge (&gt;85%)</span>
            </div>
          </div>
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'left' }}>Day</th>
                  {heatmap.operating_hours?.map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.matrix.map(row => (
                  <tr key={row.day}>
                    <td style={{ textAlign: 'left', fontWeight: 600 }}>{row.day.slice(0, 3)}</td>
                    {row.slots.map(s => {
                      const badgeClass = s.occupancy >= 85 ? 'surge' : s.occupancy >= 70 ? 'high' : s.occupancy >= 40 ? 'normal' : 'discount';
                      return (
                        <td key={s.hour}>
                          <div className={`heatmap-cell ${badgeClass}`} title={`${row.day} ${s.time}: ${s.occupancy}% Occupancy (${s.demand_level})`}>
                            {Math.round(s.occupancy)}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Facility Activity */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="section-head">
          <div>
            <small>FACILITY ACTIVITY</small>
            <h2>Top facilities</h2>
          </div>
        </div>
        <div className="mini-grid">
          {data.facilityWise.map(x => (
            <div className="metric-box" key={x.name}>
              <b>{x.name}</b>
              <strong>{x.count}</strong>
              <span>bookings</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
