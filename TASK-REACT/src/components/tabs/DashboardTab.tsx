import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useTasks } from '../../context/TaskContext';
import { todayStr, currentMonthStr, fmtCurrency } from '../../utils/dateUtils';
import { QuickTaskBar } from '../common/QuickTaskBar';
import { Badge } from '../common/Badge';
import { TabKey } from '../../types';
import {
  TrendingUp,
  CheckSquare,
  Users,
  Wallet,
  Trophy,
  ArrowRight,
  Plus,
  Clock
} from 'lucide-react';

export interface DashboardTabProps {
  onNavigateTab: (tab: TabKey) => void;
  onOpenNewTaskModal: () => void;
}

export function DashboardTab({ onNavigateTab, onOpenNewTaskModal }: DashboardTabProps) {
  const { session, isOwner } = useAuth();
  const { cache } = useCache();
  const { activeTasks, markTaskDone } = useTasks();

  const today = todayStr();
  const curMonth = currentMonthStr();

  // Metrics
  const todaySales = cache.sales
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + Number(s.order_value || 0), 0);

  const monthSales = cache.sales
    .filter(s => s.date && s.date.startsWith(curMonth))
    .reduce((sum, s) => sum + Number(s.order_value || 0), 0);

  const todayAttendance = cache.attendance.filter(a => a.date === today && a.status !== 'absent').length;

  const todayAccount = cache.dailyAccounts.find(a => a.date === today);
  const cashBalance = todayAccount ? todayAccount.total : 0;

  // Monthly Target & Incentive
  const targets = cache.salesTargets || [];
  const myTarget = targets.find(t => t.staff_id === session?.staffId && t.month === curMonth);
  const targetGoal = isOwner()
    ? targets.filter(t => t.month === curMonth).reduce((s, t) => s + Number(t.target_amount || 0), 0) || 200000
    : Number(myTarget?.target_amount || 30000);
  const achieved = isOwner()
    ? monthSales
    : cache.sales.filter(s => s.staff_id === session?.staffId && s.date.startsWith(curMonth)).reduce((s, x) => s + Number(x.order_value || 0), 0);
  const bonus = isOwner() ? 15000 : Number(myTarget?.incentive_bonus || 3000);
  const targetPct = Math.min(100, Math.round((achieved / Math.max(1, targetGoal)) * 100));

  return (
    <div className="tab-dashboard" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Pinned Incentive Card */}
      <div
        className="pinned-target-card"
        style={{
          background: 'linear-gradient(135deg, #0B132B 0%, #1E3A6E 100%)',
          color: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(11, 19, 43, 0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '6px',
                  display: 'inline-flex'
                }}
              >
                <Trophy size={18} color="#FBBF24" />
              </div>
              <b style={{ fontSize: '0.95rem', letterSpacing: '0.03em' }}>
                {isOwner() ? `Monthly Business Target (${curMonth})` : `My Monthly Incentive Goal (${curMonth})`}
              </b>
            </div>
            <div style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '4px' }}>
              Reach target to unlock <b style={{ color: '#34D399' }}>{fmtCurrency(bonus)} Bonus</b>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: targetPct >= 100 ? '#34D399' : '#FBBF24' }}>
              {fmtCurrency(achieved)} / {fmtCurrency(targetGoal)}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 600 }}>{targetPct}% Completed</span>
          </div>
        </div>

        {/* Progress track */}
        <div
          style={{
            height: '10px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginTop: '12px'
          }}
        >
          <div
            style={{
              width: `${targetPct}%`,
              height: '100%',
              background: targetPct >= 100 ? 'linear-gradient(90deg, #F59E0B, #10B981)' : 'linear-gradient(90deg, #FBBF24, #10B981)',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div
        className="kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        {/* Today's Sales */}
        <div
          className="row-card"
          onClick={() => onNavigateTab('sales')}
          style={{ cursor: 'pointer', padding: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', fontWeight: 600 }}>TODAY'S SALES</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--leaf)', marginTop: '4px' }}>
                {fmtCurrency(todaySales)}
              </div>
            </div>
            <div style={{ background: 'var(--leaf-soft)', padding: '10px', borderRadius: '10px', color: 'var(--leaf)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div
          className="row-card"
          onClick={() => onNavigateTab('tasks')}
          style={{ cursor: 'pointer', padding: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', fontWeight: 600 }}>PENDING TASKS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: activeTasks.length ? 'var(--turmeric)' : 'var(--leaf)', marginTop: '4px' }}>
                {activeTasks.length}
              </div>
            </div>
            <div style={{ background: 'var(--blue-soft)', padding: '10px', borderRadius: '10px', color: 'var(--turmeric)' }}>
              <CheckSquare size={20} />
            </div>
          </div>
        </div>

        {/* Daily Accounts */}
        <div
          className="row-card"
          onClick={() => onNavigateTab('accounts')}
          style={{ cursor: 'pointer', padding: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', fontWeight: 600 }}>DAILY CASH TOTAL</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
                {fmtCurrency(cashBalance)}
              </div>
            </div>
            <div style={{ background: 'var(--amber-soft)', padding: '10px', borderRadius: '10px', color: '#D97706' }}>
              <Wallet size={20} />
            </div>
          </div>
        </div>

        {/* Attendance */}
        <div
          className="row-card"
          onClick={() => onNavigateTab('attendance')}
          style={{ cursor: 'pointer', padding: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', fontWeight: 600 }}>STAFF ON DUTY</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
                {todayAttendance} / {cache.staff.length}
              </div>
            </div>
            <div style={{ background: 'var(--blue-soft)', padding: '10px', borderRadius: '10px', color: 'var(--turmeric)' }}>
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Task Bar */}
      <QuickTaskBar />

      {/* Priority Action Tasks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div className="section-label" style={{ margin: 0 }}>
          PRIORITY ACTION TASKS ({activeTasks.slice(0, 5).length})
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('tasks')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--turmeric)',
            fontWeight: 700,
            fontSize: '0.72rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>View All Tasks</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {activeTasks.slice(0, 5).map(task => {
          const staffObj = cache.staff.find(s => s.id === task.assigned_to);
          return (
            <div
              key={task.id}
              className="row-card"
              style={{
                alignItems: 'center',
                padding: '12px 14px',
                borderLeft: task.priority === 'urgent' || task.priority === 'high' ? '4px solid var(--brick)' : undefined
              }}
            >
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={e => markTaskDone(task.id, e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--turmeric)',
                  marginRight: '12px'
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <b style={{ fontSize: '0.85rem' }}>{task.title}</b>
                  <Badge variant={task.priority}>{task.priority}</Badge>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                  Assigned to: <b>{staffObj ? staffObj.name : 'Everyone'}</b>
                  {task.due_date && ` · Due ${task.due_date}`}
                </div>
              </div>
            </div>
          );
        })}
        {activeTasks.length === 0 && (
          <div className="empty" style={{ padding: '24px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            All tasks are cleared for today! Tap above to add a new task.
          </div>
        )}
      </div>
    </div>
  );
}
