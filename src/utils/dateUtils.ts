export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentMonthStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const today = todayStr();
  if (dateStr === today) return 'TODAY';
  
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yStr) return 'YESTERDAY';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  if (dateStr === tStr) return 'TOMORROW';

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatTime(isoOrTime?: string | null): string {
  if (!isoOrTime) return '';
  try {
    const d = new Date(isoOrTime);
    if (!isNaN(d.getTime())) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
  } catch(e) {}
  return String(isoOrTime);
}

export function isOverdue(dueDate?: string | null, status?: string): boolean {
  if (!dueDate || status === 'done' || status === 'completed') return false;
  return dueDate < todayStr();
}

export function initials(name?: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function fmt(n: number | string | null | undefined): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '0';
  return Number(n).toLocaleString('en-IN');
}

export function fmtCurrency(n: number | string | null | undefined): string {
  return '₹' + fmt(n);
}

export function getWeekStartDate(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(date.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}
