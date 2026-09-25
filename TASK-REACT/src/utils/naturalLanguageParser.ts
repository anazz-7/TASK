import { todayStr } from './dateUtils';
import { Staff, TaskPriority } from '../types';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getNextDayOfWeekStr(dayOfWeek: number): string {
  const d = new Date();
  const current = d.getDay();
  let diff = dayOfWeek - current;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

export interface ParsedTask {
  title: string;
  assignedTo: string | null;
  priority: TaskPriority;
  dueDate: string;
}

export function parseNaturalTaskText(
  rawText: string,
  staffList: Staff[] = [],
  defaultStaffId: string | null = null
): ParsedTask | null {
  let text = (rawText || '').trim();
  if (!text) return null;

  let assignedTo: string | null = defaultStaffId;
  let priority: TaskPriority = 'medium';
  let dueDate: string = todayStr();
  let title = text;

  // 1. Detect Assignee (@Name)
  const staffMatch = text.match(/@([a-zA-Z0-9_-]+)/);
  if (staffMatch && Array.isArray(staffList)) {
    const searchName = staffMatch[1].toLowerCase();
    const foundStaff = staffList.find(s => s.name && s.name.toLowerCase().includes(searchName));
    if (foundStaff) assignedTo = foundStaff.id;
    title = title.replace(staffMatch[0], '');
  }

  // 2. Detect Priority (!high, !low, !urgent, !medium)
  if (/!(high|urgent)/i.test(title)) {
    priority = 'high';
    title = title.replace(/!(high|urgent)/i, '');
  } else if (/!low/i.test(title)) {
    priority = 'low';
    title = title.replace(/!low/i, '');
  } else if (/!medium/i.test(title)) {
    priority = 'medium';
    title = title.replace(/!medium/i, '');
  }

  // 3. Detect Due Dates
  const now = new Date();
  if (/\b(tomorrow|tmw)\b/i.test(title)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    dueDate = localDateStr(d);
    title = title.replace(/\b(tomorrow|tmw)\b/i, '');
  } else if (/\b(today)\b/i.test(title)) {
    dueDate = localDateStr(now);
    title = title.replace(/\b(today)\b/i, '');
  } else if (/\b(monday|mon)\b/i.test(title)) {
    dueDate = getNextDayOfWeekStr(1);
    title = title.replace(/\b(monday|mon)\b/i, '');
  } else if (/\b(tuesday|tue)\b/i.test(title)) {
    dueDate = getNextDayOfWeekStr(2);
    title = title.replace(/\b(tuesday|tue)\b/i, '');
  } else if (/\b(wednesday|wed)\b/i.test(title)) {
    dueDate = getNextDayOfWeekStr(3);
    title = title.replace(/\b(wednesday|wed)\b/i, '');
  } else if (/\b(thursday|thu)\b/i.test(title)) {
    dueDate = getNextDayOfWeekStr(4);
    title = title.replace(/\b(thursday|thu)\b/i, '');
  } else if (/\b(friday|fri)\b/i.test(title)) {
    dueDate = getNextDayOfWeekStr(5);
    title = title.replace(/\b(friday|fri)\b/i, '');
  } else if (/\b(saturday|sat)\b/i.test(title)) {
    dueDate = getNextDayOfWeekStr(6);
    title = title.replace(/\b(saturday|sat)\b/i, '');
  } else if (/\b(sunday|sun)\b/i.test(title)) {
    dueDate = getNextDayOfWeekStr(0);
    title = title.replace(/\b(sunday|sun)\b/i, '');
  }

  title = title.replace(/\s+/g, ' ').trim();
  if (!title) title = rawText.trim();

  return { title, assignedTo, priority, dueDate };
}
