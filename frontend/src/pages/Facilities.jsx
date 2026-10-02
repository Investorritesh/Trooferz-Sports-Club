import { useEffect, useState } from 'react';
import { ArrowUpRight, MapPinned, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { money } from '../utils/ui';
import { Spinner } from '../components/UI';
import { PageHead } from './Sports';

export default function Facilities() {
  const [data, setData] = useState();

  useEffect(() => {
    api.get('/facilities').then(r => setData(r.data.filter(f => f.is_active)));
  }, []);

  if (!data) return <Spinner />;

  return (
    <div className="inner-page-wrap">
      <PageHead 
        eyebrow="FACILITIES & COURTS" 
        title="BUILT FOR THE GAME" 
        text="Every court is engineered for maximum performance, featuring tournament-grade surfaces, LED lighting and real-time scheduling."
        action={
          <Link className="btn-hero-primary" to="/bookings">
            <span>CHECK AVAILABILITY</span> <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="facilities">
        {data.map(f => (
          <article className="facility" key={f.id}>
            <img 
              src={f.image_url || (f.name.toLowerCase().includes('pickleball') ? '/pickleball-court.jpg' : '/football-court.jpg')} 
              alt={f.name} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = f.name.toLowerCase().includes('pickleball') ? '/pickleball-court.jpg' : '/football-court.jpg';
              }}
            />
            <div>
              <div className="facility-top">
                <span className="facility-tag">{f.sport_name}</span>
              </div>
              <h3>{f.name}</h3>
              <p>{f.description}</p>
              <footer>
                <span><Users size={14} /> Capacity: {f.capacity}</span>
                <strong>{money(f.price)} / hr</strong>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

