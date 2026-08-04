-- FULL SCHEMA — Business Register
-- Safe to run on a brand-new Supabase project, AND safe to run again on top of
-- your existing project (it won't erase or duplicate anything already there).
-- Just paste this whole file into Supabase → SQL Editor → New query → Run.

create extension if not exists "pgcrypto";

-- ---------- Businesses ----------
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ---------- Staff ----------
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  phone text,
  role text not null default 'staff',
  pin text not null,
  created_at timestamptz default now()
);
-- make sure "owner" and "salesman" are allowed roles
alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check check (role in ('owner','manager','staff','salesman'));
-- NOTE: this file is safe to re-run any time. The one-time promotion of old
-- "manager" rows to "owner" lives only in migration-v2.sql — it is NOT repeated
-- here, because re-running it on every update would wrongly turn every future
-- Manager back into an Owner. If you're setting up fresh, there's nothing to promote.
-- salary_day: for 'monthly' frequency it's day-of-month (1-31); for 'weekly' it's
-- day-of-week using JS convention (0=Sunday..6=Saturday), so the range must allow 0.
alter table staff add column if not exists salary_day int;
alter table staff drop constraint if exists staff_salary_day_check;
alter table staff add constraint staff_salary_day_check check (salary_day is null or salary_day between 0 and 31);
alter table staff add column if not exists salary_frequency text check (salary_frequency in ('daily','weekly','monthly')) default 'monthly';

-- ---------- Tasks (one-off, with due date) ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  assigned_to uuid references staff(id) on delete set null,
  created_by uuid references staff(id) on delete set null,
  title text not null,
  notes text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  due_time time,
  status text not null default 'pending' check (status in ('pending','sent','done')),
  created_at timestamptz default now()
);

-- ---------- Attendance ----------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz
);
alter table attendance add column if not exists check_in_lat double precision;
alter table attendance add column if not exists check_in_lng double precision;
alter table attendance add column if not exists check_out_lat double precision;
alter table attendance add column if not exists check_out_lng double precision;
alter table attendance add column if not exists status text check (status in ('present','absent'));
alter table attendance add column if not exists marked_at timestamptz;
alter table attendance add column if not exists marked_by uuid references staff(id) on delete set null;
alter table attendance add column if not exists marked_lat double precision;
alter table attendance add column if not exists marked_lng double precision;

-- ---------- Sales orders (per staff, per day) ----------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  date date not null default current_date,
  order_value numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);

-- ---------- Everyday / recurring tasks ("Daily" tab) ----------
create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  assigned_to uuid references staff(id) on delete set null,
  title text not null,
  notes text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz default now()
);
alter table routines add column if not exists due_time time;
create table if not exists routine_log (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references routines(id) on delete cascade,
  date date not null default current_date,
  status text not null default 'pending' check (status in ('pending','done')),
  unique(routine_id, date)
);

-- ---------- Incentive points ----------
create table if not exists points_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  points numeric not null,
  reason text,
  date date not null default current_date,
  awarded_by uuid references staff(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------- Labelling log (what was labelled each day) ----------
create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  date date not null default current_date,
  qty numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);
alter table labels add column if not exists item text;

-- ---------- Packaging log (same shape as labels, for the Package tab) ----------
create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  date date not null default current_date,
  qty numeric not null default 0,
  item text,
  notes text,
  created_at timestamptz default now()
);

-- ---------- Trophy cabinet (three assignable awards) ----------
create table if not exists trophies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  trophy_key text not null,
  staff_id uuid references staff(id) on delete cascade,
  awarded_at timestamptz default now(),
  unique(business_id, trophy_key)
);

-- ---------- Stockkeeper daily check ----------
create table if not exists stock_checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  date date not null default current_date,
  stock_checked boolean not null default false,
  all_correct boolean,
  has_problems boolean,
  notes text,
  created_at timestamptz default now(),
  unique(business_id, staff_id, date)
);
alter table stock_checks add column if not exists checked_godowns text;

-- ---------- Salary payments ----------
create table if not exists salaries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  amount numeric not null default 0,
  paid_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- ---------- Sales targets (per staff, per month) ----------
create table if not exists sales_targets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  target_amount numeric not null default 0,
  unique(staff_id, month)
);

-- ---------- "I'm in" break-return log ----------
create table if not exists break_returns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  marked_at timestamptz not null default now(),
  lat double precision,
  lng double precision
);

-- ---------- Salesman opt-in live location sharing ----------
create table if not exists salesman_locations (
  staff_id uuid primary key references staff(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  lat double precision,
  lng double precision,
  is_sharing boolean not null default false,
  updated_at timestamptz
);

-- ---------- Weekly tasks (resets every Monday) ----------
create table if not exists weekly_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  assigned_to uuid references staff(id) on delete set null,
  title text not null,
  notes text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz default now()
);
create table if not exists weekly_task_log (
  id uuid primary key default gen_random_uuid(),
  weekly_task_id uuid references weekly_tasks(id) on delete cascade,
  week_start date not null,
  status text not null default 'pending' check (status in ('pending','done')),
  unique(weekly_task_id, week_start)
);

