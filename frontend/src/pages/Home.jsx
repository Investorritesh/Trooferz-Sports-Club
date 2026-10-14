import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Users, 
  Trophy, 
  Sparkles, 
  Mail, 
  Phone, 
  Instagram, 
  Facebook, 
  Youtube, 
  ChevronRight,
  Flame,
  Zap,
  CheckCircle2,
  Quote
} from 'lucide-react';
import api from '../services/api';
import { money } from '../utils/ui';

export default function Home() {
  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [content, setContent] = useState({ offers: [], announcements: [] });
  const [activeFacilityIndex, setActiveFacilityIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/sports'),
      api.get('/facilities').catch(() => ({ data: [] })),
      api.get('/content/public').catch(() => ({ data: { offers: [], announcements: [] } }))
    ]).then(([s, f, c]) => {
      if (s.data) setSports(s.data.filter(x => x.is_active));
      if (f.data) setFacilities(f.data.filter(x => x.is_active));
      if (c.data) setContent(c.data);
    }).catch(err => {
      console.warn("API fallback mode active", err);
    });
  }, []);

  // Default facilities for editorial preview if API returns subset
  const displayFacilities = facilities.length ? facilities : [
    {
      id: 1,
      name: 'ARENA 1 - PREMIUM FOOTBALL TURF',
      description: 'FIFA-grade 40mm artificial turf surface with high-density shock pad, under-turf drainage and night stadium floodlights.',
      image_url: '/football-court.jpg',
      sport_name: 'FOOTBALL & TURF',
      capacity: '10-14 Players',
      price: 1500
    },
    {
      id: 2,
      name: 'ARENA 2 - ENCLOSED BOX CRICKET',
      description: 'Custom rebound netting system, seamless carpet grass, professional LED floodlighting and tournament crease boundary.',
      image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80',
      sport_name: 'BOX CRICKET',
      capacity: '12-16 Players',
      price: 1200
    },
    {
      id: 3,
      name: 'COURT 3 - PICKLEBALL ARENA',
      description: 'Dedicated professional pickleball court with Selkirk paddles, outdoor net system and non-slip hard court surface.',
      image_url: '/pickleball-court.jpg',
      sport_name: 'PICKLEBALL',
      capacity: '2-4 Players',
      price: 600
    },
    {
      id: 4,
      name: 'PRO BADMINTON COURTS',
      description: 'BWF-standard wooden flooring topped with 4.5mm synthetic matting for ideal traction and reduced knee impact.',
      image_url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
      sport_name: 'BADMINTON',
      capacity: '2-4 Players',
      price: 600
    },
    {
      id: 5,
      name: 'ALL-WEATHER TENNIS COURT',
      description: 'Acrylic hard court surface engineered for true ball bounce and high durability under intense competitive play.',
      image_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80',
      sport_name: 'TENNIS',
      capacity: '2-4 Players',
      price: 900
    }
  ];


  const currentFacility = displayFacilities[activeFacilityIndex] || displayFacilities[0];

  // Upcomings fixtures mock/data
  const upcomingFixtures = [
    { id: 1, date: 'SAT 04 OCT', sport: 'FOOTBALL 7v7', facility: 'ARENA TURF A', time: '08:00 PM', price: '₹1,500' },
    { id: 2, date: 'SUN 05 OCT', sport: 'BOX CRICKET TOURNAMENT', facility: 'BOX ARENA 01', time: '06:00 PM', price: '₹1,200' },
    { id: 3, date: 'WED 08 OCT', sport: 'TENNIS NIGHT DOUBLES', facility: 'COURT A', time: '07:30 PM', price: '₹900' },
    { id: 4, date: 'FRI 10 OCT', sport: 'BADMINTON SPEED LEAGUE', facility: 'INDOOR MAT 02', time: '05:00 PM', price: '₹600' }
  ];

  // Gallery items
  const galleryImages = [
    { url: '/football-court.jpg', tag: 'FOOTBALL NIGHTS' },
    { url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80', tag: 'TENNIS MATCHDAY' },
    { url: '/pickleball-court.jpg', tag: 'PICKLEBALL COURTS' },
    { url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80', tag: 'TRAINING & ATHLETICS' },
    { url: '/football-court.jpg', tag: 'MATCH WINNERS' }
  ];

  return (
    <div className="home-page-brand">
      
      {/* 8. HERO SECTION */}
      <section className="hero-hero-fullscreen">
        <div className="hero-bg-overlay" />
        <div 
          className="hero-bg-image" 
          style={{ backgroundImage: `url('/hero-bg.jpg')` }}
        />

        
        <div className="hero-container">
          <div className="hero-eyebrow-location">
            <span className="location-dot" />
            <span>TROOFERZ SPORTS CLUB PUNE • MAHARASHTRA</span>
          </div>

          <h1 className="hero-title-main">
            PLAY.<br />
            COMPETE.<br />
            BELONG.
          </h1>

          <p className="hero-subtitle">
            Your ultimate sports destination. Premium turf, all-weather courts and a high-energy community built for Pune’s finest athletes.
          </p>

          <div className="hero-button-group">
            <Link to="/bookings" className="btn-hero-primary">
              <span>BOOK A COURT</span>
              <ArrowRight size={18} className="btn-arrow" />
            </Link>
            <a href="#sports" className="btn-hero-secondary">
              <span>EXPLORE CLUB</span>
              <span className="down-arrow">↓</span>
            </a>
          </div>

          <div className="hero-scroll-indicator">
            <span>SCROLL TO EXPLORE ↓</span>
          </div>
        </div>
      </section>

      {/* 10. SPORTS SECTION ("WHAT DO YOU PLAY?") */}
      <section id="sports" className="sports-editorial-section">
        <div className="section-header-brand">
          <div className="header-meta">
            <span className="eyebrow-accent">CATEGORY SELECT</span>
            <h2 className="heading-huge">WHAT DO YOU PLAY?</h2>
            <p className="subheading-text">Choose your game. Bring your team. Play on world-class surfaces.</p>
          </div>
          <Link to="/sports" className="text-link-accent">
            ALL SPORTS <ArrowUpRight size={16} />
          </Link>
        </div>

        {/* 11. SPORTS GRID LAYOUT (Asymmetric CSS Grid) */}
        <div className="sports-asymmetric-grid">
          {/* Card 1: Football */}
          <div 
            className="sport-card-brand card-football"
            onClick={() => navigate('/bookings')}
          >
            <img src="/football-court.jpg" alt="Football" />
            <div className="card-gradient-overlay" />
            <div className="card-content-wrap">
              <span className="sport-badge">7v7 & 5v5 ARENA</span>
              <h3 className="sport-title">FOOTBALL</h3>
              <div className="sport-card-footer">
                <span className="sport-price">From ₹1,500 / hr</span>
                <span className="sport-arrow">→</span>
              </div>
            </div>
            <div className="hover-accent-line" />
          </div>

          {/* Card 2: Cricket */}
          <div 
            className="sport-card-brand card-cricket"
            onClick={() => navigate('/bookings')}
          >
            <img src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1000&q=80" alt="Cricket" />
            <div className="card-gradient-overlay" />
            <div className="card-content-wrap">
              <span className="sport-badge">LEATHER & TURF</span>
              <h3 className="sport-title">CRICKET</h3>
              <div className="sport-card-footer">
                <span className="sport-price">From ₹1,200 / hr</span>
                <span className="sport-arrow">→</span>
              </div>
            </div>
            <div className="hover-accent-line" />
          </div>

          {/* Card 3: Box Cricket */}
          <div 
            className="sport-card-brand card-box-cricket"
            onClick={() => navigate('/bookings')}
          >
            <img src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1000&q=80" alt="Box Cricket" />
            <div className="card-gradient-overlay" />
            <div className="card-content-wrap">
              <span className="sport-badge">HIGH ENERGY ARENA</span>
              <h3 className="sport-title">BOX CRICKET</h3>
              <div className="sport-card-footer">
                <span className="sport-price">From ₹1,200 / hr</span>
                <span className="sport-arrow">→</span>
              </div>
            </div>
            <div className="hover-accent-line" />
          </div>

          {/* Card 4: Badminton */}
          <div 
            className="sport-card-brand card-badminton"
            onClick={() => navigate('/bookings')}
          >
            <img src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80" alt="Badminton" />
            <div className="card-gradient-overlay" />
            <div className="card-content-wrap">
              <span className="sport-badge">BWF APPROVED MATS</span>
              <h3 className="sport-title">BADMINTON</h3>
              <div className="sport-card-footer">
                <span className="sport-price">From ₹600 / hr</span>
                <span className="sport-arrow">→</span>
              </div>
            </div>
            <div className="hover-accent-line" />
          </div>

          {/* Card 5: Tennis */}
          <div 
            className="sport-card-brand card-tennis"
            onClick={() => navigate('/bookings')}
          >
            <img src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1000&q=80" alt="Tennis" />
            <div className="card-gradient-overlay" />
            <div className="card-content-wrap">
              <span className="sport-badge">ALL-WEATHER HARD COURT</span>
              <h3 className="sport-title">TENNIS</h3>
              <div className="sport-card-footer">
                <span className="sport-price">From ₹900 / hr</span>
                <span className="sport-arrow">→</span>
              </div>
            </div>
            <div className="hover-accent-line" />
          </div>

          {/* Card 6: Pickleball */}
          <div 
            className="sport-card-brand card-fitness"
            onClick={() => navigate('/bookings')}
          >
            <img src="/pickleball-court.jpg" alt="Pickleball" />
            <div className="card-gradient-overlay" />
            <div className="card-content-wrap">
              <span className="sport-badge">OUTDOOR HARD COURT</span>
              <h3 className="sport-title">PICKLEBALL</h3>
              <div className="sport-card-footer">
                <span className="sport-price">From ₹600 / hr</span>
                <span className="sport-arrow">→</span>
              </div>
            </div>
            <div className="hover-accent-line" />
          </div>

        </div>
      </section>

      {/* 12. FACILITIES SECTION */}
      <section id="facilities" className="facilities-editorial-section">
        <div className="section-header-brand">
          <div className="header-meta">
            <span className="eyebrow-accent">INFRASTRUCTURE</span>
            <h2 className="heading-huge">PREMIUM FACILITIES. BUILT FOR THE GAME.</h2>
          </div>
        </div>

        <div className="facilities-interactive-split">
          {/* Left: Dynamic Preview Image with Smooth Cross-Fade */}
          <div className="facility-preview-viewport">
            {displayFacilities.map((fac, idx) => (
              <img
                key={fac.id || idx}
                src={fac.image_url}
                alt={fac.name}
                className={`facility-slide-img ${activeFacilityIndex === idx ? 'active' : ''}`}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = (fac.name && fac.name.toLowerCase().includes('pickleball')) ? '/pickleball-court.jpg' : '/football-court.jpg';
                }}
              />
            ))}
            <div className="facility-preview-overlay" />
            <div className="facility-preview-caption">
              <span className="facility-num">0{activeFacilityIndex + 1}</span>
              <div className="facility-meta">
                <span className="facility-tag">{currentFacility.sport_name}</span>
                <h4>{currentFacility.name}</h4>
                <p>{currentFacility.description}</p>
                <Link to="/facilities" className="facility-link-btn">
                  <span>EXPLORE FACILITY</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Interactive List */}
          <div className="facilities-numbered-list">
            {displayFacilities.map((fac, idx) => (
              <div
                key={fac.id || idx}
                className={`facility-item-row ${activeFacilityIndex === idx ? 'active' : ''}`}
                onClick={() => setActiveFacilityIndex(idx)}
              >

                <div className="item-num">0{idx + 1}</div>
                <div className="item-text">
                  <h3>{fac.name}</h3>
                  <p>{fac.description}</p>
                </div>
                <div className="item-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14. UPCOMING GAMES SECTION */}
      <section className="upcoming-fixtures-section">
        <div className="section-header-brand">
          <div className="header-meta">
            <span className="eyebrow-accent">LIVE CALENDAR</span>
            <h2 className="heading-huge">UPCOMING FIXTURES & SESSIONS</h2>
          </div>
          <Link to="/bookings" className="text-link-accent">
            RESERVE SLOT <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="fixtures-list-container">
          {upcomingFixtures.map((fix) => (
            <div key={fix.id} className="fixture-row-card">
              <div className="fixture-date-badge">
                <Calendar size={14} />
                <span>{fix.date}</span>
              </div>
              <div className="fixture-sport">
                <strong>{fix.sport}</strong>
                <span>{fix.facility}</span>
              </div>
              <div className="fixture-time">
                <Clock size={14} />
                <span>{fix.time}</span>
              </div>
              <div className="fixture-action">
                <Link to="/bookings" className="btn-fixture-book">
                  <span>BOOK NOW</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 17. STATS SECTION */}
      <section className="stats-numerical-section">
        <div className="stats-grid-brand">
          <div className="stat-box">
            <span className="stat-number">10+</span>
            <span className="stat-label">SPORTS COURTS</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">500+</span>
            <span className="stat-label">ACTIVE PLAYERS</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">1000+</span>
            <span className="stat-label">GAMES COMPLETED</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">24/7</span>
            <span className="stat-label">SPORTS ENERGY</span>
          </div>
        </div>
      </section>

      {/* 16. ABOUT / COMMUNITY SECTION */}
      <section id="about" className="about-editorial-section">
        <div className="about-asymmetric-wrapper">
          <div className="about-text-column">
            <span className="eyebrow-accent">THE TROOFERZ PHILOSOPHY</span>
            <h2 className="heading-huge">MORE THAN A SPORTS CLUB.</h2>
            <p className="about-lead">
              Trooferz is built for people who don't just watch the game — they play it. Whether you're here for intense competition, fitness or your next weekend match with friends, Trooferz gives you the space to elevate your play.
            </p>
            <p className="about-body">
              Located in Baner, Pune, our facility pairs tournament-grade artificial turfs and all-weather courts with modern floodlighting, digital booking frictionlessness, and a passionate athletic community.
            </p>

            <div className="about-highlights-grid">
              <div className="about-feature">
                <Zap className="feature-icon" size={20} />
                <div>
                  <strong>Tournament Grade</strong>
                  <span>BWF & FIFA certified court specifications.</span>
                </div>
              </div>
              <div className="about-feature">
                <ShieldCheck className="feature-icon" size={20} />
                <div>
                  <strong>Instant Reservation</strong>
                  <span>Live availability directly synced to court schedule.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="about-image-column">
            <div className="about-image-frame">
              <img src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1000&q=80" alt="Trooferz Club Life" />
              <div className="image-badge-tag">
                <MapPin size={14} />
                <span>BANER, PUNE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 18. INSTAGRAM / GALLERY SECTION */}
      <section id="gallery" className="gallery-masonry-section">
        <div className="section-header-brand">
          <div className="header-meta">
            <span className="eyebrow-accent">ATMOSPHERE</span>
            <h2 className="heading-huge">GAME DAY. EVERY DAY.</h2>
          </div>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-link-accent">
            @TROOFERZ FOLLOW THE GAME <Instagram size={16} />
          </a>
        </div>

        <div className="gallery-masonry-grid">
          {galleryImages.map((img, idx) => (
            <div key={idx} className={`gallery-item item-${idx}`}>
              <img 
                src={img.url} 
                alt={img.tag} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = img.tag.toLowerCase().includes('pickleball') ? '/pickleball-court.jpg' : '/football-court.jpg';
                }}
              />
              <div className="gallery-hover-overlay">
                <Instagram size={24} className="insta-icon" />
                <span className="gallery-tag">{img.tag}</span>
                <span className="view-btn">VIEW MATCH</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 19. TESTIMONIAL SECTION */}
      <section className="testimonials-brand-section">
        <div className="testimonial-container">
          <Quote size={40} className="quote-mark" />
          <blockquote className="testimonial-quote">
            “Great turf, great atmosphere, and the whole experience feels premium. Booking a slot takes under 10 seconds.”
          </blockquote>
          <div className="testimonial-author">
            <strong>ROHAN DESHMUKH</strong>
            <span>CAPTAIN, BANER FOOTBALL CLUB</span>
          </div>
        </div>
      </section>

      {/* 15. BOOKING CONVERSION SECTION */}
      <section className="booking-conversion-banner">
        <div className="conversion-bg-overlay" />
        <div 
          className="conversion-bg-image" 
          style={{ backgroundImage: `url('/hero-bg.jpg')` }}
        />

        <div className="conversion-content">
          <span className="eyebrow-accent">RESERVE YOUR TIME</span>
          <h2 className="heading-huge">YOUR NEXT GAME STARTS HERE.</h2>
          <p>Choose your sport. Pick your time. Bring your team.</p>
          <Link to="/bookings" className="btn-conversion-primary">
            <span>BOOK NOW</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* 20. FINAL CTA */}
      <section className="final-cta-section">
        <div className="final-cta-content">
          <h2 className="final-title">READY TO PLAY?</h2>
          <p className="final-sub">Your next game is waiting on the turf.</p>
          <Link to="/bookings" className="btn-hero-primary">
            <span>BOOK YOUR GAME</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* 21. FOOTER */}
      <footer className="footer-brand">
        <div className="footer-container">
          <div className="footer-col brand-col">
            <Link to="/" className="navbar-brand">
              <span className="brand-logo-mark">T</span>
              <div className="brand-text">
                <span className="brand-name">TROOFERZ</span>
                <span className="brand-sub">SPORTS CLUB</span>
              </div>
            </Link>
            <p className="footer-tagline">PLAY. COMPETE. BELONG.</p>
            <p className="footer-desc">
              Pune’s premier sports club destination for football, box cricket, badminton, tennis and functional training.
            </p>
          </div>

          <div className="footer-col">
            <h4>SPORTS</h4>
            <ul>
              <li><Link to="/sports">Football 7v7</Link></li>
              <li><Link to="/sports">Leather Cricket</Link></li>
              <li><Link to="/sports">Box Cricket</Link></li>
              <li><Link to="/sports">Badminton</Link></li>
              <li><Link to="/sports">Tennis Courts</Link></li>
              <li><Link to="/sports">Fitness & Conditioning</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>CLUB</h4>
            <ul>
              <li><a href="#about">About Trooferz</a></li>
              <li><Link to="/facilities">Facilities</Link></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><Link to="/membership">Membership</Link></li>
              <li><Link to="/bookings">Book Court</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>CONTACT</h4>
            <div className="contact-details">
              <p><MapPin size={14} /> Baner Road, Baner, Pune, Maharashtra 411045</p>
              <p><Phone size={14} /> +91 98765 43210</p>
              <p><Mail size={14} /> play@trooferzsports.com</p>
            </div>
          </div>

          <div className="footer-col">
            <h4>SOCIAL</h4>
            <div className="social-links">
              <a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={18} /> Instagram</a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer"><Facebook size={18} /> Facebook</a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer"><Youtube size={18} /> YouTube</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span>© 2026 TROOFERZ SPORTS CLUB. ALL RIGHTS RESERVED.</span>
          <div className="footer-bottom-links">
            <a href="#privacy">PRIVACY POLICY</a>
            <a href="#terms">TERMS OF SERVICE</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

