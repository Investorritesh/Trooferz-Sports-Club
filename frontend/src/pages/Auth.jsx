import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  LockKeyhole, 
  Mail, 
  Phone, 
  UserRound, 
  ShieldCheck, 
  Briefcase, 
  Trophy, 
  Sparkles, 
  CheckCircle2,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/UI';

const ROLE_CONFIGS = {
  ADMIN: {
    id: 'ADMIN',
    tabLabel: 'Administrator',
    icon: ShieldCheck,
    colorClass: 'role-admin',
    eyebrow: 'EXECUTIVE CONSOLE',
    headline: 'ADMINISTRATOR LOGIN',
    subtext: 'Private access for Club Owners, Directors & System Administrators.',
    artTitle: 'EXECUTIVE CONTROL',
    artSub: 'Master control over revenue, court schedules, staff permissions, and club analytics.',
    artEyebrow: 'BANER • PUNE • MANAGEMENT',
    demoEmail: 'admin@trooferz.com',
    demoPass: 'Admin@123',
    demoLabel: 'Demo Admin Account',
    redirectPath: '/admin/dashboard',
    badgeText: 'Full System Control',
    infoText: 'Administrator privileges are required. Grants unrestricted access to revenue reports, user directories, facility management, and system settings.',
  },
  STAFF: {
    id: 'STAFF',
    tabLabel: 'Staff Member',
    icon: Briefcase,
    colorClass: 'role-staff',
    eyebrow: 'OPERATIONS DESK',
    headline: 'STAFF MEMBER LOGIN',
    subtext: 'Front desk operations, player check-in, court schedule management & equipment.',
    artTitle: 'MATCHDAY & TURF DESK',
    artSub: 'Real-time turf reservations, court check-ins, walk-in matches, and equipment coordination.',
    artEyebrow: 'BANER • PUNE • OPERATIONS',
    demoEmail: 'staff@trooferz.com',
    demoPass: 'Staff@123',
    demoLabel: 'Demo Staff Account',
    redirectPath: '/admin/dashboard',
    badgeText: 'Front Desk Operations',
    infoText: 'Staff privileges required. Authorized to check in players, manage daily turf bookings, schedule slots, and assist walk-in players.',
  },
  MEMBER: {
    id: 'MEMBER',
    tabLabel: 'Regular Member',
    icon: Trophy,
    colorClass: 'role-member',
    eyebrow: 'ATHLETE LOUNGE',
    headline: 'MEMBER LOGIN',
    subtext: 'Sign in to reserve premium courts, manage memberships, and reload your wallet.',
    artTitle: 'PLAY. COMPETE. BELONG.',
    artSub: 'Book FIFA turfs, BWF badminton courts, tennis arenas, and manage your sport memberships.',
    artEyebrow: 'BANER • PUNE • SPORTS CLUB',
    demoEmail: 'member@trooferz.com',
    demoPass: 'Member@123',
    demoLabel: 'Demo Member Account',
    redirectPath: '/',
    badgeText: 'Court Booking & Wallet',
    infoText: 'For all registered athletes and club members. Access online turf bookings, match history, loyalty discounts, and wallet balances.',
  },
};

function Shell({ role = 'MEMBER', children }) {
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.MEMBER;

  return (
    <div className="auth">
      <div className="auth-art">
        <div className="auth-brand">
          <Link to="/" className="navbar-brand">
            <span className="brand-logo-mark">T</span>
            <div className="brand-text">
              <span className="brand-name">TROOFERZ</span>
              <span className="brand-sub">SPORTS CLUB</span>
            </div>
          </Link>
        </div>
        <div className="auth-center">
          <small className="eyebrow-accent">{config.artEyebrow}</small>
          <h1>{config.artTitle}</h1>
          <p>{config.artSub}</p>
        </div>
      </div>
      <div className="auth-panel">{children}</div>
    </div>
  );
}

