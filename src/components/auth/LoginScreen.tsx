import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { Business, Staff } from '../../types';
import { Key, Building, User, ArrowRight, ShieldCheck } from 'lucide-react';

const FALLBACK_BUSINESSES: Business[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'BABM TRADERS' }
];

const FALLBACK_STAFF: Staff[] = [
  { id: '22222222-2222-2222-2222-222222222222', business_id: '11111111-1111-1111-1111-111111111111', name: 'OWNER ADMIN', role: 'owner', pin: '1234' },
  { id: '33333333-3333-3333-3333-333333333333', business_id: '11111111-1111-1111-1111-111111111111', name: 'MANAGER', role: 'manager', pin: '1234' },
  { id: '44444444-4444-4444-4444-444444444444', business_id: '11111111-1111-1111-1111-111111111111', name: 'STAFF MEMBER', role: 'staff', pin: '1234' }
];

export function LoginScreen() {
  const { login } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>(FALLBACK_BUSINESSES);
  const [selectedBizId, setSelectedBizId] = useState<string>(FALLBACK_BUSINESSES[0].id);
  const [staffList, setStaffList] = useState<Staff[]>(FALLBACK_STAFF);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(FALLBACK_STAFF[0].id);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchAuthData() {
      const sb = getSupabase();
      if (!sb) return;
      try {
        setLoading(true);
        const { data: bData } = await sb.from('businesses').select('*').order('name');
        if (bData && bData.length) {
          setBusinesses(bData);
          setSelectedBizId(bData[0].id);
        }
      } catch (e) {
        console.warn('Login fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchAuthData();
  }, []);

  useEffect(() => {
    async function fetchStaff() {
      if (!selectedBizId) return;
      const sb = getSupabase();
      if (!sb) return;
      try {
        const { data: sData } = await sb.from('staff').select('*').eq('business_id', selectedBizId).order('name');
        if (sData && sData.length) {
          setStaffList(sData);
          setSelectedStaffId(sData[0].id);
        } else {
          setStaffList(FALLBACK_STAFF);
          setSelectedStaffId(FALLBACK_STAFF[0].id);
        }
      } catch (e) {
        setStaffList(FALLBACK_STAFF);
      }
    }
    fetchStaff();
  }, [selectedBizId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const staffMember = staffList.find(s => s.id === selectedStaffId);
    const business = businesses.find(b => b.id === selectedBizId);

    if (!staffMember || !business) {
      setErrorMsg('Please select a valid staff member.');
      return;
    }

    if (staffMember.pin && staffMember.pin.trim() !== pin.trim()) {
      setErrorMsg('Incorrect PIN. Please re-enter.');
      return;
    }

    login(staffMember, business);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 10%, #1E3A6E 0%, #0B132B 80%)',
        padding: '20px'
      }}
    >
      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--card)',
          borderRadius: 'var(--radius-modal)',
          padding: '32px 28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          animation: 'fadeInUp 0.3s ease'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'var(--blue-soft)',
              color: 'var(--turmeric)',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink)' }}>
            BABM TASK ENTERPRISE
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
            Sign in to access tasks, sales, and daily accounts
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'var(--brick-soft)',
              color: 'var(--brick)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-button)',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '16px'
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select Business</label>
            <select
              value={selectedBizId}
              onChange={e => setSelectedBizId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
            >
              {businesses.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select Staff Member</label>
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Enter 4-Digit PIN</label>
            <input
              type="password"
              maxLength={6}
              autoFocus
              required
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                textAlign: 'center',
                fontSize: '1.4rem',
                letterSpacing: '0.3em'
              }}
            />
          </div>

          <button
            type="submit"
            className="stamp-btn"
            style={{
              padding: '12px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px'
            }}
          >
            <span>Enter Workspace</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