-- ---------- Access ----------
-- Internal-tool access: RLS is on, but policies allow full access to anyone with
-- your project's anon/publishable key (i.e. anyone with your app link, since the
-- key is baked into the app). Do not share your app link publicly.
alter table businesses enable row level security;
alter table staff enable row level security;
alter table tasks enable row level security;
alter table attendance enable row level security;
alter table sales enable row level security;
alter table routines enable row level security;
alter table routine_log enable row level security;
alter table points_log enable row level security;
alter table labels enable row level security;
alter table packages enable row level security;
alter table weekly_tasks enable row level security;
alter table weekly_task_log enable row level security;
alter table salaries enable row level security;
alter table trophies enable row level security;
alter table stock_checks enable row level security;
alter table sales_targets enable row level security;
alter table break_returns enable row level security;
alter table salesman_locations enable row level security;

drop policy if exists "allow all businesses" on businesses;
drop policy if exists "allow all staff" on staff;
drop policy if exists "allow all tasks" on tasks;
drop policy if exists "allow all attendance" on attendance;
drop policy if exists "allow all sales" on sales;
drop policy if exists "allow all routines" on routines;
drop policy if exists "allow all routine_log" on routine_log;
drop policy if exists "allow all points_log" on points_log;
drop policy if exists "allow all labels" on labels;
drop policy if exists "allow all packages" on packages;
drop policy if exists "allow all weekly_tasks" on weekly_tasks;
drop policy if exists "allow all weekly_task_log" on weekly_task_log;
drop policy if exists "allow all salaries" on salaries;
drop policy if exists "allow all trophies" on trophies;
drop policy if exists "allow all stock_checks" on stock_checks;
drop policy if exists "allow all sales_targets" on sales_targets;
drop policy if exists "allow all break_returns" on break_returns;
drop policy if exists "allow all salesman_locations" on salesman_locations;

create policy "allow all businesses" on businesses for all using (true) with check (true);
create policy "allow all staff" on staff for all using (true) with check (true);
create policy "allow all tasks" on tasks for all using (true) with check (true);
create policy "allow all attendance" on attendance for all using (true) with check (true);
create policy "allow all sales" on sales for all using (true) with check (true);
create policy "allow all routines" on routines for all using (true) with check (true);
create policy "allow all routine_log" on routine_log for all using (true) with check (true);
create policy "allow all points_log" on points_log for all using (true) with check (true);
create policy "allow all labels" on labels for all using (true) with check (true);
create policy "allow all packages" on packages for all using (true) with check (true);
create policy "allow all weekly_tasks" on weekly_tasks for all using (true) with check (true);
create policy "allow all weekly_task_log" on weekly_task_log for all using (true) with check (true);
create policy "allow all salaries" on salaries for all using (true) with check (true);
create policy "allow all trophies" on trophies for all using (true) with check (true);
create policy "allow all stock_checks" on stock_checks for all using (true) with check (true);
create policy "allow all sales_targets" on sales_targets for all using (true) with check (true);
create policy "allow all break_returns" on break_returns for all using (true) with check (true);
create policy "allow all salesman_locations" on salesman_locations for all using (true) with check (true);


-- ---------- Daily Accounts ----------
create table if not exists daily_accounts (
  is_checked boolean default false,
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  date date not null,
  total_sales numeric default 0,
  amount numeric default 0,
  vendors numeric default 0,
  credit numeric default 0,
  credit_received numeric default 0,
  gpay numeric default 0,
  ba_credit numeric default 0,
  expenses numeric default 0,
  personal_ac numeric default 0,
  salary_paid numeric default 0,
  adjustment numeric default 0,
  total numeric default 0,
  excess numeric default 0,
  less numeric default 0,
  notes text,
  created_at timestamptz default now(),
  unique(business_id, date)
);
alter table daily_accounts enable row level security;
drop policy if exists "allow all daily_accounts" on daily_accounts;
create policy "allow all daily_accounts" on daily_accounts for all using (true) with check (true);


-- ---------- Vendor Bills ----------
create table if not exists vendor_bills (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  vendor_name text,
  vendor text,
  supplier_name text,
  bill_no text,
  invoice_no text,
  amount numeric default 0,
  total_amount numeric default 0,
  bill_amount numeric default 0,
  bill_date date default current_date,
  due_date date,
  notes text,
  photo_url text,
  scanned_by uuid references staff(id) on delete set null,
  status text default 'pending',
  paid_at timestamptz,
  paid_by uuid references staff(id) on delete set null,
  created_at timestamptz default now()
);
alter table vendor_bills enable row level security;
drop policy if exists "allow all vendor_bills" on vendor_bills;
create policy "allow all vendor_bills" on vendor_bills for all using (true) with check (true);
