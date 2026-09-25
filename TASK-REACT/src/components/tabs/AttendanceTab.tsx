import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { todayStr, formatTime } from '../../utils/dateUtils';
import { getSupabase } from '../../lib/supabase';
import { AttendanceRecord } from '../../types';
import { Check, X, Calendar, Clock, MapPin } from 'lucide-react';

export function AttendanceTab() {
  const { session, isManagerPlus } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr());

  const recordsForDate = cache.attendance.filter(a => a.date === selectedDate);
  const presentCount = recordsForDate.filter(a => a.status !== 'absent').length;

  const handleMarkAttendance = async (staffId: string, status: 'present' | 'absent') => {
    if (!session || !session.businessId) return;
    const bizId = session.businessId;
    const nowIso = new Date().toISOString();

    const existingIndex = cache.attendance.findIndex(
      a => a.staff_id === staffId && a.date === selectedDate
    );

    let updatedRecord: AttendanceRecord;
    if (existingIndex >= 0) {
      updatedRecord = {
        ...cache.attendance[existingIndex],
        status,
        check_in: status === 'present' ? cache.attendance[existingIndex].check_in || nowIso : null
      };
    } else {
      updatedRecord = {
        id: 'loc_att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        business_id: bizId,
        staff_id: staffId,
        date: selectedDate,
        status,
        check_in: status === 'present' ? nowIso : null
      };
    }

    const updatedList = existingIndex >= 0
      ? cache.attendance.map((a, i) => (i === existingIndex ? updatedRecord : a))
      : [updatedRecord, ...cache.attendance];

    updateCacheItem('attendance', updatedList);
    showToast(`Marked ${status.toUpperCase()} for ${selectedDate}`, 'success');

    // Cloud upsert
    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        const payload: any = {
          business_id: bizId,
          staff_id: staffId,
          date: selectedDate,
          status,
          check_in: updatedRecord.check_in
        };
        await sb.from('attendance').upsert(payload, { onConflict: 'business_id,staff_id,date' });
      } catch (e) {
        console.warn('Attendance sync error:', e);
      }
    }
  };

  const handleSelfCheckIn = () => {
    if (session?.staffId) {
      handleMarkAttendance(session.staffId, 'present');
    }
  };

  return (
    <div className="tab-attendance" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Date & Summary bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--card)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-button)',
              border: '1px solid var(--paper-line)'
            }}
          >
            <Calendar size={15} color="var(--turmeric)" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 600 }}
            />
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
            Present: <b style={{ color: 'var(--leaf)' }}>{presentCount}</b> / {cache.staff.length}
          </span>
        </div>

        {selectedDate === todayStr() && (
          <button
            type="button"
            onClick={handleSelfCheckIn}
            className="stamp-btn"
            style={{ padding: '6px 14px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} />
            <span>I'm In (Check In)</span>
          </button>
        )}
      </div>

      {/* Staff Attendance Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cache.staff.map(staff => {
          const record = recordsForDate.find(a => a.staff_id === staff.id);
          const isPresent = record && record.status !== 'absent';
          const isAbsent = record && record.status === 'absent';

          return (
            <div
              key={staff.id}
              className="row-card"
              style={{
                alignItems: 'center',
                padding: '12px 16px',
                borderLeft: isPresent ? '4px solid var(--leaf)' : isAbsent ? '4px solid var(--brick)' : '4px solid var(--paper-line)'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '0.9rem' }}>{staff.name}</b>
                  <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                    {staff.role}
                  </span>
                </div>
                {record?.check_in && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    <span>Checked in at {formatTime(record.check_in)}</span>
                  </div>
                )}
              </div>

              {/* Attendance action buttons */}
              {isManagerPlus() || session?.staffId === staff.id ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleMarkAttendance(staff.id, 'present')}
                    className={`attend-btn ${isPresent ? 'present active' : ''}`}
                    style={{ padding: '6px 12px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Check size={13} />
                    <span>Present</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAttendance(staff.id, 'absent')}
                    className={`attend-btn ${isAbsent ? 'absent active' : ''}`}
                    style={{ padding: '6px 12px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={13} />
                    <span>Absent</span>
                  </button>
                </div>
              ) : (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isPresent ? 'var(--leaf)' : isAbsent ? 'var(--brick)' : 'var(--ink-soft)'
                  }}
                >
                  {isPresent ? 'PRESENT' : isAbsent ? 'ABSENT' : 'UNMARKED'}
                </span>
              )}
            </div>
          );
        })}

        {cache.staff.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No staff registered yet. Add staff under the Staff tab.
          </div>
        )}
      </div>
    </div>
  );
}
