import { useEffect, useState } from 'react';
import { Mail, Phone, Save, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Toast, Status } from '../components/UI';
import { PageHead } from './Sports';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ full_name: user.full_name, mobile: user.mobile });
  const [toast, setToast] = useState();

  useEffect(() => setForm({ full_name: user.full_name, mobile: user.mobile }), [user]);

  const save = async e => {
    e.preventDefault();
    try {
      await api.put('/users/profile/me', form);
      await refreshUser();
      setToast({ message: 'Profile updated.' });
    } catch (e) {
      setToast({ type: 'error', message: e.response?.data?.message || 'Could not save profile.' });
    }
  };

  return (
    <div className="inner-page-wrap">
      <PageHead eyebrow="ACCOUNT" title="MEMBER PROFILE" text="Manage your contact details and active account information." />
      <div className="profile-grid">
        <section className="profile-hero" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '32px' }}>
          <div className="avatar big">{user.full_name[0]}</div>
          <small className="eyebrow-accent" style={{ marginTop: '12px' }}>MEMBER</small>
          <h2>{user.full_name}</h2>
          <p>{user.email}</p>
          <Status value="ACTIVE" />
        </section>
        <form className="panel form-panel" onSubmit={save} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '32px' }}>
          <div className="section-head">
            <div>
              <small className="eyebrow-accent">EDIT DETAILS</small>
              <h2 className="heading-huge" style={{ fontSize: '24px' }}>PERSONAL INFO</h2>
            </div>
          </div>
          <label className="field">Full name
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </label>
          <label className="field">Email address
            <input disabled value={user.email} />
          </label>
          <label className="field">Mobile number
            <input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
          </label>
          <button className="btn-cta-navbar" style={{ marginTop: '16px', justifyContent: 'center' }}>
            <Save size={16} /> SAVE CHANGES
          </button>
        </form>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

