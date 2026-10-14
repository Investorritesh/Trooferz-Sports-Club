import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, Phone, UserRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/UI';

function Shell({ admin = false, children }) {
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
          <small className="eyebrow-accent">BANER • PUNE</small>
          <h1>{admin ? 'OWNER OPERATIONS' : 'PLAY. COMPETE. BELONG.'}</h1>
          <p>{admin ? 'Private management console for Trooferz club operations.' : 'Book premium turfs, track sessions and manage memberships.'}</p>
        </div>
      </div>
      <div className="auth-panel">{children}</div>
    </div>
  );
}

function Field({ label, ...p }) {
  return (
    <label className="field">
      {label}
      <input {...p} />
    </label>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [toast, setToast] = useState();

  const go = async e => {
    e.preventDefault();
    try {
      const user = await login(form);
      nav(user.role === 'ADMIN' ? '/admin/dashboard' : '/');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || err.message || 'Login failed.' });
    }
  };

  return (
    <Shell>
      <div className="auth-form">
        <small className="eyebrow-accent">MEMBER LOGIN</small>
        <h2>WELCOME BACK</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Sign in to manage your court bookings.</p>
        <form onSubmit={go}>
          <Field label="EMAIL ADDRESS" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <Field label="PASSWORD" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <button className="btn-hero-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}>
            <span>LOGIN</span> <ArrowRight size={18} />
          </button>
        </form>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginTop: '24px' }}>
          New to Trooferz? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: '700' }}>Create an Account</Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '12px' }}>
          <Link to="/admin/login" style={{ color: 'var(--muted)' }}><ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> Owner Portal Login</Link>
        </p>
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

  const set = (k, v) => setForm(x => ({ ...x, [k]: v }));

  const go = async e => {
    e.preventDefault();
    try {
      await register(form);
      nav('/');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Registration failed.' });
    }
  };

  return (
    <Shell>
      <div className="auth-form">
        <small className="eyebrow-accent">NEW ATHLETE</small>
        <h2>CREATE ACCOUNT</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Join Trooferz Sports Club today.</p>
        <form onSubmit={go}>
          <Field label="FULL NAME" value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
          <Field label="MOBILE NUMBER" value={form.mobile} onChange={e => set('mobile', e.target.value)} required />
          <Field label="EMAIL ADDRESS" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          <Field label="PASSWORD" type="password" minLength="8" value={form.password} onChange={e => set('password', e.target.value)} required />
          <Field label="CONFIRM PASSWORD" type="password" minLength="8" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
          <button className="btn-hero-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}>
            <span>CREATE ACCOUNT</span> <ArrowRight size={18} />
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

export function AdminLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [toast, setToast] = useState();

  const go = async e => {
    e.preventDefault();
    try {
      const user = await login(form, true);
      nav(user.role === 'ADMIN' ? '/admin/dashboard' : '/');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || err.message || 'Admin login failed.' });
    }
  };

  return (
    <Shell admin>
      <div className="auth-form">
        <small className="eyebrow-accent">OWNER CONSOLE</small>
        <h2>ADMIN LOGIN</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Restricted access for Trooferz operations team.</p>
        <form onSubmit={go}>
          <Field label="ADMIN EMAIL" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <Field label="PASSWORD" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <button className="btn-hero-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}>
            <span>ENTER CONSOLE</span> <ArrowRight size={18} />
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '24px' }}>
          <Link to="/login" style={{ color: 'var(--muted)' }}>Back to Member Login</Link>
        </p>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Shell>
  );
}

