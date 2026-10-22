import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ChevronRight,
  Filter,
  ArrowRight,
  QrCode,
  Users,
  CloudRain,
  Sun,
  Shield,
  AlertCircle,
  X,
  CreditCard,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { dateLabel, money, todayIso } from '../utils/ui';
import { Modal, Spinner, Status, Toast } from '../components/UI';
import { PageHead } from './Sports';
import { useAuth } from '../context/AuthContext';

export default function Bookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [courts, setCourts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [toast, setToast] = useState();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [weatherAdvisory, setWeatherAdvisory] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // QR Pass Modal
  const [selectedQrBooking, setSelectedQrBooking] = useState(null);

  // Cancellation Modal
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Booking Form State
  const [form, setForm] = useState({
    sportId: '',
    courtId: '',
    facilityId: '',
    date: todayIso(),
    slotId: '',
    paymentMethod: 'WALLET',
    upiId: user?.email ? `${user.email.split('@')[0]}@okaxis` : 'member@upi',
    isSplitPayment: false,
    players: [
      { name: user?.full_name || 'Captain', email: user?.email || '', share: 0 }
    ]
  });

  const loadBookings = () => {
    if (!user) {
      setBookings([]);
      return Promise.resolve();
    }
    return api.get('/bookings/').then(r => setBookings(Array.isArray(r.data) ? r.data : (r.data.results || []))).catch(() => setBookings([]));
  };

  const loadWaitlist = () => {
    if (!user) {
      setWaitlistEntries([]);
      return Promise.resolve();
    }
    return api.get('/waitlist/mine/').then(r => setWaitlistEntries(Array.isArray(r.data) ? r.data : (r.data.results || []))).catch(() => setWaitlistEntries([]));
  };

  useEffect(() => {
    const promises = [
      api.get('/sports/').catch(() => ({ data: [] })),
      api.get('/facilities/').catch(() => ({ data: [] })),
      api.get('/courts/').catch(() => ({ data: [] }))
    ];
    if (user) {
      promises.push(loadBookings());
      promises.push(loadWaitlist());
    } else {
      setBookings([]);
      setWaitlistEntries([]);
    }

    Promise.all(promises).then(([s, f, c]) => {
      const spList = (Array.isArray(s.data) ? s.data : (s.data?.results || [])).filter(x => x.is_active);
      const facList = (Array.isArray(f.data) ? f.data : (f.data?.results || [])).filter(x => x.is_active);
      const crtList = (Array.isArray(c.data) ? c.data : (c.data?.results || [])).filter(x => x.is_active);
      setSports(spList);
      setFacilities(facList);
      setCourts(crtList);

      const params = new URLSearchParams(location.search);
      const sid = params.get('sportId');
      const cid = params.get('courtId');

      if (sid) {
        setForm(f => ({ ...f, sportId: sid, courtId: cid || f.courtId }));
      } else if (cid) {
        setForm(f => ({ ...f, courtId: cid }));
      } else if (spList.length > 0) {
        // Auto-select first sport so slots and courts load immediately
        const defaultSportId = String(spList[0].id);
        const matchingCourts = crtList.filter(cr => String(cr.sport || cr.sport_id) === defaultSportId);
        const defaultCourtId = matchingCourts.length > 0 ? String(matchingCourts[0].id) : (crtList[0] ? String(crtList[0].id) : '');
        const defaultFacId = matchingCourts[0]?.facility || matchingCourts[0]?.facility_id || facList[0]?.id || 1;
        setForm(f => ({
          ...f,
          sportId: defaultSportId,
          courtId: defaultCourtId,
          facilityId: String(defaultFacId)
        }));
      }
    });
  }, [user]);

  // Available courts filtered by sport
  const availableCourts = useMemo(() => {
    if (!form.sportId) return courts;
    return courts.filter(c => String(c.sport) === String(form.sportId) || String(c.sport_id) === String(form.sportId));
  }, [courts, form.sportId]);

  // Auto-select court when sport changes if no valid court is selected
  useEffect(() => {
    if (form.sportId && availableCourts.length > 0) {
      const match = availableCourts.some(c => String(c.id) === String(form.courtId));
      if (!match) {
        setForm(f => ({
          ...f,
          courtId: String(availableCourts[0].id),
          facilityId: String(availableCourts[0].facility_id || availableCourts[0].facility || 1),
          slotId: ''
        }));
      }
    }
  }, [form.sportId, availableCourts]);

  // If court changes without sport selected, auto-set sport
  useEffect(() => {
    if (form.courtId && !form.sportId) {
      const courtObj = courts.find(c => String(c.id) === String(form.courtId));
      if (courtObj && (courtObj.sport || courtObj.sport_id)) {
        setForm(f => ({ ...f, sportId: String(courtObj.sport || courtObj.sport_id) }));
      }
    }
  }, [form.courtId, courts]);

  const targetCourtId = form.courtId || form.facilityId;

  // Load slots when court or date changes
  useEffect(() => {
    if (!targetCourtId) {
      setSlots([]);
      setWeatherAdvisory(null);
      return;
    }
    api.get('/slots/', { params: { courtId: targetCourtId, date: form.date, sportId: form.sportId } })
      .then(r => setSlots(Array.isArray(r.data) ? r.data : (r.data?.results || [])))
      .catch(() => setSlots([]));
  }, [targetCourtId, form.date, form.sportId]);

  // Fetch weather advisory when slot or court changes
  useEffect(() => {
    if (!targetCourtId || !form.slotId) {
      setWeatherAdvisory(null);
      return;
    }
    const currentSlot = slots.find(x => String(x.id) === String(form.slotId));
    if (!currentSlot) return;

    setLoadingWeather(true);
    api.get('/analytics/weather-advisory/', {
      params: {
        court_id: targetCourtId,
        date: form.date,
        time: currentSlot.start_time
      }
    })
      .then(res => {
        if (res.data?.target_evaluation) {
          setWeatherAdvisory(res.data.target_evaluation);
        } else if (res.data?.current) {
          setWeatherAdvisory({
            temperature_c: res.data.current.temperature_c,
            condition: res.data.current.condition,
            precipitation_probability: res.data.current.estimated_rain_prob || 10,
            status: 'FAVORABLE',
            badge_color: 'green',
            advisory_title: 'Optimal Playing Conditions',
            advisory_message: 'Great match weather predicted in Baner, Pune.'
          });
        }
      })
      .catch(() => setWeatherAdvisory(null))
      .finally(() => setLoadingWeather(false));
  }, [targetCourtId, form.slotId, form.date, slots]);

  const selectedCourt = courts.find(c => String(c.id) === String(targetCourtId)) || availableCourts[0];
  const slot = slots.find(x => String(x.id) === String(form.slotId));
  const sport = sports.find(x => String(x.id) === String(form.sportId)) || (selectedCourt ? sports.find(s => String(s.id) === String(selectedCourt.sport || selectedCourt.sport_id)) : null);
  const facility = facilities.find(x => String(x.id) === String(selectedCourt?.facility || selectedCourt?.facility_id || form.facilityId)) || facilities[0];
  const currentPrice = Number(slot?.dynamic_price || selectedCourt?.hourly_base_price || facility?.price || 800);

  // Auto-distribute shares when total price or player count changes
  useEffect(() => {
    if (!form.isSplitPayment || !currentPrice) return;
    const total = currentPrice;
    const count = Math.max(1, form.players.length);
    const shareEach = Math.round((total / count) * 100) / 100;
    setForm(f => ({
      ...f,
      players: f.players.map((p, idx) => ({
        ...p,
        share: idx === 0 ? Number((total - shareEach * (count - 1)).toFixed(2)) : shareEach
      }))
    }));
  }, [form.isSplitPayment, form.players.length, currentPrice]);

  const addPlayer = () => {
    if (form.players.length >= 8) return;
    setForm(f => ({
      ...f,
      players: [...f.players, { name: '', email: '', share: 0 }]
    }));
  };

  const removePlayer = (index) => {
    if (form.players.length <= 2) return;
    setForm(f => ({
      ...f,
      players: f.players.filter((_, i) => i !== index)
    }));
  };

  const updatePlayer = (index, field, value) => {
    setForm(f => ({
      ...f,
      players: f.players.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const create = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!form.slotId || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        sport_id: Number(form.sportId || selectedCourt?.sport || selectedCourt?.sport_id),
        court_id: Number(selectedCourt?.id || targetCourtId),
        facility_id: Number(selectedCourt?.facility || selectedCourt?.facility_id || facility?.id || 1),
        slot_id: Number(form.slotId),
        time_slot_id: Number(form.slotId),
        booking_date: form.date,
        payment_method: form.paymentMethod,
        upi_id: form.paymentMethod === 'UPI' ? form.upiId : undefined,
        is_split_payment: form.isSplitPayment
      };

      if (form.isSplitPayment) {
        payload.players = form.players.map(p => ({
          name: p.name || 'Player',
          email: p.email || '',
          share_amount: Number(p.share)
        }));
      }

      await api.post('/bookings/', payload);
      setOpen(false);
      setForm(x => ({ ...x, slotId: '', isSplitPayment: false }));
      setToast({ message: form.isSplitPayment ? 'Split booking initiated! Teammates can now settle their shares.' : 'Court booking confirmed successfully! Digital match pass generated.' });
      await Promise.all([
        loadBookings(),
        api.get('/slots/', { params: { courtId: targetCourtId, date: form.date, sportId: form.sportId } }).then(r => setSlots(Array.isArray(r.data) ? r.data : (r.data?.results || [])))
      ]);
    } catch (e) {
      const errorData = e.response?.data;
      let errorMsg = 'Could not create booking.';
      if (typeof errorData === 'string') {
        errorMsg = errorData;
      } else if (errorData?.message) {
        errorMsg = errorData.message;
      } else if (errorData?.detail) {
        errorMsg = errorData.detail;
      } else if (errorData && typeof errorData === 'object') {
        const firstVal = Object.values(errorData)[0];
        errorMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // Join Waitlist
  const joinWaitlist = async (slotId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post('/waitlist/join/', {
        court_id: form.facilityId,
        date: form.date,
        start_time: slots.find(s => s.id === slotId)?.start_time || '18:00'
      });
      setToast({ message: res.data?.message || 'Joined priority waitlist!' });
      loadWaitlist();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Could not join waitlist.' });
    }
  };

  // Claim Offered Waitlist Slot
  const claimWaitlist = async (entryId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post(`/waitlist/${entryId}/claim/`);
      setToast({ message: res.data?.message || 'Waitlist slot claimed! Booking confirmed.' });
      loadWaitlist();
      loadBookings();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Could not claim waitlist slot.' });
    }
  };

  // Settle Split Share
  const paySplitShare = async (bookingId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post('/bookings/split-pay/', {
        booking_id: bookingId,
        payment_method: 'WALLET'
      });
      setToast({ message: res.data?.message || 'Share paid successfully!' });
      loadBookings();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Could not settle split share.' });
    }
  };

  // Cancel Booking with Tiered Refund
  const confirmCancel = async () => {
    if (!cancelModalBooking || cancelling) return;
    setCancelling(true);
    try {
      const res = await api.post(`/bookings/${cancelModalBooking.id}/cancel/`);
      setToast({ message: res.data?.message || 'Booking cancelled and refund credited to wallet.' });
      setCancelModalBooking(null);
      loadBookings();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Cancellation failed.' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="inner-page-wrap">
      <PageHead
        eyebrow="RESERVE YOUR COURT"
        title="RESERVE YOUR TIME"
        text="Real-time availability, live Pune weather advisory, and team split payments."
      />

      {/* Active Waitlist Offers Banner */}
      {waitlistEntries.some(w => w.status === 'OFFERED') && (
        <div className="weather-banner unfavorable" style={{ marginBottom: '24px' }}>
          <div>
            <span className="weather-badge red">URGENT WAITLIST OPENING</span>
            <h4 style={{ margin: '6px 0 2px' }}>A Court Slot Just Opened Up For You!</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>You have 15 minutes to claim your reserved waitlist court before it rotates to the next player.</p>
          </div>
          {waitlistEntries.filter(w => w.status === 'OFFERED').map(w => (
            <button key={w.id} className="btn-cta-navbar" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => claimWaitlist(w.id)}>
              CLAIM COURT NOW
            </button>
          ))}
        </div>
      )}

      <section className="builder">
        <div className="step">
          <b>01</b>
          <span>SPORT
            <select value={form.sportId} onChange={e => setForm({ ...form, sportId: e.target.value, facilityId: '', slotId: '' })}>
              <option value="">Select sport</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </span>
        </div>
        <div className="step">
          <b>02</b>
          <span>COURT / ARENA
            <select
              value={form.courtId || ''}
              disabled={!form.sportId && availableCourts.length === 0}
              onChange={e => setForm({ ...form, courtId: e.target.value, facilityId: e.target.value, slotId: '' })}
            >
              <option value="">{form.sportId ? 'Select court / turf' : 'Select sport first'}</option>
              {availableCourts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} · ₹{Number(c.hourly_base_price).toLocaleString('en-IN')}/hr ({c.court_type || 'Arena'})
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="step">
          <b>03</b>
          <span>DATE
            <input type="date" min={todayIso()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value, slotId: '' })} />
          </span>
        </div>

        <div className="slot-box">
          <div className="section-head">
            <div>
              <small className="eyebrow-accent">04 · SELECT TIME SLOT</small>
              <h2 className="heading-huge" style={{ fontSize: '24px' }}>AVAILABLE SLOTS</h2>
            </div>
          </div>

          {!targetCourtId ? (
            <div className="empty">
              <CalendarDays size={32} />
              <b style={{ display: 'block', marginTop: '10px' }}>Select a sport and court above</b>
              <span>Available time slots will load instantly.</span>
            </div>
          ) : (
            <div className="slots">
              {slots.map(s => {
                const isAvailable = s.available_for_date;
                return (
                  <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      disabled={!isAvailable}
                      className={String(form.slotId) === String(s.id) ? 'selected' : ''}
                      onClick={() => setForm({ ...form, slotId: s.id })}
                    >
                      <Clock3 size={15} />
                      <strong>{s.start_time} – {s.end_time}</strong>
                      <small>{s.booked_on_date ? 'Booked' : s.blocked_on_date ? 'Maintenance' : 'Available'}</small>
                    </button>
                    {!isAvailable && (
                      <button
                        className="btn-secondary-sm"
                        style={{ fontSize: '11px', padding: '3px 6px', marginTop: '2px', background: 'rgba(255,255,255,0.06)' }}
                        onClick={() => joinWaitlist(s.id)}
                        title="Join priority waitlist queue for this slot"
                      >
                        Join Waitlist
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Weather Advisory Component */}
          {weatherAdvisory && (
            <div className={`weather-banner ${weatherAdvisory.badge_color === 'red' ? 'unfavorable' : weatherAdvisory.badge_color === 'amber' ? 'caution' : 'favorable'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {weatherAdvisory.is_indoor ? <Shield size={24} color="#69d7b2" /> : weatherAdvisory.precipitation_probability >= 50 ? <CloudRain size={24} color="#ff6b6b" /> : <Sun size={24} color="#c8ff00" />}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`weather-badge ${weatherAdvisory.badge_color}`}>{weatherAdvisory.advisory_title}</span>
                    <strong style={{ fontSize: '13px' }}>{weatherAdvisory.temperature_c}°C · {weatherAdvisory.condition}</strong>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--white-soft)' }}>
                    {weatherAdvisory.advisory_message}
                  </p>
                </div>
              </div>
              {weatherAdvisory.rain_check_guaranteed && (
                <span className="weather-badge red" style={{ whiteSpace: 'nowrap' }}>
                  Rain-Check Reschedule Guaranteed
                </span>
              )}
            </div>
          )}

          <div className="summary">
            <div>
              <small className="eyebrow-accent">SELECTED SLOT</small>
              <b>{slot ? `${selectedCourt?.name || facility?.name} · ${slot.start_time}–${slot.end_time}` : 'No slot selected'}</b>
            </div>
            <button className="btn-cta-navbar" disabled={!form.slotId} onClick={() => {
              if (!user) {
                navigate('/login');
                return;
              }
              const bal = Number(user?.wallet_balance || 0);
              if (bal < currentPrice && form.paymentMethod === 'WALLET') {
                setForm(f => ({ ...f, paymentMethod: 'DIRECT' }));
              }
              setOpen(true);
            }}>
              <span>REVIEW & BOOK</span> <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* User Bookings Table */}
      <section className="section" style={{ marginTop: '48px' }}>
        <div className="section-head">
          <div>
            <small className="eyebrow-accent">YOUR PLAY HISTORY</small>
            <h2 className="heading-huge" style={{ fontSize: '28px' }}>MY BOOKINGS</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Booking Code</th>
                <th>Sport / Court</th>
                <th>Date / Time</th>
                <th>Type</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Pass & Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>
                    <b>{b.booking_code}</b>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>#{b.id}</div>
                  </td>
                  <td>
                    <b>{b.sport_name || b.court?.sport?.name}</b>
                    <div style={{ fontSize: '12px', color: 'var(--white-soft)' }}>{b.facility_name || b.court?.name}</div>
                  </td>
                  <td>
                    {dateLabel(b.booking_date)}
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{b.start_time} – {b.end_time}</div>
                  </td>
                  <td>
                    {b.is_split_payment ? (
                      <span className="weather-badge amber" style={{ fontSize: '10px' }}>Team Split</span>
                    ) : (
                      <span className="weather-badge green" style={{ fontSize: '10px' }}>Single Payer</span>
                    )}
                  </td>
                  <td><Status value={b.status} /></td>
                  <td>{money(b.amount || b.total_amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {b.status === 'CONFIRMED' && (
                        <button
                          className="btn-cta-navbar"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                          onClick={() => setSelectedQrBooking(b)}
                          title="Show Digital QR Pass"
                        >
                          <QrCode size={13} style={{ marginRight: '4px' }} /> Pass
                        </button>
                      )}
                      {b.status === 'PENDING' && b.is_split_payment && (
                        <button
                          className="btn-secondary-sm"
                          style={{ fontSize: '11px', padding: '6px 10px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                          onClick={() => paySplitShare(b.id)}
                        >
                          Pay Share
                        </button>
                      )}
                      {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                        <button
                          className="btn-secondary-sm"
                          style={{ fontSize: '11px', padding: '6px 10px', color: '#ff8e8e', borderColor: 'rgba(255,107,107,0.3)' }}
                          onClick={() => setCancelModalBooking(b)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!bookings.length && (
                <tr>
                  <td colSpan="7" className="empty-cell">
                    {user ? (
                      'No bookings found yet. Reserve your first court above!'
                    ) : (
                      <span>
                        Please <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>log in</Link> to view and manage your booked matches, digital QR passes, and split payments.
                      </span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active Waitlist Section */}
      {waitlistEntries.length > 0 && (
        <section className="section" style={{ marginTop: '36px' }}>
          <div className="section-head">
            <div>
              <small className="eyebrow-accent">ALGORITHMIC QUEUE</small>
              <h2 className="heading-huge" style={{ fontSize: '24px' }}>MY ACTIVE WAITLISTS</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Court</th>
                  <th>Date & Time</th>
                  <th>Priority Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {waitlistEntries.map(w => (
                  <tr key={w.id}>
                    <td><b>{w.court_name}</b></td>
                    <td>{w.date} at {w.start_time}</td>
                    <td><span className="weather-badge amber">{w.priority_score} pts</span></td>
                    <td><Status value={w.status} /></td>
                    <td>
                      {w.status === 'OFFERED' ? (
                        <button className="btn-cta-navbar" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => claimWaitlist(w.id)}>
                          Claim Now!
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>In Queue</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Booking Confirmation & Split Payment Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm Court Booking" width={600}>
        <div className="confirm">
          <div><CheckCircle2 size={28} /></div>
          <section>
            <small className="eyebrow-accent">RESERVATION SUMMARY</small>
            <h3 style={{ fontSize: '22px', margin: '4px 0', textTransform: 'uppercase' }}>{sport?.name}</h3>
            <p>{selectedCourt?.name || facility?.name} · {dateLabel(form.date)} · {slot?.start_time}–{slot?.end_time}</p>
            <strong style={{ fontSize: '22px', color: 'var(--accent)' }}>{money(currentPrice)}</strong>
          </section>
        </div>

        {/* Split Payment Toggle */}
        <div style={{ marginTop: '20px', padding: '14px', background: 'var(--dark-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={form.isSplitPayment}
              onChange={e => setForm({ ...form, isSplitPayment: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
            />
            <span>Split Payment with Teammates (Multi-Party Escrow)</span>
          </label>

          {form.isSplitPayment && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ color: 'var(--muted)' }}>Equal split: ₹{(Number(currentPrice || 0) / form.players.length).toFixed(2)} per player</small>
                {form.players.length < 8 && (
                  <button className="btn-secondary-sm" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={addPlayer}>
                    <Plus size={12} style={{ marginRight: '4px' }} /> Add Teammate
                  </button>
                )}
              </div>
              <div className="split-players-list">
                {form.players.map((p, idx) => (
                  <div key={idx} className="split-player-row">
                    <input
                      placeholder={`Player ${idx + 1} Name`}
                      value={p.name}
                      onChange={e => updatePlayer(idx, 'name', e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '12px' }}
                    />
                    <input
                      placeholder="Email (optional)"
                      type="email"
                      value={p.email}
                      onChange={e => updatePlayer(idx, 'email', e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '12px' }}
                    />
                    <div style={{ padding: '8px 10px', background: 'var(--card)', borderRadius: '4px', textAlign: 'right', fontWeight: 600, fontSize: '12px' }}>
                      ₹{p.share}
                    </div>
                    {idx > 0 && (
                      <button onClick={() => removePlayer(idx)} style={{ color: '#ff8e8e', display: 'flex', justifyContent: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '10px' }}>
                Note: Teammates receive a notification and have 2 hours to settle their share. The slot is temporarily locked in escrow.
              </p>
            </div>
          )}
        </div>

        {/* Payment Method Selection */}
        <div style={{ marginTop: '14px', padding: '14px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--white-soft)', letterSpacing: '0.05em' }}>PAYMENT METHOD</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: (Number(user?.wallet_balance || 0) >= currentPrice) ? 'var(--accent)' : '#ff8e8e' }}>
              Wallet Balance: ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              className={form.paymentMethod === 'WALLET' ? 'btn-cta-navbar' : 'btn-secondary-sm'}
              style={{ padding: '10px 4px', fontSize: '12px', justifyContent: 'center', textAlign: 'center', opacity: (Number(user?.wallet_balance || 0) < currentPrice) ? 0.75 : 1 }}
              onClick={() => setForm({ ...form, paymentMethod: 'WALLET' })}
            >
              Trooferz Wallet
            </button>
            <button
              type="button"
              className={form.paymentMethod === 'UPI' ? 'btn-cta-navbar' : 'btn-secondary-sm'}
              style={{ padding: '10px 4px', fontSize: '12px', justifyContent: 'center', textAlign: 'center' }}
              onClick={() => setForm({ ...form, paymentMethod: 'UPI' })}
            >
              Instant UPI / QR
            </button>
            <button
              type="button"
              className={form.paymentMethod === 'DIRECT' ? 'btn-cta-navbar' : 'btn-secondary-sm'}
              style={{ padding: '10px 4px', fontSize: '12px', justifyContent: 'center', textAlign: 'center' }}
              onClick={() => setForm({ ...form, paymentMethod: 'DIRECT' })}
            >
              Pay at Counter
            </button>
          </div>

          {form.paymentMethod === 'UPI' && (
            <div style={{ marginTop: '14px', padding: '14px', background: 'var(--dark-2)', borderRadius: '8px', border: '1px solid rgba(200, 255, 0, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Accepted UPI Apps</span>
                <span className="weather-badge green" style={{ fontSize: '10px' }}>⚡ Instant Verification</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Cred UPI'].map(app => (
                  <span key={app} style={{ fontSize: '11px', background: 'var(--card)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '16px', color: '#fff', fontWeight: 500 }}>
                    {app}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', background: 'var(--card)', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=trooferz.sports@upi&pn=Trooferz%20Sports%20Club&am=${currentPrice}&cu=INR&tn=CourtBooking`)}`}
                  alt="UPI QR Code"
                  style={{ width: '80px', height: '80px', borderRadius: '4px', background: '#fff', padding: '4px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Official Trooferz VPA</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.02em', margin: '2px 0 6px' }}>
                    trooferz.sports@upi
                  </div>
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText('trooferz.sports@upi');
                        setToast({ message: 'UPI ID copied to clipboard!' });
                      }
                    }}
                  >
                    Copy UPI ID
                  </button>
                </div>
              </div>

              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: '12px', color: 'var(--white-soft)', display: 'block', marginBottom: '4px' }}>Enter Your UPI ID / VPA (Optional):</span>
                <input
                  type="text"
                  placeholder="e.g. member@okhdfcbank or 9876543210@paytm"
                  value={form.upiId || ''}
                  onChange={e => setForm({ ...form, upiId: e.target.value })}
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                />
              </label>
            </div>
          )}

          {form.paymentMethod === 'WALLET' && Number(user?.wallet_balance || 0) < currentPrice && (
            <small style={{ color: '#ff8e8e', display: 'block', marginTop: '8px', fontSize: '11px' }}>
              ⚠️ Balance is lower than ₹{currentPrice}. You can switch to "Instant UPI / QR" or "Pay at Counter" to book immediately.
            </small>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn-secondary-sm" onClick={() => setOpen(false)}>Back</button>
          <button className="btn-cta-navbar" disabled={submitting} onClick={create}>
            {submitting ? 'Confirming...' : 'CONFIRM & LOCK SLOT'}
          </button>
        </div>
      </Modal>

      {/* QR Pass Viewer Modal */}
      <Modal open={!!selectedQrBooking} onClose={() => setSelectedQrBooking(null)} title="Trooferz Digital Match Pass">
        {selectedQrBooking && (
          <div className="qr-pass-container">
            <div className="qr-image-wrapper">
              <img
                src={`${api.defaults.baseURL}/bookings/${selectedQrBooking.id}/qr-code/`}
                alt="Match QR Pass"
                onError={(e) => {
                  // Fallback to placeholder if token is rendered
                  e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(selectedQrBooking.qr_code_token || selectedQrBooking.booking_code)}`;
                }}
              />
            </div>
            <span className="weather-badge green">CONFIRMED PASS · READY FOR SCAN</span>
            <h3 style={{ margin: '12px 0 4px', fontSize: '20px' }}>{selectedQrBooking.booking_code}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              Present this code at Trooferz Reception in Baner for instant touchless entry.
            </p>

            <div className="qr-booking-meta">
              <div className="qr-meta-row">
                <span>Facility / Court</span>
                <strong>{selectedQrBooking.court_name || selectedQrBooking.facility_name}</strong>
              </div>
              <div className="qr-meta-row">
                <span>Date & Time</span>
                <strong>{selectedQrBooking.booking_date} ({selectedQrBooking.start_time} - {selectedQrBooking.end_time})</strong>
              </div>
              <div className="qr-meta-row">
                <span>Player</span>
                <strong>{selectedQrBooking.user_name || user?.full_name || user?.email}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Tiered Cancellation Confirmation Modal */}
      <Modal open={!!cancelModalBooking} onClose={() => setCancelModalBooking(null)} title="Cancel Court Reservation">
        {cancelModalBooking && (
          <div>
            <div className="notice" style={{ background: 'rgba(255,107,107,0.1)', borderColor: 'rgba(255,107,107,0.3)', color: '#ffbaba' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <AlertCircle size={18} color="#ff6b6b" />
                <strong>Trooferz Fair Cancellation & Refund Policy:</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                <li><b>&gt; 24 hours prior:</b> 100% full refund to wallet.</li>
                <li><b>24 to 6 hours prior:</b> 50% refund to wallet.</li>
                <li><b>&lt; 6 hours prior:</b> 0% refund (court slot held exclusively for your booking).</li>
              </ul>
            </div>
            <p style={{ marginTop: '16px', fontSize: '14px' }}>
              Are you sure you want to cancel booking <b>{cancelModalBooking.booking_code}</b>? The court will be released immediately to waiting players.
            </p>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn-secondary-sm" onClick={() => setCancelModalBooking(null)}>Keep Booking</button>
              <button
                className="btn-cta-navbar"
                style={{ background: '#ff6b6b', color: '#fff' }}
                disabled={cancelling}
                onClick={confirmCancel}
              >
                {cancelling ? 'Cancelling...' : 'CONFIRM CANCELLATION & REFUND'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
