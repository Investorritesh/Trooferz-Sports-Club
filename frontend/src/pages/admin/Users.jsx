import { useEffect, useState } from 'react';
import { Eye, Search, UserCheck, UserX, Shield, Mail, Phone, Calendar } from 'lucide-react';
import api from '../../services/api';
import { Modal, Spinner, Status, Toast } from '../../components/UI';

export default function Users() {
  const [rows, setRows] = useState();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => {
    api.get('/users/', { params: { search, status } })
      .then(r => setRows(Array.isArray(r.data) ? r.data : (r.data?.results || [])))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    load();
  }, [status]);

  const toggle = async (u) => {
    try {
      await api.put(`/users/${u.id}/`, {
        full_name: u.full_name,
        phone: u.phone || u.mobile,
        mobile: u.phone || u.mobile,
        is_active: !u.is_active
      });
      setToast({ message: `${u.full_name || u.email} ${u.is_active ? 'deactivated' : 'activated'} successfully.` });
      load();
      if (selected && selected.id === u.id) {
        const r = await api.get(`/users/${u.id}/`);
        setSelected(r.data);
      }
    } catch (e) {
      setToast({ type: 'error', message: e.response?.data?.message || 'User update failed.' });
    }
  };

  const viewUser = (userId) => {
    api.get(`/users/${userId}/`)
      .then(r => setSelected(r.data))
      .catch(e => setToast({ type: 'error', message: 'Could not load user details.' }));
  };

  if (!rows) return <Spinner label="Loading user directory..." />;

  return (
    <div>
      <div className="page-head">
        <div>
          <small>MEMBERS & USERS</small>
          <h1>User management</h1>
          <p>Search customer base, review booking histories, verify contact numbers and toggle account status.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
        <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active Members</option>
          <option value="inactive">Inactive Members</option>
        </select>
        <button className="secondary" onClick={load}>Search</button>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Wallet Balance</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id}>
                <td>
                  <b>{u.full_name || 'Member'}</b>
                  <div className="sub">{u.email}</div>
                </td>
                <td>{u.phone || u.mobile || '—'}</td>
                <td>
                  <span className={`weather-badge ${u.role === 'ADMIN' ? 'amber' : u.role === 'STAFF' ? 'green' : 'blue'}`}>
                    {u.role || 'MEMBER'}
                  </span>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  ₹{Number(u.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <Status value={u.is_active ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="View Details" onClick={() => viewUser(u.id)}>
                      <Eye size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      title={u.is_active ? 'Deactivate Member' : 'Activate Member'}
                      onClick={() => toggle(u)}
                    >
                      {u.is_active ? <UserX size={15} color="#ff8e8e" /> : <UserCheck size={15} color="#69d7b2" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">No users matched your search filters.</div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.full_name || 'Member Profile'} width={540}>
        {selected && (
          <div>
            <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <small style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>EMAIL</small>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{selected.email}</div>
              </div>
              <div>
                <small style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>PHONE</small>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{selected.phone || selected.mobile || '—'}</div>
              </div>
              <div>
                <small style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>ROLE</small>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{selected.role}</div>
              </div>
              <div>
                <small style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>WALLET BALANCE</small>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent)', marginTop: '2px' }}>
                  ₹{Number(selected.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <small style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>ACCOUNT STATUS</small>
                <div style={{ marginTop: '2px' }}><Status value={selected.is_active ? 'ACTIVE' : 'INACTIVE'} /></div>
              </div>
              <div>
                <small style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>ACTIVE MEMBERSHIP</small>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>
                  {selected.membership_tier ? `${selected.membership_tier} Tier` : (selected.has_active_membership ? 'Active' : 'Standard Member')}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-secondary-sm" onClick={() => setSelected(null)}>Close</button>
              <button
                className="btn-cta-navbar"
                style={{
                  background: selected.is_active ? '#ff6b6b' : 'var(--accent)',
                  color: selected.is_active ? '#fff' : '#000'
                }}
                onClick={() => toggle(selected)}
              >
                {selected.is_active ? 'Deactivate Member' : 'Activate Member'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
