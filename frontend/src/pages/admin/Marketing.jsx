import { useEffect, useState } from 'react';
import { Megaphone, Plus, Tag, Edit3, Power, Trash2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Modal, Spinner, Status, Toast } from '../../components/UI';

export function Offers() {
  const [rows, setRows] = useState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState();
  const [form, setForm] = useState({
    title: '',
    description: '',
    discount_percent: 15,
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    is_active: true
  });

  const load = () =>
    api
      .get('/content/offers/')
      .then(r => setRows(Array.isArray(r.data) ? r.data : (r.data.results || [])))
      .catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      discount_percent: 15,
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      is_active: true
    });
    setOpen(true);
  };

  const openEdit = (offer) => {
    setEditing(offer);
    setForm({
      title: offer.title || '',
      description: offer.description || '',
      discount_percent: Number(offer.discount_percent) || 10,
      valid_until: offer.valid_until ? String(offer.valid_until).slice(0, 10) : '',
      is_active: Boolean(offer.is_active)
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      discount_percent: Number(form.discount_percent),
      valid_until: form.valid_until,
      is_active: form.is_active
    };

    try {
      if (editing) {
        await api.put(`/content/offers/${editing.id}/`, body);
        setToast({ message: 'Offer updated successfully.' });
      } else {
        await api.post('/content/offers/', body);
        setToast({ message: 'Promotional offer created successfully.' });
      }
      setOpen(false);
      load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Could not save offer.'
      });
    }
  };

  const toggleActive = async (offer) => {
    try {
      await api.delete(`/content/offers/${offer.id}/`);
      setToast({ message: `Offer ${offer.is_active ? 'deactivated' : 'activated'}.` });
      load();
    } catch (err) {
      setToast({ type: 'error', message: 'Could not toggle offer status.' });
    }
  };

  if (!rows) return <Spinner />;

  return (
    <div>
      <Head 
        icon={Tag} 
        eyebrow="GROWTH & PROMOTIONS" 
        title="Promotional Offers" 
        text="Create, activate, and manage promotional discount passes shown on the public club experience." 
        onAdd={openCreate} 
        label="Create Offer" 
      />

      <div className="cards-grid">
        {rows.map(o => (
          <article className="promo-card" key={o.id} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div className="promo-percent">{Number(o.discount_percent).toFixed(0)}%</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="icon-btn" 
                  title="Edit Offer"
                  onClick={() => openEdit(o)}
                >
                  <Edit3 size={15} />
                </button>
                <button 
                  className="icon-btn" 
                  title={o.is_active ? 'Deactivate' : 'Activate'}
                  onClick={() => toggleActive(o)}
                  style={{ color: o.is_active ? '#34d399' : 'var(--muted)' }}
                >
                  <Power size={15} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <small style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> VALID UNTIL {String(o.valid_until).slice(0, 10)}
              </small>
              <h3 style={{ margin: '6px 0', fontSize: '18px' }}>{o.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, flex: 1 }}>{o.description}</p>
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Status value={o.is_active ? 'ACTIVE' : 'INACTIVE'} />
                <span style={{ fontSize: '12px', color: 'var(--white-soft)', fontWeight: 600 }}>
                  {Number(o.discount_percent)}% OFF
                </span>
              </div>
            </div>
          </article>
        ))}

        {!rows.length && (
          <div className="empty full">
            <Tag size={32} />
            <b>No offers created yet</b>
            <span>Click &quot;Create Offer&quot; above to launch a promotion.</span>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Promotional Offer" : "Create New Offer"}>
        <form className="form-grid" onSubmit={save}>
          <Field 
            label="Offer Title" 
            value={form.title} 
            onChange={e => setForm({ ...form, title: e.target.value })} 
            placeholder="e.g. Monsoon Turf Night Pass" 
            required 
          />
          <Field 
            label="Discount %" 
            type="number" 
            min="1" 
            max="100" 
            value={form.discount_percent} 
            onChange={e => setForm({ ...form, discount_percent: e.target.value })} 
            required 
          />
          <Field 
            label="Valid Until" 
            type="date" 
            value={form.valid_until} 
            onChange={e => setForm({ ...form, valid_until: e.target.value })} 
            required 
          />
          <label className="field full">
            Description
            <textarea 
              className="input textarea" 
              rows={3}
              value={form.description} 
              onChange={e => setForm({ ...form, description: e.target.value })} 
              placeholder="e.g. Flat discount on box cricket and football evening slots."
            />
          </label>
          <label className="check full" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              checked={form.is_active} 
              onChange={e => setForm({ ...form, is_active: e.target.checked })} 
            /> 
            <span>Active on public customer portal</span>
          </label>
          <div className="modal-actions full">
            <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="primary">{editing ? 'Save Changes' : 'Create Offer'}</button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export function Announcements() {
  const [rows, setRows] = useState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState();
  const [form, setForm] = useState({
    title: '',
    message: '',
    is_active: true
  });

  const load = () =>
    api
      .get('/content/announcements/')
      .then(r => setRows(Array.isArray(r.data) ? r.data : (r.data.results || [])))
      .catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', message: '', is_active: true });
    setOpen(true);
  };

  const openEdit = (ann) => {
    setEditing(ann);
    setForm({
      title: ann.title || '',
      message: ann.message || '',
      is_active: Boolean(ann.is_active)
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const body = {
      title: form.title.trim(),
      message: form.message.trim(),
      is_active: form.is_active
    };

    try {
      if (editing) {
        await api.put(`/content/announcements/${editing.id}/`, body);
        setToast({ message: 'Announcement updated.' });
      } else {
        await api.post('/content/announcements/', body);
        setToast({ message: 'Announcement published to club broadcast and member inboxes!' });
      }
      setOpen(false);
      load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Could not publish announcement.'
      });
    }
  };

  const toggleActive = async (ann) => {
    try {
      await api.delete(`/content/announcements/${ann.id}/`);
      setToast({ message: `Announcement ${ann.is_active ? 'deactivated' : 'activated'}.` });
      load();
    } catch (err) {
      setToast({ type: 'error', message: 'Could not toggle announcement status.' });
    }
  };

  if (!rows) return <Spinner />;

  return (
    <div>
      <Head 
        icon={Megaphone} 
        eyebrow="COMMUNICATION & BROADCAST" 
        title="Club Announcements" 
        text="Publish notices, weather closures, tournament schedules, and facility upgrades directly to active players." 
        onAdd={openCreate} 
        label="New Announcement" 
      />

      <div className="list">
        {rows.map(a => (
          <article className="item" key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '18px' }}>
            <div className="item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: '16px', color: 'var(--white)' }}>{a.title}</b>
                <p style={{ color: 'var(--white-soft)', margin: '6px 0 0 0', fontSize: '14px', lineHeight: 1.5 }}>
                  {a.message}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Status value={a.is_active ? 'ACTIVE' : 'INACTIVE'} />
                <button 
                  className="icon-btn" 
                  title="Edit Announcement"
                  onClick={() => openEdit(a)}
                >
                  <Edit3 size={15} />
                </button>
                <button 
                  className="icon-btn" 
                  title={a.is_active ? 'Deactivate' : 'Activate'}
                  onClick={() => toggleActive(a)}
                  style={{ color: a.is_active ? '#34d399' : 'var(--muted)' }}
                >
                  <Power size={15} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <small className="muted">
                Broadcast Date: {String(a.created_at).slice(0, 16).replace('T', ' ')}
              </small>
            </div>
          </article>
        ))}

        {!rows.length && (
          <div className="empty">
            <Megaphone size={32} />
            <b>No announcements published</b>
            <span>Post maintenance alerts, league announcements, and facility news here.</span>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Announcement" : "Publish Announcement"}>
        <form className="form-grid" onSubmit={save}>
          <Field 
            label="Announcement Title" 
            className="full"
            value={form.title} 
            onChange={e => setForm({ ...form, title: e.target.value })} 
            placeholder="e.g. Tournament-Grade LED Lighting Installed" 
            required 
          />
          <label className="field full">
            Notice Message
            <textarea 
              className="input textarea" 
              rows={4}
              value={form.message} 
              onChange={e => setForm({ ...form, message: e.target.value })} 
              placeholder="Provide details about facility upgrades, tournament dates, or match schedules..."
              required
            />
          </label>
          <label className="check full" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              checked={form.is_active} 
              onChange={e => setForm({ ...form, is_active: e.target.checked })} 
            /> 
            <span>Active & notify all registered members</span>
          </label>
          <div className="modal-actions full">
            <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="primary">{editing ? 'Save Changes' : 'Publish Broadcast'}</button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function Head({ icon: Icon, eyebrow, title, text, onAdd, label }) {
  return (
    <div className="page-head">
      <div>
        <small>{eyebrow}</small>
        <h1><Icon size={22} /> {title}</h1>
        <p>{text}</p>
      </div>
      <button className="primary" onClick={onAdd}><Plus size={16} /> {label}</button>
    </div>
  );
}

function Field({ label, className = '', ...p }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <input className="input" {...p} />
    </label>
  );
}
