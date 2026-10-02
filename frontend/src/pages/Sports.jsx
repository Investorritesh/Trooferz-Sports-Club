import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock3, Dumbbell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { money } from '../utils/ui';
import { Spinner } from '../components/UI';

export default function Sports() {
  const [data, setData] = useState();

  useEffect(() => {
    api.get('/sports').then(r => setData(r.data.filter(s => s.is_active)));
  }, []);

  if (!data) return <Spinner />;

  return (
    <div className="inner-page-wrap">
      <PageHead 
        eyebrow="DISCOVER SPORTS" 
        title="CHOOSE YOUR GAME" 
        text="From quick 5v5 doubles to full 11v11 arena sessions, pick the format that fits your play style today."
        action={
          <Link className="btn-hero-primary" to="/bookings">
            <span>BOOK NOW</span> <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="catalog">
        {data.map(s => (
          <article className="catalog-card" key={s.id}>
            <div className="catalog-img">
              <img 
                src={s.image_url || (s.name.toLowerCase().includes('pickleball') ? '/pickleball-court.jpg' : '/football-court.jpg')} 
                alt={s.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = s.name.toLowerCase().includes('pickleball') ? '/pickleball-court.jpg' : '/football-court.jpg';
                }}
              />
              <span>{s.duration_minutes} MIN SESSION</span>
            </div>
            <div className="catalog-body">
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <footer>
                <strong>{money(s.price)}</strong>
                <Link to="/bookings" className="text-link-accent">
                  RESERVE <ArrowUpRight size={14} />
                </Link>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PageHead({ eyebrow, title, text, action }) {
  return (
    <div className="page-head">
      <div>
        <small className="eyebrow-accent">{eyebrow}</small>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}

