import { useState, useEffect, useMemo } from 'react';
import { Employee } from '../types';
import { INITIAL_EMPLOYEES, calculateKPIResultSummary } from '../initialData';
import { fetchEmployeesFromFirestore, pushAllEmployeesToFirestore } from '../lib/firebaseSync';

// Day 2: Tách logic employee ra khỏi App.tsx
export function useEmployeeStore(currentUser: Employee | null) {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const normalize = (emp: Employee): Employee => {
      if (!emp || emp.isAdmin) return emp;
      const hasLegacyData = Array.isArray(emp.tasks) && emp.tasks.length > 0;
      return {
        ...emp,
        form1Saved: emp.form1Saved ?? (hasLegacyData ? true : false),
        form2Saved: emp.form2Saved ?? (hasLegacyData ? true : false),
      };
    };
    const saved = localStorage.getItem('civil_service_kpi_employees_v2');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter((emp: any) => {
            if (!emp) return false;
            if (emp.isAdmin) return true;
            if (!emp.username) return false;
            const key = emp.username.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).map(normalize);
        }
      } catch {}
    }
    return INITIAL_EMPLOYEES.map(normalize);
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('civil_service_kpi_employees_v2', JSON.stringify(employees));
  }, [employees]);

  const isDeptHead = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.role || '').toLowerCase();
    return r.includes('trưởng') || r.includes('giám đốc') || r.includes('bí thư') || r.includes('chủ tịch');
  }, [currentUser]);

  const isLeaderOrAdmin = useMemo(() => {
    return !!(currentUser && (currentUser.isAdmin || currentUser.orgType === 'Lãnh đạo' || currentUser.orgType === 'Ban Lãnh Đạo'));
  }, [currentUser]);

  const canViewDashboard = useMemo(() => isLeaderOrAdmin || isDeptHead, [isLeaderOrAdmin, isDeptHead]);

  const pendingApprovals = useMemo(() => {
    if (!currentUser) return [];
    if (isLeaderOrAdmin) {
      return employees.filter(e => !e.isAdmin && e.form1Saved && e.form2Saved && e.selfSignedCA && !e.deptHeadSignedCA);
    }
    if (isDeptHead) {
      return employees.filter(e => e.department === currentUser.department && !e.isAdmin && e.form1Saved && e.form2Saved && e.selfSignedCA && !e.deptHeadSignedCA);
    }
    return [];
  }, [employees, currentUser, isDeptHead, isLeaderOrAdmin]);

  const stats = useMemo(() => {
    const list = isDeptHead && !isLeaderOrAdmin && currentUser ? employees.filter(e => e.department === currentUser.department) : employees.filter(e => !e.isAdmin);
    const total = list.length;
    const excellent = list.filter(e => calculateKPIResultSummary(e.tasks).overallTaskPerformanceScore >= 99.5).length;
    const waiting = pendingApprovals.length;
    const notSubmitted = list.filter(e => !e.form1Saved || !e.form2Saved).length;
    return { total, excellent, waiting, notSubmitted };
  }, [employees, currentUser, isDeptHead, isLeaderOrAdmin, pendingApprovals]);

  return { employees, setEmployees, isDeptHead, isLeaderOrAdmin, canViewDashboard, pendingApprovals, stats };
}
