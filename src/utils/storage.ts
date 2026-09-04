import { User, KpiTask, LateRuleConfig, SelfAssessmentDoc, WorkflowSubmission, EvaluationPeriodConfig, DEPARTMENTS, WeeklySchedule } from '../types';
import { DEFAULT_LATE_CONFIG, evaluateTaskKpi } from './kpiLogic';

const STORAGE_KEYS = {
  USERS: 'kpi_admin_users_v6',
  TASKS: 'kpi_admin_tasks_v5',
  CONFIG: 'kpi_admin_late_config_v1',
  DOCS: 'kpi_admin_self_docs_v2',
  WORKFLOW: 'kpi_admin_workflow_subs_v4',
  PERIOD: 'kpi_admin_period_config_v1',
};

export const INITIAL_USERS: User[] = [];

export const INITIAL_TASKS: KpiTask[] = [];

export const INITIAL_DOCS: SelfAssessmentDoc[] = [];

// Helper functions for storage
export function getStoredUsers(): User[] {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  let parsed: User[] = [];
  if (data) {
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = [];
    }
  }

  // Ensure every user has username, password and role
  const normalized = (Array.isArray(parsed) ? parsed : []).map((u, idx) => {
    let username = u.username;
    if (!username) {
      const parts = (u.fullName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim().split(/\s+/);
      if (parts.length > 1) {
        const last = parts[parts.length - 1];
        const initials = parts.slice(0, parts.length - 1).map(p => p[0]).join('');
        username = `${last}.${initials}`;
      } else {
        username = `user_${idx + 1}`;
      }
    }
    
    let role = u.role;
    const pos = (u.position || '').toLowerCase();
    const dept = (u.department || '').toLowerCase();
    
    if (role === 'ADMIN') {
      role = 'ADMIN';
    } else if (
      dept.includes('lãnh đạo') || 
      pos.includes('cục trưởng') || 
      pos.includes('phó cục trưởng') || 
      pos.includes('lãnh đạo cục') ||
      pos.includes('ban lãnh đạo')
    ) {
      role = 'PROVINCE_LEADER';
    } else if (pos.includes('phó') || pos.includes('pho')) {
      role = 'STAFF';
    } else if (
      pos.includes('trưởng') || 
      pos.includes('chi cục trưởng') || 
      pos.includes('phụ trách') || 
      pos.includes('q.') || 
      pos.includes('quyền') ||
      pos.includes('đội trưởng')
    ) {
      role = 'DEPT_HEAD';
    } else if (!role) {
      role = 'STAFF';
    }

    return {
      ...u,
      username,
      password: u.password || '123456',
      role
    };
  });

  return normalized;
}


function safeSetItem(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      alert('Dữ liệu quá lớn, vượt quá giới hạn bộ nhớ cục bộ (5MB). Vui lòng xóa bớt một số dữ liệu hoặc chia nhỏ file để tiếp tục lưu.');
    }
  }
}

export function saveUsers(users: User[]): void {
  safeSetItem(STORAGE_KEYS.USERS, users);
}

export function getStoredTasks(): KpiTask[] {
  const data = localStorage.getItem(STORAGE_KEYS.TASKS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    return INITIAL_TASKS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_TASKS;
  }
}

export function saveTasks(tasks: KpiTask[]): void {
  safeSetItem(STORAGE_KEYS.TASKS, tasks);
}

export function getStoredLateConfig(): LateRuleConfig {
  const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_LATE_CONFIG));
    return DEFAULT_LATE_CONFIG;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_LATE_CONFIG;
  }
}

export function saveLateConfig(config: LateRuleConfig): void {
  safeSetItem(STORAGE_KEYS.CONFIG, config);
  // Re-evaluate stored tasks when rule changes.
  // QUAN TRỌNG: chỉ cập nhật scoreCalculated và daysLate theo quy tắc mới,
  // KHÔNG override status gốc từ Excel — status là nguồn sự thật duy nhất.
  const tasks = getStoredTasks();
  const updatedTasks = tasks.map(task => {
    const evalRes = evaluateTaskKpi(task, config);
    return {
      ...task,
      // Giữ nguyên status gốc, chỉ cập nhật điểm và số ngày trễ
      scoreCalculated: evalRes.scoreCalculated,
      daysLate: evalRes.daysLate,
    };
  });
  saveTasks(updatedTasks);
}

