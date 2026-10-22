import { useEffect, useState } from 'react';
import { Mail, Phone, Save, UserRound, Wallet, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Toast, Status, Modal } from '../components/UI';
import { PageHead } from './Sports';
import { money } from '../utils/ui';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ full_name: user?.full_name || '', mobile: user?.phone || user?.mobile || '' });
  const [toast, setToast] = useState();
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('1000');
  const [loadingTopup, setLoadingTopup] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name, mobile: user.phone || user.mobile || '' });
    }
  }, [user]);

  const loadTransactions = () => {
    api.get('/payments/wallet/transactions/').then(r => setTransactions(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const save = async e => {
    e.preventDefault();
    try {
      await api.put('/users/profile/me/', form);
      await refreshUser();
      setToast({ message: 'Profile updated successfully.' });
    } catch (e) {
      setToast({ type: 'error', message: e.response?.data?.message || 'Could not save profile.' });
    }
  };

  const handleTopup = async () => {
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) {
      setToast({ type: 'error', message: 'Enter a valid top-up amount.' });
      return;
    }
    setLoadingTopup(true);
    try {
      const res = await api.post('/payments/wallet/topup/', { amount: amt });
      setToast({ message: res.data?.message || `Wallet topped up with ₹${amt}!` });
      setTopupOpen(false);
      await refreshUser();
      loadTransactions();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Top-up failed.' });
    } finally {
      setLoadingTopup(false);
    }
  };

  if (!user) return null;

  return (
    <div className="inner-page-wrap">
      <PageHead eyebrow="ACCOUNT & WALLET" title="MEMBER PROFILE" text="Manage personal details, view digital wallet balance, and top-up match credits." />

      <div className="profile-grid">
        <section className="profile-hero" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
          <div className="avatar big">{user.full_name ? user.full_name[0] : 'U'}</div>
          <small className="eyebrow-accent" style={{ marginTop: '12px' }}>{user.role}</small>
          <h2>{user.full_name || user.username}</h2>
          <p>{user.email}</p>
          <Status value="ACTIVE" />

          {/* Digital Wallet Card */}
          <div style={{ marginTop: '24px', width: '100%', background: 'var(--dark-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="var(--accent)" />
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>TROOFERZ WALLET</span>
              </div>
              <button
                className="btn-secondary-sm"
                style={{ padding: '4px 10px', fontSize: '11px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                onClick={() => setTopupOpen(true)}
              >
                <Plus size={12} style={{ marginRight: '4px' }} /> Top-Up
              </button>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)', marginTop: '8px', fontFamily: 'var(--font-heading)' }}>
              {money(user.wallet_balance || 0)}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
              Instant court bookings, automated cancellation refunds, and split payment escrow.
            </p>
          </div>
        </section>

        <form className="panel form-panel" onSubmit={save} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
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

      {/* Wallet Transaction Ledger */}
      {transactions.length > 0 && (
        <section className="section" style={{ marginTop: '40px' }}>
          <div className="section-head">
            <div>
              <small className="eyebrow-accent">DOUBLE-ENTRY LEDGER</small>
              <h2 className="heading-huge" style={{ fontSize: '24px' }}>WALLET TRANSACTIONS</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td>
                      <span className={`weather-badge ${t.transaction_type === 'CREDIT' ? 'green' : 'red'}`}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td><b>{t.description}</b></td>
                    <td style={{ color: t.transaction_type === 'CREDIT' ? '#69d7b2' : '#ff8e8e', fontWeight: 700 }}>
                      {t.transaction_type === 'CREDIT' ? '+' : '-'}{money(t.amount)}
                    </td>
                    <td>{money(t.balance_after)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Wallet Top-Up Modal */}
      <Modal open={topupOpen} onClose={() => setTopupOpen(false)} title="Top-Up Digital Wallet">
        <div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: 0 }}>
            Add funds to your Trooferz wallet for instant 1-click booking and split payment settlement.
          </p>

          <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
            {['500', '1000', '2000', '5000'].map(val => (
              <button
                key={val}
                type="button"
                className={topupAmount === val ? 'btn-cta-navbar' : 'btn-secondary-sm'}
                style={{ flex: 1, padding: '8px 4px', fontSize: '12px' }}
                onClick={() => setTopupAmount(val)}
              >
                ₹{val}
              </button>
            ))}
          </div>

          <label className="field">Amount to Add (₹)
            <input
              type="number"
              min="100"
              max="50000"
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              style={{ fontSize: '18px', fontWeight: 700 }}
            />
          </label>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button className="btn-secondary-sm" onClick={() => setTopupOpen(false)}>Cancel</button>
            <button className="btn-cta-navbar" disabled={loadingTopup} onClick={handleTopup}>
              {loadingTopup ? 'Processing...' : `TOP-UP ₹${topupAmount} NOW`}
            </button>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
