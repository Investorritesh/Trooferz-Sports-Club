import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, UserCircle, LogOut, Bell, Trophy, MapPin, Calendar, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserLayout() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 40;
      setScrolled(prev => (prev !== isScrolled ? isScrolled : prev));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isHome = location.pathname === '/';

  return (
    <div className="site-wrapper">
      {/* Top Navbar */}
      <header className={`navbar ${scrolled || !isHome ? 'navbar-scrolled' : 'navbar-transparent'}`}>
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <span className="brand-logo-mark">T</span>
            <div className="brand-text">
              <span className="brand-name">TROOFERZ</span>
              <span className="brand-sub">SPORTS CLUB • PUNE</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="nav-menu">
            <NavLink to="/sports" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              SPORTS
            </NavLink>
            <NavLink to="/facilities" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              FACILITIES
            </NavLink>
            <a href="/#about" className="nav-link">ABOUT</a>
            <a href="/#gallery" className="nav-link">GALLERY</a>
            <NavLink to="/membership" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              MEMBERSHIP
            </NavLink>
          </nav>

          {/* Right Actions */}
          <div className="navbar-actions">
            <Link to="/bookings" className="btn-cta-navbar">
              <span>BOOK NOW</span>
              <ArrowRight size={15} />
            </Link>

            {user ? (
              <div className="user-menu-rel">
                <button 
                  className="user-profile-btn" 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="User profile"
                >
                  <div className="user-avatar-badge">{user.full_name?.[0] || 'U'}</div>
                  <span className="user-name-label">{user.full_name?.split(' ')[0]}</span>
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown-menu">
                    <div className="user-dropdown-header">
                      <strong>{user.full_name}</strong>
                      <span>{user.email}</span>
                      <span className="badge-role">{user.role} MEMBER</span>
                    </div>
                    <div className="user-dropdown-links">
                      <Link to="/bookings" onClick={() => setUserMenuOpen(false)}>
                        <Calendar size={15} /> My Bookings
                      </Link>
                      <Link to="/notifications" onClick={() => setUserMenuOpen(false)}>
                        <Bell size={15} /> Notifications
                      </Link>
                      <Link to="/profile" onClick={() => setUserMenuOpen(false)}>
                        <UserCircle size={15} /> Edit Profile
                      </Link>
                      {user.role === 'ADMIN' && (
                        <Link to="/admin/dashboard" onClick={() => setUserMenuOpen(false)} className="admin-link">
                          <ShieldCheck size={15} /> Owner Console
                        </Link>
                      )}
                    </div>
                    <button onClick={handleLogout} className="dropdown-logout-btn">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-secondary-sm">
                LOG IN
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button 
              className="mobile-menu-toggle" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'drawer-open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="brand-text">
            <span className="brand-name">TROOFERZ</span>
            <span className="brand-sub">SPORTS CLUB BANER</span>
          </div>
          <button className="close-drawer" onClick={() => setMobileMenuOpen(false)}>
            <X size={28} />
          </button>
        </div>

        <nav className="mobile-drawer-nav">
          <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>HOME</NavLink>
          <NavLink to="/sports" onClick={() => setMobileMenuOpen(false)}>SPORTS</NavLink>
          <NavLink to="/facilities" onClick={() => setMobileMenuOpen(false)}>FACILITIES</NavLink>
          <a href="/#about" onClick={() => setMobileMenuOpen(false)}>ABOUT CLUB</a>
          <a href="/#gallery" onClick={() => setMobileMenuOpen(false)}>GALLERY</a>
          <NavLink to="/membership" onClick={() => setMobileMenuOpen(false)}>MEMBERSHIP</NavLink>
          {user ? (
            <>
              <NavLink to="/bookings" onClick={() => setMobileMenuOpen(false)}>MY BOOKINGS</NavLink>
              <NavLink to="/notifications" onClick={() => setMobileMenuOpen(false)}>NOTIFICATIONS</NavLink>
              <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)}>MY PROFILE</NavLink>
              {user.role === 'ADMIN' && (
                <NavLink to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)}>ADMIN CONSOLE</NavLink>
              )}
            </>
          ) : (
            <NavLink to="/login" onClick={() => setMobileMenuOpen(false)}>LOG IN / REGISTER</NavLink>
          )}
        </nav>

        <div className="mobile-drawer-footer">
          <Link to="/bookings" className="btn-primary-block" onClick={() => setMobileMenuOpen(false)}>
            BOOK A COURT NOW <ArrowRight size={18} />
          </Link>
          {user && (
            <button onClick={handleLogout} className="mobile-logout-btn">
              <LogOut size={16} /> Sign Out ({user.full_name})
            </button>
          )}
        </div>
      </div>
      {mobileMenuOpen && <div className="drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main Page Outlet */}
      <main className="main-content-wrap">
        <Outlet />
      </main>

      {/* Sticky Mobile Booking Button */}
      <div className="sticky-mobile-booking-bar">
        <Link to="/bookings" className="sticky-booking-btn">
          <span>BOOK YOUR GAME</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