export const INITIAL_SUBMISSIONS: WorkflowSubmission[] = [];

export const INITIAL_PERIOD_CONFIG: EvaluationPeriodConfig = {
  periodName: 'Kỳ đánh giá Quý IV/2025 & Cả năm 2025',
  isLocked: false,
  periods: [
    'Năm công tác 2025-2026',
    'Quý IV năm 2025',
    'Quý I năm 2026',
    'Quý II năm 2026',
    'Quý III năm 2026',
    'Tháng 12 năm 2025',
    'Tháng 11 năm 2025',
    'Tháng 10 năm 2025',
  ],
};

export function getStoredDocs(): SelfAssessmentDoc[] {
  const data = localStorage.getItem(STORAGE_KEYS.DOCS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(INITIAL_DOCS));
    return INITIAL_DOCS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_DOCS;
  }
}

export function saveDocs(docs: SelfAssessmentDoc[]): void {
  safeSetItem(STORAGE_KEYS.DOCS, docs);
}

export function getStoredSubmissions(): WorkflowSubmission[] {
  const data = localStorage.getItem(STORAGE_KEYS.WORKFLOW);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.WORKFLOW, JSON.stringify(INITIAL_SUBMISSIONS));
    return INITIAL_SUBMISSIONS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

export function saveSubmissions(subs: WorkflowSubmission[]): void {
  safeSetItem(STORAGE_KEYS.WORKFLOW, subs);
}

export function getStoredPeriodConfig(): EvaluationPeriodConfig {
  const data = localStorage.getItem(STORAGE_KEYS.PERIOD);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(INITIAL_PERIOD_CONFIG));
    return INITIAL_PERIOD_CONFIG;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_PERIOD_CONFIG;
  }
}

export function savePeriodConfig(cfg: EvaluationPeriodConfig): void {
  safeSetItem(STORAGE_KEYS.PERIOD, cfg);
}

export function resetAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  localStorage.removeItem(STORAGE_KEYS.DOCS);
  localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
  localStorage.removeItem(STORAGE_KEYS.PERIOD);
  localStorage.removeItem('kpi_admin_forms_v1');
  localStorage.removeItem('kpi_admin_task_catalog_v1');
  localStorage.removeItem('kpi_admin_meetings_v1');
  localStorage.removeItem(WEEKLY_SCHEDULE_KEY);
  
  // Seed back initial
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_LATE_CONFIG));
  localStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(INITIAL_DOCS));
  localStorage.setItem(STORAGE_KEYS.WORKFLOW, JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(INITIAL_PERIOD_CONFIG));
  localStorage.setItem(WEEKLY_SCHEDULE_KEY, JSON.stringify(INITIAL_WEEKLY_SCHEDULES));
}

export const INITIAL_MEETINGS: any[] = [];

export function getStoredMeetings(): any[] {
  try {
    const raw = localStorage.getItem('kpi_admin_meetings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Silently ignore localStorage read errors
  }
  return [];
}
export function saveMeetings(meetings: any[]): void {
  try {
    localStorage.setItem('kpi_admin_meetings_v1', JSON.stringify(meetings));
  } catch {
    // Silently ignore localStorage write errors
  }
}

// Weekly Schedule Storage
const WEEKLY_SCHEDULE_KEY = 'kpi_admin_weekly_schedule_v1';

export const INITIAL_WEEKLY_SCHEDULES: WeeklySchedule[] = [];

export function getStoredWeeklySchedules(): WeeklySchedule[] {
  try {
    const raw = localStorage.getItem(WEEKLY_SCHEDULE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Silently ignore localStorage read errors
  }
  return [];
}

export function saveWeeklySchedules(schedules: WeeklySchedule[]): void {
  try {
    localStorage.setItem(WEEKLY_SCHEDULE_KEY, JSON.stringify(schedules));
  } catch {
    // Silently ignore localStorage write errors
  }
}

