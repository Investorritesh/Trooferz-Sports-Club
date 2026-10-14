import { useEffect, useState } from 'react';
import { Bell, Check, Clock3 } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/UI';
import { PageHead } from './Sports';

export default function Notifications() {
  const [rows, setRows] = useState();

  const load = () => api.get('/content/notifications').then(r => setRows(r.data));

  useEffect(load, []);

  const read = async id => {
    await api.put(`/content/notifications/${id}/read`);
    load();
  };

  if (!rows) return <Spinner />;

  return (
    <div className="inner-page-wrap">
      <PageHead eyebrow="INBOX" title="NOTIFICATIONS" text="Booking updates, club announcements and member alerts." />
      <div className="notifications">
        {rows.map(n => (
          <article className={`notification ${n.is_read ? 'read' : ''}`} key={n.id}>
            <div className="notice-icon"><Bell size={18} /></div>
            <div className="notice-copy">
              <b>{n.title}</b>
              <p>{n.message}</p>
              <small><Clock3 size={12} /> {new Date(n.created_at).toLocaleString('en-IN')}</small>
            </div>
            {!n.is_read && (
              <button className="btn-secondary-sm" onClick={() => read(n.id)}>
                <Check size={14} /> Mark Read
              </button>
            )}
          </article>
        ))}
        {!rows.length && (
          <div className="empty">
            <Bell size={32} />
            <b style={{ display: 'block', marginTop: '10px' }}>No notifications</b>
            <span>You're all caught up.</span>
          </div>
        )}
      </div>
    </div>
  );
}