function Field({ label, icon: Icon, ...p }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div style={{ position: 'relative' }}>
        <input {...p} style={{ width: '100%', paddingLeft: Icon ? '40px' : '14px' }} />
        {Icon && (
          <Icon 
            size={16} 
            style={{ 
              position: 'absolute', 
              left: '14px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--muted)',
              pointerEvents: 'none'
            }} 
          />
        )}
      </div>
    </label>
  );
}

function RoleTabs({ activeRole, onSelectRole }) {
  return (
    <div className="role-tabs-container">
      <div className="role-tabs-header-label">SELECT LOGIN METHOD / ROLE:</div>
      <div className="role-tabs-grid">
        {Object.values(ROLE_CONFIGS).map(cfg => {
          const Icon = cfg.icon;
          const isActive = activeRole === cfg.id;
          return (
            <button
              key={cfg.id}
              type="button"
              className={`role-tab-btn ${isActive ? `active ${cfg.colorClass}` : ''}`}
              onClick={() => onSelectRole(cfg.id)}
            >
              <Icon size={18} />
              <span>{cfg.tabLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DemoQuickFill({ config, onFill }) {
  return (
    <div className="demo-credentials-card">
      <div className="demo-cred-info">
        <strong>
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          {config.demoLabel}
        </strong>
        <span>{config.demoEmail} &bull; {config.demoPass}</span>
      </div>
      <button
        type="button"
        className="btn-autofill-demo"
        onClick={() => onFill(config.demoEmail, config.demoPass)}
      >
        <span>⚡ Quick Fill</span>
      </button>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine role from query param ?role=admin | staff | member, default to MEMBER
  const paramRole = (searchParams.get('role') || 'MEMBER').toUpperCase();
  const initialRole = ROLE_CONFIGS[paramRole] ? paramRole : 'MEMBER';

  const [activeRole, setActiveRole] = useState(initialRole);
  const [form, setForm] = useState({ email: '', password: '' });
  const [toast, setToast] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('role')) {
      const r = searchParams.get('role').toUpperCase();
      if (ROLE_CONFIGS[r]) {
        setActiveRole(r);
      }
    }
  }, [searchParams]);

  const config = ROLE_CONFIGS[activeRole];

  const handleSelectRole = (newRole) => {
    setActiveRole(newRole);
    setSearchParams({ role: newRole.toLowerCase() });
    setForm({ email: '', password: '' });
  };

  const handleFillDemo = (email, password) => {
    setForm({ email, password });
    setToast({ type: 'success', message: `Filled credentials for ${config.tabLabel}.` });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await login(form, activeRole);
      setToast({ type: 'success', message: `Welcome back, ${user.full_name || user.email}!` });
      setTimeout(() => {
        if (user.role === 'ADMIN' || user.role === 'STAFF') {
          nav('/admin/dashboard');
        } else {
          nav('/');
        }
      }, 500);
    } catch (err) {
      setToast({ 
        type: 'error', 
        message: err.response?.data?.message || err.message || 'Login failed. Please verify credentials.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell role={activeRole}>
      <div className="auth-form">
        {/* 3-Role Method Selector Tabs */}
        <RoleTabs activeRole={activeRole} onSelectRole={handleSelectRole} />

        <small className="eyebrow-accent">{config.eyebrow}</small>
        <h2>{config.headline}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '16px', fontSize: '13px' }}>
          {config.subtext}
        </p>

        {/* Role Privileges Banner */}
        <div className={`role-info-card ${config.colorClass}`}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{config.infoText}</span>
        </div>

        {/* 1-Click Demo Auto-fill */}
        <DemoQuickFill config={config} onFill={handleFillDemo} />

        <form onSubmit={handleSubmit}>
          <Field 
            label="EMAIL ADDRESS" 
            type="email" 
            icon={Mail}
            placeholder={config.demoEmail}
            value={form.email} 
            onChange={e => setForm({ ...form, email: e.target.value })} 
            required 
          />
          <Field 
            label="PASSWORD" 
            type="password" 
            icon={LockKeyhole}
            placeholder="••••••••"
            value={form.password} 
            onChange={e => setForm({ ...form, password: e.target.value })} 
            required 
          />
          <button 
            type="submit"
            className="btn-hero-primary" 
            disabled={isSubmitting}
            style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
          >
            <span>{isSubmitting ? 'AUTHENTICATING...' : `SIGN IN AS ${config.id}`}</span> 
            <ArrowRight size={18} />
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginTop: '20px' }}>
          New athlete or player? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: '700' }}>Create a Club Account</Link>
        </p>

        {/* Dedicated Direct Links */}
        <div className="login-direct-links">
          <Link to="/admin/login">
            <ShieldCheck size={13} /> Admin Portal
          </Link>
          <span className="dot">&bull;</span>
          <Link to="/staff/login">
            <Briefcase size={13} /> Staff Desk
          </Link>
          <span className="dot">&bull;</span>
          <Link to="/member/login">
            <Trophy size={13} /> Member Lounge
          </Link>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Shell>
  );
}

export function AdminLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [toast, setToast] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const config = ROLE_CONFIGS.ADMIN;

  const handleFillDemo = (email, password) => {
    setForm({ email, password });
    setToast({ type: 'success', message: 'Filled Administrator demo credentials.' });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await login(form, 'ADMIN');
      nav('/admin/dashboard');
    } catch (err) {
      setToast({ 
        type: 'error', 
        message: err.response?.data?.message || err.message || 'Administrator authentication failed.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell role="ADMIN">
      <div className="auth-form">
        <small className="eyebrow-accent">{config.eyebrow}</small>
        <h2>{config.headline}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '16px', fontSize: '13px' }}>
          Restricted access for Trooferz Club Owners and Master Administrators.
        </p>

        <div className={`role-info-card ${config.colorClass}`}>
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{config.infoText}</span>
        </div>

        <DemoQuickFill config={config} onFill={handleFillDemo} />

        <form onSubmit={handleSubmit}>
          <Field 
            label="ADMINISTRATOR EMAIL" 
            type="email" 
            icon={Mail}
            value={form.email} 
            onChange={e => setForm({ ...form, email: e.target.value })} 
            required 
          />
          <Field 
            label="PASSWORD" 
            type="password" 
            icon={LockKeyhole}
            value={form.password} 
            onChange={e => setForm({ ...form, password: e.target.value })} 
            required 
          />
          <button 
            type="submit"
            className="btn-hero-primary" 
            disabled={isSubmitting}
            style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
          >
            <span>{isSubmitting ? 'VERIFYING CREDENTIALS...' : 'ACCESS OWNER CONSOLE'}</span> 
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-direct-links">
          <Link to="/staff/login"><Briefcase size={13} /> Switch to Staff Desk</Link>
          <span className="dot">&bull;</span>
          <Link to="/login"><Trophy size={13} /> Member Login</Link>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Shell>
  );
}

