import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Check,
  Clock3,
  Sparkles,
  Snowflake,
  Play,
  Star,
  CreditCard,
  Wallet,
  QrCode,
  Building,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { dateLabel, money } from '../utils/ui';
import { Spinner, Status, Toast, Modal } from '../components/UI';
import { PageHead } from './Sports';
import { useAuth } from '../context/AuthContext';

export default function Membership() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [mine, setMine] = useState([]);
  const [toast, setToast] = useState();
  const [actionLoading, setActionLoading] = useState(false);

  // Membership Checkout & Payment Type Modal State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentType, setPaymentType] = useState('WALLET');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paying, setPaying] = useState(false);

  const load = () => {
    api.get('/memberships/plans/')
      .then(p => setPlans(Array.isArray(p.data) ? p.data : (p.data.results || [])))
      .catch(() => setPlans([]));

    if (user) {
      api.get('/memberships/mine/')
        .then(m => setMine(Array.isArray(m.data) ? m.data : (m.data.results || [])))
        .catch(() => setMine([]));
    } else {
      setMine([]);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  // Auto-open checkout modal if planId query param is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('planId');
    if (pid && plans.length > 0) {
      const target = plans.find(p => String(p.id) === String(pid));
      if (target && !selectedPlan) {
        openCheckout(target);
      }
    }
  }, [plans]);

  const openCheckout = (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedPlan(plan);
    setPaymentType('WALLET');
    setUpiId(user?.email ? `${user.email.split('@')[0]}@okhdfcbank` : 'member@upi');
  };

  const subscribeAndPay = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedPlan || paying) return;
    setPaying(true);

    try {
      const payload = {
        plan_id: selectedPlan.id,
        planId: selectedPlan.id,
        payment_method: paymentType,
        upi_id: paymentType === 'UPI' ? upiId : undefined
      };

      const res = await api.post('/memberships/activate/', payload);
      setToast({ message: res.data?.message || `🎉 Welcome to ${selectedPlan.name}! Membership activated.` });
      setSelectedPlan(null);
      await Promise.all([
        load(),
        refreshUser ? refreshUser().catch(() => {}) : Promise.resolve()
      ]);
    } catch (e) {
      setToast({ type: 'error', message: e.response?.data?.message || 'Payment / activation failed.' });
    } finally {
      setPaying(false);
    }
  };

  const toggleFreeze = async () => {
    if (!mine[0] || actionLoading) return;
    setActionLoading(true);
    const endpoint = mine[0].is_frozen ? '/memberships/unfreeze/' : '/memberships/freeze/';
    try {
      const res = await api.post(endpoint);
      setToast({ message: res.data?.message || (mine[0].is_frozen ? 'Membership resumed!' : 'Membership frozen.') });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Action failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!plans) return <Spinner />;

  const active = mine[0];

  return (
    <div className="inner-page-wrap">
      <PageHead
        eyebrow="CLUB MEMBERSHIP"
        title="JOIN THE CLUB"
        text="Elevate your experience with priority court reservations, discounted rates, free credits, and subscription freeze control."
      />

      {active && (
        <div className="active-membership" style={{
          background: 'var(--card)',
          border: active.is_frozen ? '1px solid #77aef3' : '1px solid var(--accent)',
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="membership-icon" style={{
              background: active.is_frozen ? '#77aef3' : 'var(--accent)',
              color: 'var(--black)',
              padding: '12px',
              borderRadius: '6px'
            }}>
              {active.is_frozen ? <Snowflake size={28} /> : <BadgeCheck size={28} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <small className="eyebrow-accent">CURRENT ACTIVE SUBSCRIPTION</small>
                {active.is_frozen && (
                  <span className="weather-badge blue" style={{ background: 'rgba(119,174,243,0.15)', color: '#77aef3' }}>
                    FROZEN (EXPIRY PAUSED)
                  </span>
                )}
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', margin: '4px 0', textTransform: 'uppercase' }}>
                {active.plan_name} ({active.tier || 'PRO'})
              </h3>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
                Valid: {dateLabel(active.start_date)} → {dateLabel(active.end_date)}
              </p>
              <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={14} /> {active.credits_left ?? 4} Free Monthly Booking Credits Left
                </span>
                <span style={{ color: 'var(--white-soft)' }}>
                  Tier Discount: {active.discount_percentage || 15}% off
                </span>
              </div>
            </div>
          </div>

          <div>
            <button
              className="btn-secondary-sm"
              disabled={actionLoading}
              onClick={toggleFreeze}
              style={{
                borderColor: active.is_frozen ? '#69d7b2' : '#77aef3',
                color: active.is_frozen ? '#69d7b2' : '#77aef3',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {active.is_frozen ? <Play size={16} /> : <Snowflake size={16} />}
              {actionLoading ? 'Updating...' : active.is_frozen ? 'Unfreeze & Resume' : 'Freeze Membership (Max 60 Days)'}
            </button>
          </div>
        </div>
      )}

      <div className="plans">
        {plans.map((p, i) => (
          <article className={`plan ${i === 1 ? 'featured' : ''}`} key={p.id}>
            {i === 1 && <span className="popular">MOST POPULAR</span>}
            <Sparkles size={24} style={{ color: 'var(--accent)' }} />
            <h3>{p.name}</h3>
            <div className="price">
              {money(p.price)}
              <small style={{ color: 'var(--muted)', fontSize: '13px' }}> / {p.duration_days >= 365 ? 'year' : `${p.duration_days / 30} mo`}</small>
            </div>
            <div className="benefits">
              {(p.benefits || '').split('\n').map((x, j) => (
                <span key={j}><Check size={16} />{x}</span>
              ))}
            </div>
            <button
              className="btn-cta-navbar"
              style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
              onClick={() => openCheckout(p)}
            >
              SUBSCRIBE & PAY
            </button>
          </article>
        ))}
      </div>

      {/* Simple Membership Checkout & Payment Type Modal */}
      <Modal open={!!selectedPlan} onClose={() => setSelectedPlan(null)} title="Membership Checkout" width={600}>
        {selectedPlan && (
          <div className="membership-checkout">
            {/* Plan Summary Banner */}
            <div className="checkout-plan-summary">
              <div>
                <span className="eyebrow-accent" style={{ fontSize: '11px' }}>SELECTED PLAN</span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '20px', textTransform: 'uppercase' }}>{selectedPlan.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  {selectedPlan.duration_days} Days Full Access · {selectedPlan.free_booking_credits || 4} Monthly Free Credits
                </p>
              </div>
              <div className="checkout-plan-price-wrap">
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>TOTAL PAYABLE</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-heading)' }}>
                  {money(selectedPlan.price)}
                </div>
              </div>
            </div>

            {/* Select Payment Type Header */}
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--white-soft)', display: 'block', marginBottom: '10px', letterSpacing: '0.04em' }}>
              SELECT PAYMENT TYPE:
            </label>

            {/* 4 Simple Payment Types */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 1. Club Wallet */}
              <div
                onClick={() => setPaymentType('WALLET')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: paymentType === 'WALLET' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: paymentType === 'WALLET' ? 'rgba(200, 255, 0, 0.06)' : 'var(--dark-2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(200, 255, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Trooferz Club Wallet
                      <span className="weather-badge green" style={{ fontSize: '10px', padding: '2px 6px' }}>FASTEST</span>
                    </div>
                    <small style={{ color: Number(user?.wallet_balance || 0) >= Number(selectedPlan.price) ? 'var(--muted)' : '#ff8e8e' }}>
                      Available Balance: ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {Number(user?.wallet_balance || 0) < Number(selectedPlan.price) && ' (Insufficient balance)'}
                    </small>
                  </div>
                </div>
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'WALLET'}
                  onChange={() => setPaymentType('WALLET')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
              </div>

              {/* 2. UPI / QR / GPay */}
              <div
                onClick={() => setPaymentType('UPI')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: paymentType === 'UPI' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: paymentType === 'UPI' ? 'rgba(200, 255, 0, 0.06)' : 'var(--dark-2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(105, 215, 178, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#69d7b2' }}>
                    <QrCode size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>UPI / Google Pay / PhonePe / Paytm</div>
                    <small style={{ color: 'var(--muted)' }}>Instant payment via UPI ID or scan QR code</small>
                  </div>
                </div>
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'UPI'}
                  onChange={() => setPaymentType('UPI')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
              </div>

              {paymentType === 'UPI' && (
                <div style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: '6px', border: '1px solid rgba(105, 215, 178, 0.2)', marginLeft: '12px', marginRight: '12px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Enter your UPI ID / VPA:</label>
                  <input
                    type="text"
                    placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--dark-2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              )}

              {/* 3. Credit / Debit Card */}
              <div
                onClick={() => setPaymentType('CARD')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: paymentType === 'CARD' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: paymentType === 'CARD' ? 'rgba(200, 255, 0, 0.06)' : 'var(--dark-2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(119, 174, 243, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#77aef3' }}>
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>Credit / Debit Card</div>
                    <small style={{ color: 'var(--muted)' }}>Visa, MasterCard, RuPay, Maestro accepted</small>
                  </div>
                </div>
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'CARD'}
                  onChange={() => setPaymentType('CARD')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
              </div>

              {paymentType === 'CARD' && (
                <div style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: '6px', border: '1px solid rgba(119, 174, 243, 0.2)', marginLeft: '12px', marginRight: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Card Number (e.g. 4532 •••• •••• 8892)"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--dark-2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#fff', fontSize: '13px' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="MM / YY"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', background: 'var(--dark-2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#fff', fontSize: '13px' }}
                    />
                    <input
                      type="password"
                      maxLength="4"
                      placeholder="CVV"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                      style={{ width: '100px', padding: '8px 12px', background: 'var(--dark-2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                </div>
              )}

              {/* 4. Pay at Front Desk / Counter */}
              <div
                onClick={() => setPaymentType('DIRECT')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: paymentType === 'DIRECT' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: paymentType === 'DIRECT' ? 'rgba(200, 255, 0, 0.06)' : 'var(--dark-2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Building size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>Pay at Front Desk / Counter (Cash)</div>
                    <small style={{ color: 'var(--muted)' }}>Pay at Trooferz Reception in Baner upon visit</small>
                  </div>
                </div>
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'DIRECT'}
                  onChange={() => setPaymentType('DIRECT')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
              </div>
            </div>

            {/* Security note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '12px', color: 'var(--muted)' }}>
              <ShieldCheck size={16} color="#69d7b2" />
              <span>256-bit encrypted secure checkout. Instant digital membership receipt generated.</span>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-secondary-sm" onClick={() => setSelectedPlan(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-cta-navbar"
                disabled={paying || (paymentType === 'WALLET' && Number(user?.wallet_balance || 0) < Number(selectedPlan.price))}
                onClick={subscribeAndPay}
                style={{ padding: '10px 24px' }}
              >
                {paying ? 'Processing Payment...' : `PAY ${money(selectedPlan.price)} & ACTIVATE`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
