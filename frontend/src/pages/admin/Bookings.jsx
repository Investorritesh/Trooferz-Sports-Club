import { useEffect, useState } from 'react';
import { CalendarCheck, Search, QrCode, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { Spinner, Status, Toast } from '../../components/UI';

const states = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'];

export default function AdminBookings() {
  const [rows, setRows] = useState();
  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [filters, setFilters] = useState({ search: '', date: '', sportId: '', facilityId: '', status: '' });
  const [toast, setToast] = useState();

  // Front-Desk QR Scanner State
  const [qrToken, setQrToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const load = () =>
    api
      .get('/bookings/', { params: filters })
      .then(r => setRows(Array.isArray(r.data) ? r.data : (r.data?.results || [])))
      .catch(() => setRows([]));

  useEffect(() => {
    Promise.all([
      api.get('/sports/').catch(() => ({ data: [] })),
      api.get('/facilities/').catch(() => ({ data: [] }))
    ]).then(([s, f]) => {
      setSports(Array.isArray(s.data) ? s.data : (s.data?.results || []));
      setFacilities(Array.isArray(f.data) ? f.data : (f.data?.results || []));
    });
    load();
  }, []);

  const setStatus = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/`, { status });
      setToast({ message: 'Booking status updated.' });
      load();
    } catch (e) {
      setToast({ type: 'error', message: e.response?.data?.message || 'Could not update booking.' });
    }
  };

  const handleVerifyQr = async (e) => {
    e?.preventDefault();
    if (!qrToken.trim() || verifying) return;
    setVerifying(true);
    setScanResult(null);

    try {
      const res = await api.post('/bookings/verify-qr/', { token: qrToken.trim() });
      setScanResult({
        success: true,
        data: res.data
      });
      setToast({ message: res.data?.message || 'Check-in verified successfully!' });
      setQrToken('');
      load();
    } catch (err) {
      setScanResult({
        success: false,
        message: err.response?.data?.message || 'QR verification failed.'
      });
      setToast({ type: 'error', message: err.response?.data?.message || 'Invalid or duplicate pass.' });
    } finally {
      setVerifying(false);
    }
  };

  if (!rows) return <Spinner />;

  return (
    <div>
      <div className="page-head">
        <div>
          <small>OPERATIONS & CHECK-IN</small>
          <h1>Booking management</h1>
          <p>Front-desk check-in scanner, court schedule overview, and lifecycle state management.</p>
        </div>
        <span className="admin-pill"><CalendarCheck size={15} /> {rows.length} bookings</span>
      </div>

      {/* Front-Desk QR Check-In Scanner Tool */}
      <div className="scanner-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <QrCode size={20} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '16px', letterSpacing: '0.04em' }}>FRONT-DESK TOUCHLESS QR SCANNER</h3>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--muted)' }}>
          Scan or paste member's digital match pass token to verify attendance and execute atomic check-in.
        </p>

        <form onSubmit={handleVerifyQr} className="scanner-form">
          <input
            placeholder="e.g. QR-PASS-TRF-20261017-ABCDEF..."
            value={qrToken}
            onChange={e => setQrToken(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', background: 'var(--dark-2)', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff' }}
          />
          <button
            type="submit"
            className="btn-cta-navbar"
            style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
            disabled={!qrToken.trim() || verifying}
          >
            {verifying ? 'Verifying...' : 'VERIFY & CHECK IN'}
          </button>
        </form>

        {/* Scan Verification Result Feedback */}
        {scanResult && (
          <div style={{
            marginTop: '14px',
            padding: '12px 16px',
            borderRadius: '6px',
            background: scanResult.success ? 'rgba(105, 215, 178, 0.12)' : 'rgba(255, 107, 107, 0.12)',
            border: `1px solid ${scanResult.success ? '#69d7b2' : '#ff6b6b'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {scanResult.success ? <CheckCircle2 size={20} color="#69d7b2" /> : <AlertTriangle size={20} color="#ff6b6b" />}
            <div>
              <b style={{ color: scanResult.success ? '#69d7b2' : '#ff6b6b' }}>
                {scanResult.success ? 'Pass Verified Successfully' : 'Scan Rejected'}
              </b>
              <div style={{ fontSize: '13px', marginTop: '2px' }}>
                {scanResult.success ? (
                  <span>
                    Checked in: <b>{scanResult.data?.booking_code}</b> · Court: {scanResult.data?.court_name} ({scanResult.data?.time})
                  </span>
                ) : (
                  <span>{scanResult.message}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="search wide-search">
          <Search size={16} />
          <input
            placeholder="Booking ID, user name or email"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
        <input
          className="filter-select"
          type="date"
          value={filters.date}
          onChange={e => setFilters({ ...filters, date: e.target.value })}
        />
        <select
          className="filter-select"
          value={filters.sportId}
          onChange={e => setFilters({ ...filters, sportId: e.target.value })}
        >
          <option value="">All sports</option>
          {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          className="filter-select"
          value={filters.facilityId}
          onChange={e => setFilters({ ...filters, facilityId: e.target.value })}
        >
          <option value="">All facilities</option>
          {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select
          className="filter-select"
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          {states.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <button className="secondary" onClick={load}>Filter</button>
      </div>

      {/* Bookings Table */}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Member</th>
              <th>Sport / Court</th>
              <th>Date / Time</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id}>
                <td>
                  <b>{b.booking_code}</b>
                  <div className="sub">#{b.id}</div>
                </td>
                <td>
                  <b>{b.user_name}</b>
                  <div className="sub">{b.user_email}</div>
                </td>
                <td>
                  <b>{b.sport_name}</b>
                  <div className="sub">{b.facility_name}</div>
                </td>
                <td>
                  {b.booking_date}
                  <div className="sub">{b.start_time}–{b.end_time}</div>
                </td>
                <td>
                  {b.is_split_payment ? (
                    <span className="weather-badge amber" style={{ fontSize: '10px' }}>Team Split</span>
                  ) : (
                    <span className="weather-badge green" style={{ fontSize: '10px' }}>Single</span>
                  )}
                </td>
                <td>₹{Number(b.amount || b.total_amount || 0).toLocaleString('en-IN')}</td>
                <td><Status value={b.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select
                      className="mini-select"
                      value={b.status}
                      onChange={e => setStatus(b.id, e.target.value)}
                    >
                      {states.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                    {b.qr_code_token && b.status === 'CONFIRMED' && (
                      <button
                        className="btn-secondary-sm"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => {
                          setQrToken(b.qr_code_token);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        title="Copy pass token to scanner"
                      >
                        Scan Pass
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">No bookings found.</div>}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