export function StaffLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [toast, setToast] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const config = ROLE_CONFIGS.STAFF;

  const handleFillDemo = (email, password) => {
    setForm({ email, password });
    setToast({ type: 'success', message: 'Filled Staff Member demo credentials.' });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await login(form, 'STAFF');
      nav('/admin/dashboard');
    } catch (err) {
      setToast({ 
        type: 'error', 
        message: err.response?.data?.message || err.message || 'Staff authentication failed.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell role="STAFF">
      <div className="auth-form">
        <small className="eyebrow-accent">{config.eyebrow}</small>
        <h2>{config.headline}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '16px', fontSize: '13px' }}>
          Front desk matchday control, player check-in, and turf slot coordination.
        </p>

        <div className={`role-info-card ${config.colorClass}`}>
          <Briefcase size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{config.infoText}</span>
        </div>

        <DemoQuickFill config={config} onFill={handleFillDemo} />

        <form onSubmit={handleSubmit}>
          <Field 
            label="STAFF EMAIL" 
            type="email" 
            icon={Mail}
            value={form.email} 
            onChange={e => setForm({ ...form, email: e.target.value })} 
            required 
          />
          <Field 
            label="PASSWORD" 
            type="password" 
            icon={LockKeyhole}
            value={form.password} 
            onChange={e => setForm({ ...form, password: e.target.value })} 
            required 
          />
          <button 
            type="submit"
            className="btn-hero-primary" 
            disabled={isSubmitting}
            style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
          >
            <span>{isSubmitting ? 'VERIFYING CREDENTIALS...' : 'ACCESS STAFF DESK'}</span> 
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-direct-links">
          <Link to="/admin/login"><ShieldCheck size={13} /> Admin Portal</Link>
          <span className="dot">&bull;</span>
          <Link to="/login"><Trophy size={13} /> Member Login</Link>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Shell>
  );
}

