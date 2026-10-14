import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, ChevronRight, Filter, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { dateLabel, money, todayIso } from '../utils/ui';
import { Modal, Spinner, Status, Toast } from '../components/UI';
import { PageHead } from './Sports';

export default function Bookings() {
  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [toast, setToast] = useState();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ sportId: '', facilityId: '', date: todayIso(), slotId: '' });

  const load = () => api.get('/bookings').then(r => setBookings(r.data));

  useEffect(() => {
    Promise.all([api.get('/sports'), api.get('/facilities'), load()]).then(([s, f]) => {
      setSports(s.data.filter(x => x.is_active));
      setFacilities(f.data.filter(x => x.is_active));
    });
  }, []);

  useEffect(() => {
    if (!form.facilityId) return setSlots([]);
    api.get('/slots', { params: { facilityId: form.facilityId, date: form.date } }).then(r => setSlots(r.data));
  }, [form.facilityId, form.date]);

  const fs = useMemo(() => facilities.filter(f => String(f.sport_id) === String(form.sportId)), [facilities, form.sportId]);

  const create = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        sport_id: Number(form.sportId),
        facility_id: Number(form.facilityId),
        time_slot_id: Number(form.slotId),
        booking_date: form.date
      });
      setOpen(false);
      setForm(x => ({ ...x, slotId: '' }));
      setToast({ message: 'Booking confirmed successfully.' });
      await Promise.all([load(), api.get('/slots', { params: { facilityId: form.facilityId, date: form.date } }).then(r => setSlots(r.data))]);
    } catch (e) {
      setToast({ type: 'error', message: e.response?.data?.message || 'Could not create booking.' });
    } finally {
      setSubmitting(false);
    }
  };

  const slot = slots.find(x => String(x.id) === String(form.slotId));
  const facility = facilities.find(x => String(x.id) === String(form.facilityId));
  const sport = sports.find(x => String(x.id) === String(form.sportId));

  return (
    <div className="inner-page-wrap">
      <PageHead 
        eyebrow="RESERVE YOUR COURT" 
        title="RESERVE YOUR TIME" 
        text="Real-time availability calculated from the live schedule. Pick your sport, date, and preferred time slot."
      />
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
          <span>FACILITY
            <select value={form.facilityId} disabled={!form.sportId} onChange={e => setForm({ ...form, facilityId: e.target.value, slotId: '' })}>
              <option value="">Select facility</option>
              {fs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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
          {!form.facilityId ? (
            <div className="empty">
              <CalendarDays size={32} />
              <b style={{ display: 'block', marginTop: '10px' }}>Select a sport and facility above</b>
              <span>Available time slots will load instantly.</span>
            </div>
          ) : (
            <div className="slots">
              {slots.map(s => (
                <button 
                  key={s.id} 
                  disabled={!s.available_for_date} 
                  className={String(form.slotId) === String(s.id) ? 'selected' : ''} 
                  onClick={() => setForm({ ...form, slotId: s.id })}
                >
                  <Clock3 size={15} />
                  <strong>{s.start_time} – {s.end_time}</strong>
                  <small>{s.booked_on_date ? 'Booked' : s.blocked_on_date ? 'Maintenance' : 'Available'}</small>
                </button>
              ))}
            </div>
          )}
          <div className="summary">
            <div>
              <small className="eyebrow-accent">SELECTED SLOT</small>
              <b>{slot ? `${facility?.name} · ${slot.start_time}–${slot.end_time}` : 'No slot selected'}</b>
            </div>
            <button className="btn-cta-navbar" disabled={!form.slotId} onClick={() => setOpen(true)}>
              <span>REVIEW & BOOK</span> <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

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
                <th>Sport</th>
                <th>Facility</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td><b>{b.booking_code}</b></td>
                  <td>{b.sport_name}</td>
                  <td>{b.facility_name}</td>
                  <td>{dateLabel(b.booking_date)}</td>
                  <td>{b.start_time} – {b.end_time}</td>
                  <td><Status value={b.status} /></td>
                  <td>{money(b.amount)}</td>
                </tr>
              ))}
              {!bookings.length && (
                <tr>
                  <td colSpan="7" className="empty-cell">No bookings found yet. Reserve your first court above!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Confirm Court Booking">
        <div className="confirm">
          <div><CheckCircle2 size={28} /></div>
          <section>
            <small className="eyebrow-accent">RESERVATION SUMMARY</small>
            <h3 style={{ fontSize: '24px', margin: '4px 0', textTransform: 'uppercase' }}>{sport?.name}</h3>
            <p>{facility?.name} · {dateLabel(form.date)} · {slot?.start_time}–{slot?.end_time}</p>
            <strong style={{ fontSize: '22px', color: 'var(--accent)' }}>{money(facility?.price)}</strong>
          </section>
        </div>
        <div className="notice" style={{ marginTop: '20px' }}>
          This confirmation immediately locks your court slot in the Trooferz MySQL database.
        </div>
        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn-secondary-sm" onClick={() => setOpen(false)}>Back</button>
          <button className="btn-cta-navbar" disabled={submitting} onClick={create}>
            {submitting ? 'Confirming...' : 'CONFIRM BOOKING NOW'}
          </button>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

