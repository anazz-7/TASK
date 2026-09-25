// ==========================================
// BABM TASK — DOMAIN TYPE DEFINITIONS
// ==========================================

export type Role = 'owner' | 'manager' | 'staff' | 'salesman';

export interface Business {
  id: string;
  name: string;
  created_at?: string;
}

export interface Staff {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  role: Role;
  pin: string;
  salary_day?: number | null;
  salary_frequency?: 'daily' | 'weekly' | 'monthly';
  base_salary?: number;
  created_at?: string;
}

export interface Session {
  staffId: string;
  name: string;
  role: Role;
  businessId: string;
  businessName: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'done' | 'completed' | 'sent';

export interface Task {
  id: string;
  business_id: string;
  client_task_id?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  title: string;
  notes?: string | null;
  priority: TaskPriority;
  due_date?: string | null;
  due_time?: string | null;
  status: TaskStatus;
  project_id?: string | null;
  created_at?: string;
  updated_at?: string;
  _sync_state?: 'synced' | 'syncing' | 'failed';
}

export interface TaskFilter {
  staffId: string;
  priority: string;
  search: string;
}

export interface DailyAccount {
  id?: string;
  business_id: string;
  date: string;
  total_sales: number;
  amount: number;
  vendors: number;
  credit: number;
  credit_received: number;
  gpay: number;
  ba_credit: number;
  expenses: number;
  personal_ac: number;
  salary_paid: number;
  adjustment: number;
  total: number;
  excess: number;
  less: number;
  notes?: string;
  is_checked?: boolean;
  created_at?: string;
}

export interface AccountFieldMeta {
  key: keyof Omit<DailyAccount, 'id' | 'business_id' | 'date' | 'total' | 'excess' | 'less' | 'notes' | 'is_checked' | 'created_at'>;
  label: string;
  hint: string;
  isSubtract?: boolean;
}

export interface SaleRecord {
  id: string;
  business_id: string;
  staff_id?: string | null;
  date: string;
  order_value: number;
  notes?: string | null;
  created_at?: string;
}

export interface SalesTarget {
  id?: string;
  business_id: string;
  staff_id: string;
  month: string; // 'YYYY-MM'
  target_amount: number;
  incentive_bonus?: number;
}

export interface AttendanceRecord {
  id: string;
  business_id: string;
  staff_id: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: 'present' | 'absent';
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
}

export interface Routine {
  id: string;
  business_id: string;
  assigned_to?: string | null;
  title: string;
  notes?: string | null;
  priority: TaskPriority;
  due_time?: string | null;
  created_at?: string;
}

export interface RoutineLog {
  id?: string;
  routine_id: string;
  date: string;
  status: 'pending' | 'done';
}

export interface WeeklyTask {
  id: string;
  business_id: string;
  assigned_to?: string | null;
  title: string;
  notes?: string | null;
  priority: TaskPriority;
  created_at?: string;
}

export interface WeeklyTaskLog {
  id?: string;
  weekly_task_id: string;
  week_start: string;
  status: 'pending' | 'done';
}

export interface StockCheck {
  id?: string;
  business_id: string;
  staff_id?: string | null;
  date: string;
  stock_checked: boolean;
  all_correct?: boolean | null;
  has_problems?: boolean | null;
  checked_godowns?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface SalaryRecord {
  id: string;
  business_id: string;
  staff_id: string;
  amount: number;
  paid_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface SalaryAdvance {
  id: string;
  staff_id: string;
  staff_name?: string;
  amount: number;
  date: string;
  notes?: string;
  cleared?: boolean;
}

export interface ProjectItem {
  id: string;
  title: string;
  notes?: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  progress?: number;
  due_date?: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  staff_id?: string | null;
  staff_name?: string | null;
  staff_role?: string | null;
  action_type: string;
  details: string;
  timestamp: string;
}

export interface PointsLog {
  id: string;
  business_id: string;
  staff_id: string;
  points: number;
  reason?: string | null;
  date: string;
  awarded_by?: string | null;
  created_at?: string;
}

export interface LabelRecord {
  id: string;
  business_id: string;
  staff_id?: string | null;
  date: string;
  qty: number;
  item?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface PackageRecord {
  id: string;
  business_id: string;
  staff_id?: string | null;
  date: string;
  qty: number;
  item?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface MutationItem {
  id: string;
  action: 'insert' | 'update' | 'delete' | 'upsert';
  table: string;
  local_id?: string;
  target_id?: string;
  client_task_id?: string | null;
  data?: any;
  timestamp: number;
  retryCount?: number;
}

export type TabKey =
  | 'dashboard'
  | 'tasks'
  | 'accounts'
  | 'sales'
  | 'attendance'
  | 'daily'
  | 'weekly'
  | 'stockkeeper'
  | 'salary'
  | 'staff'
  | 'pricelist'
  | 'projects'
  | 'audit'
  | 'settings';