export function MemberLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [toast, setToast] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const config = ROLE_CONFIGS.MEMBER;

  const handleFillDemo = (email, password) => {
    setForm({ email, password });
    setToast({ type: 'success', message: 'Filled Member demo credentials.' });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(form, 'MEMBER');
      nav('/');
    } catch (err) {
      setToast({ 
        type: 'error', 
        message: err.response?.data?.message || err.message || 'Member login failed.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell role="MEMBER">
      <div className="auth-form">
        <small className="eyebrow-accent">{config.eyebrow}</small>
        <h2>{config.headline}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '16px', fontSize: '13px' }}>
          Sign in to manage your court bookings, memberships, and wallet balance.
        </p>

        <div className={`role-info-card ${config.colorClass}`}>
          <Trophy size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{config.infoText}</span>
        </div>

        <DemoQuickFill config={config} onFill={handleFillDemo} />

        <form onSubmit={handleSubmit}>
          <Field 
            label="EMAIL ADDRESS" 
            type="email" 
            icon={Mail}
            value={form.email} 
            onChange={e => setForm({ ...form, email: e.target.value })} 
            required 
          />
          <Field 
            label="PASSWORD" 
            type="password" 
            icon={LockKeyhole}
            value={form.password} 
            onChange={e => setForm({ ...form, password: e.target.value })} 
            required 
          />
          <button 
            type="submit"
            className="btn-hero-primary" 
            disabled={isSubmitting}
            style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
          >
            <span>{isSubmitting ? 'SIGNING IN...' : 'LOGIN TO MEMBER LOUNGE'}</span> 
            <ArrowRight size={18} />
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginTop: '20px' }}>
          New to Trooferz? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: '700' }}>Create an Account</Link>
        </p>

        <div className="login-direct-links">
          <Link to="/admin/login"><ShieldCheck size={13} /> Admin Portal</Link>
          <span className="dot">&bull;</span>
          <Link to="/staff/login"><Briefcase size={13} /> Staff Desk</Link>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', password: '', confirmPassword: '' });
  const [toast, setToast] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (k, v) => setForm(x => ({ ...x, [k]: v }));

  const go = async e => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await register(form);
      nav('/');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Registration failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell role="MEMBER">
      <div className="auth-form">
        <small className="eyebrow-accent">NEW ATHLETE</small>
        <h2>CREATE ACCOUNT</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Join Trooferz Sports Club Baner today.</p>
        <form onSubmit={go}>
          <Field label="FULL NAME" icon={UserRound} value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
          <Field label="MOBILE NUMBER" icon={Phone} value={form.mobile} onChange={e => set('mobile', e.target.value)} required />
          <Field label="EMAIL ADDRESS" icon={Mail} type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          <Field label="PASSWORD" icon={LockKeyhole} type="password" minLength="8" value={form.password} onChange={e => set('password', e.target.value)} required />
          <Field label="CONFIRM PASSWORD" icon={LockKeyhole} type="password" minLength="8" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
          <button 
            type="submit"
            className="btn-hero-primary" 
            disabled={isSubmitting}
            style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
          >
            <span>{isSubmitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}</span> 
            <ArrowRight size={18} />
          </button>
        </form>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginTop: '24px' }}>
          Already registered? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: '700' }}>Login</Link>
        </p>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Shell>
  );
}
