import { useEffect, useState } from 'react';
import { BadgeCheck, Check, Clock3, Sparkles } from 'lucide-react';
import api from '../services/api';
import { dateLabel, money } from '../utils/ui';
import { Spinner, Status, Toast } from '../components/UI';
import { PageHead } from './Sports';

export default function Membership() {
  const [plans, setPlans] = useState();
  const [mine, setMine] = useState([]);
  const [toast, setToast] = useState();

  const load = () => Promise.all([api.get('/memberships/plans'), api.get('/memberships/mine')]).then(([p, m]) => {
    setPlans(p.data);
    setMine(m.data);
  });

  useEffect(load, []);

  const activate = async id => {
    try {
      await api.post('/memberships/activate', { planId: id });
      setToast({ message: 'Membership plan activated.' });
      load();
    } catch (e) {
      setToast({ type: 'error', message: e.response?.data?.message || 'Activation failed.' });
    }
  };

  if (!plans) return <Spinner />;

  return (
    <div className="inner-page-wrap">
      <PageHead 
        eyebrow="CLUB MEMBERSHIP" 
        title="JOIN THE CLUB" 
        text="Elevate your experience with priority court reservations, discounted rates and guest passes."
      />
      {mine[0] && (
        <div className="active-membership" style={{ background: 'var(--card)', border: '1px solid var(--accent)', padding: '24px', borderRadius: '4px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="membership-icon" style={{ background: 'var(--accent)', color: 'var(--black)', padding: '12px', borderRadius: '4px' }}>
            <BadgeCheck size={28} />
          </div>
          <div>
            <small className="eyebrow-accent">CURRENT ACTIVE MEMBERSHIP</small>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', margin: '4px 0', textTransform: 'uppercase' }}>{mine[0].plan_name}</h3>
            <p style={{ color: 'var(--muted)', margin: 0 }}>Valid: {dateLabel(mine[0].start_date)} → {dateLabel(mine[0].end_date)}</p>
          </div>
        </div>
      )}
      <div className="plans">
        {plans.map((p, i) => (
          <article className={`plan ${i === 1 ? 'featured' : ''}`} key={p.id}>
            {i === 1 && <span className="popular">MOST POPULAR</span>}
            <Sparkles size={24} style={{ color: 'var(--accent)' }} />
            <h3>{p.name}</h3>
            <div className="price">{money(p.price)}<small style={{ color: 'var(--muted)', fontSize: '13px' }}> / {p.duration_days >= 365 ? 'year' : `${p.duration_days / 30} mo`}</small></div>
            <div className="benefits">
              {p.benefits.split('\n').map((x, j) => (
                <span key={j}><Check size={16} />{x}</span>
              ))}
            </div>
            <button className="btn-cta-navbar" style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }} onClick={() => activate(p.id)}>
              ACTIVATE PLAN
            </button>
          </article>
        ))}
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

