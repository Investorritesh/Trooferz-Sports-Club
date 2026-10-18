import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Trophy, 
  MapPinned, 
  Clock3, 
  BadgeCheck, 
  Tag, 
  Megaphone, 
  BarChart3, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Briefcase, 
  Menu, 
  X,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const items = [
  ['/admin/dashboard', 'Dashboard', LayoutDashboard],
  ['/admin/users', 'Users', Users],
  ['/admin/bookings', 'Bookings', CalendarCheck],
  ['/admin/sports', 'Sports', Trophy],
  ['/admin/facilities', 'Facilities', MapPinned],
  ['/admin/slots', 'Time Slots', Clock3],
  ['/admin/memberships', 'Memberships', BadgeCheck],
  ['/admin/offers', 'Offers', Tag],
  ['/admin/announcements', 'Announcements', Megaphone],
  ['/admin/reports', 'Reports', BarChart3],
  ['/admin/settings', 'Settings', Settings]
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const isStaff = user?.role === 'STAFF';
  const roleTitle = isStaff ? 'STAFF DESK' : 'OWNER CONSOLE';
  const roleLabel = isStaff ? 'STAFF' : 'ADMIN';

  const out = () => {
    logout();
    nav(isStaff ? '/staff/login' : '/admin/login');
  };

  return (
    <div className="shell">
      <aside className={`sidebar admin ${open ? 'show' : ''}`}>
        <div className="brand">
          <div className="logo blue">T</div>
          <div>
            <b>Trooferz</b>
            <span>{roleTitle}</span>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="owner">
          {isStaff ? <Briefcase size={17} style={{ color: '#34d399' }} /> : <ShieldCheck size={17} style={{ color: '#fbbf24' }} />}
          <div>
            <b>{isStaff ? 'Staff Operations' : 'Owner Access'}</b>
            <span>{isStaff ? 'Turf & Booking Desk' : 'Full Club Control'}</span>
          </div>
        </div>

        <nav>
          {items.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a 
            href="/" 
            target="_blank" 
            rel="noreferrer" 
            className="dropdown-logout-btn" 
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', padding: '10px 14px', fontSize: '13px' }}
          >
            <ExternalLink size={15} />
            <span>View Public Site</span>
          </a>
          <button className="logout" onClick={out}>
            <LogOut size={18} /> Logout ({user?.full_name?.split(' ')[0] || roleLabel})
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div>
            <small>{roleTitle}</small>
            <h2>{isStaff ? 'Matchday & Turf Operations' : 'Executive Club Operations'}</h2>
          </div>
          <div className="admin-pill" style={{ borderColor: isStaff ? '#10b981' : '#f59e0b', color: isStaff ? '#34d399' : '#fbbf24' }}>
            {roleLabel} &bull; {user?.full_name || 'Authorized'}
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}
