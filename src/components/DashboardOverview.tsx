import { formatDate, formatWeekRange } from "../utils/dateUtils";
import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ListTodo, 
  TrendingUp, 
  Building2, 
  Search, 
  Filter, 
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  User as UserIcon,
  Users
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  LabelList
, ComposedChart, Line } from 'recharts';
import { User, KpiTask, DEPARTMENTS, WeeklySchedule, WorkflowSubmission, EvaluationPeriodConfig } from '../types/index';
import { Award, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getTaskBlockGroup,
  isDepartmentMatch,
  classifyTaskStatus,
  resolveCanonicalDepartment,
} from '../utils/departmentClassification';
import { computeUserScorecardList, computeClassificationStats } from '../utils/evaluationClassification';

// Constants for Weekly Schedule Matrix
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_LABELS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SESSIONS = ['MORNING', 'AFTERNOON'];
const SESSION_LABELS = { MORNING: 'Sáng', AFTERNOON: 'Chiều' };

interface DashboardOverviewProps {
  tasks: KpiTask[];
  schedules?: WeeklySchedule[];
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  onNavigateToTasks?: () => void;
  globalRole?: string;
  users?: User[];
  submissions?: WorkflowSubmission[];
  periodConfig?: EvaluationPeriodConfig;
}

// Normalize a department/status string for robust matching:
// - NFC unicode normalization (fixes NFD vs NFC Vietnamese tone differences)
// - trim extra whitespace (including NBSP)
// - collapse internal multiple spaces
// - lowercase for case-insensitive comparison
const normStr = (s: string): string =>
  (s || '')
    .normalize('NFC')
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ') // NBSP/zero-width -> space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Custom tooltip that shows the full department name (fullName) when available,
// so truncated X-axis labels don't hide information.
const DeptTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const fullName = payload[0]?.payload?.fullName || label;
  return (
    <div style={{ fontSize: '11px', padding: '6px 8px', background: '#fff', border: '1px solid #c6d8c8', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 700, color: '#2d4a36', marginBottom: 2 }}>{fullName}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || p.fill || '#31523b', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};


export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tasks = [],
  schedules = [],
  selectedDepartment,
  setSelectedDepartment,
  addToast,
  onNavigateToTasks,
  globalRole,
  users = [],
  submissions = [],
  periodConfig,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCardFilter, setActiveCardFilter] = useState<'ALL' | 'UNFINISHED' | 'LATE' | 'COMPLETED' | 'COMPLETED_LATE'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | 'PHONG' | 'VUNG1' | 'VUNG2'>('ALL');

  // Current week start date (Monday)
  const [weekStartDate] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const weekStartDateStr = weekStartDate.toISOString().split('T')[0];

  // (stats moved below — it now derives from phongStats + vung1Stats + vung2Stats
  //  so that Tổng chung EXACTLY equals the sum of the 3 region blocks.)

  // Split DEPARTMENTS into categories
  const phongList = DEPARTMENTS.slice(1, 6);
  const vung1List = DEPARTMENTS.slice(6, 13);
  const vung2List = DEPARTMENTS.slice(13, 20);

  // Consolidated Single-Pass Metrics Calculation across all 4597 tasks
  const {
    allStats,
    stats,
    phongData,
    vung1Data,
    vung2Data,
    phongStats,
    vung1Stats,
    vung2Stats,
    blockData,
    stats3Blocks
  } = useMemo(() => {
    const allTasks = tasks || [];
    const total = allTasks.length;

    // Fast unit counters map for all 19 units
    type UnitCounter = {
      completed: number;
      completedLate: number;
      unfinished: number;
      unfinishedLate: number;
      total: number;
    };
    const unitMap = new Map<string, UnitCounter>();
    for (let i = 1; i <= 19; i++) {
      unitMap.set(DEPARTMENTS[i], {
        completed: 0,
        completedLate: 0,
        unfinished: 0,
        unfinishedLate: 0,
        total: 0
      });
    }

    let completed = 0;
    let completedLate = 0;
    let unfinished = 0;
    let late = 0;

    for (let i = 0; i < allTasks.length; i++) {
      const t = allTasks[i];
      const cat = classifyTaskStatus(t.status);
      if (cat === 'COMPLETED') completed++;
      else if (cat === 'COMPLETED_LATE') completedLate++;
      else if (cat === 'LATE') late++;
      else unfinished++;

      const canonical = resolveCanonicalDepartment(t.department, t.userName, users);
      if (canonical) {
        const u = unitMap.get(canonical);
        if (u) {
          u.total++;
          if (cat === 'COMPLETED') u.completed++;
          else if (cat === 'COMPLETED_LATE') u.completedLate++;
          else if (cat === 'LATE') u.unfinishedLate++;
          else u.unfinished++;
        }
      }
    }

    const completionRate = total ? Math.round(((completed + completedLate) / total) * 100) : 0;
    const lateRate = total ? Math.round(((late + completedLate) / total) * 100) : 0;
    const allStatsResult = { total, completed, completedLate, unfinished, late, completionRate, lateRate };
    const statsResult = { total, completed, nearDeadline: 0, late, completedLate, unfinished, completionRate, lateRate };

    const mapToUnitItem = (d: string) => {
      const u = unitMap.get(d) || { completed: 0, completedLate: 0, unfinished: 0, unfinishedLate: 0, total: 0 };
      const shortName = d
        .replace('Phòng Thống kê ', 'P.TK ')
        .replace('Thống kê cơ sở ', 'CS ')
        .replace('Thống kê cở sở ', 'CS ');
      return {
        name: shortName.length > 20 ? shortName.slice(0, 20) + '…' : shortName,
        fullName: d,
        'Tổng việc': u.total,
        'Hoàn thành': u.completed,
        'Hoàn thành trễ hạn': u.completedLate,
        'Chưa hoàn thành': u.unfinished,
        'Chưa hoàn thành trễ hạn': u.unfinishedLate,
        'Tổng hoàn thành': u.completed + u.completedLate,
        'Tổng chưa hoàn thành': u.unfinished + u.unfinishedLate
      };
    };

    const pData = phongList.map(mapToUnitItem);
    const v1Data = vung1List.map(mapToUnitItem);
    const v2Data = vung2List.map(mapToUnitItem);

    const calcGroupStats = (dataList: ReturnType<typeof mapToUnitItem>[]) => {
      return dataList.reduce((acc, curr) => {
        acc.total += curr['Tổng việc'];
        acc.completed += curr['Hoàn thành'];
        acc.completedLate += curr['Hoàn thành trễ hạn'];
        acc.unfinished += curr['Chưa hoàn thành'];
        acc.unfinishedLate += curr['Chưa hoàn thành trễ hạn'];
        acc.totalCompleted += curr['Hoàn thành'] + curr['Hoàn thành trễ hạn'];
        acc.totalUnfinished += curr['Chưa hoàn thành'] + curr['Chưa hoàn thành trễ hạn'];
        return acc;
      }, { total: 0, completed: 0, completedLate: 0, unfinished: 0, unfinishedLate: 0, totalCompleted: 0, totalUnfinished: 0 });
    };

    const pStats = calcGroupStats(pData);
    const v1Stats = calcGroupStats(v1Data);
    const v2Stats = calcGroupStats(v2Data);

    const sumUp = (dataList: ReturnType<typeof mapToUnitItem>[]) => dataList.reduce((acc, curr) => ({
      'Tổng việc': acc['Tổng việc'] + curr['Tổng việc'],
      'Hoàn thành': acc['Hoàn thành'] + curr['Hoàn thành'],
      'Hoàn thành trễ hạn': acc['Hoàn thành trễ hạn'] + curr['Hoàn thành trễ hạn'],
      'Chưa hoàn thành': acc['Chưa hoàn thành'] + curr['Chưa hoàn thành'],
      'Chưa hoàn thành trễ hạn': acc['Chưa hoàn thành trễ hạn'] + curr['Chưa hoàn thành trễ hạn'],
      'Trễ hạn': acc['Trễ hạn'] + curr['Hoàn thành trễ hạn'] + curr['Chưa hoàn thành trễ hạn']
    }), { 'Tổng việc': 0, 'Hoàn thành': 0, 'Hoàn thành trễ hạn': 0, 'Chưa hoàn thành': 0, 'Chưa hoàn thành trễ hạn': 0, 'Trễ hạn': 0 });

    const bData = [
      { name: '5 Phòng', ...sumUp(pData) },
      { name: 'Vùng 1', ...sumUp(v1Data) },
      { name: 'Vùng 2', ...sumUp(v2Data) }
    ];

    const s3Blocks = {
      total: pStats.total + v1Stats.total + v2Stats.total,
      completed: pStats.completed + v1Stats.completed + v2Stats.completed,
      completedLate: pStats.completedLate + v1Stats.completedLate + v2Stats.completedLate,
      unfinished: pStats.unfinished + v1Stats.unfinished + v2Stats.unfinished,
      late: pStats.unfinishedLate + v1Stats.unfinishedLate + v2Stats.unfinishedLate,
      completionRate: 0,
    };

    return {
      allStats: allStatsResult,
      stats: statsResult,
      phongData: pData,
      vung1Data: v1Data,
      vung2Data: v2Data,
      phongStats: pStats,
      vung1Stats: v1Stats,
      vung2Stats: v2Stats,
      blockData: bData,
      stats3Blocks: s3Blocks
    };
  }, [tasks, users]);

  // Scorecard list matching exactly column "Xếp loại thi đua" in EvaluationResults
  const scorecardList = useMemo(() => {
    // If a specific department is selected, filter users to that department
    const targetUsers = (selectedDepartment && selectedDepartment.toUpperCase() !== 'ALL')
      ? (users || []).filter(u => isDepartmentMatch(u.department, selectedDepartment, undefined, users))
      : (users || []);

    return computeUserScorecardList(targetUsers, submissions || [], tasks || [], periodConfig);
  }, [users, submissions, tasks, periodConfig, selectedDepartment]);

  const classificationStats = useMemo(() => {
    return computeClassificationStats(scorecardList);
  }, [scorecardList]);

  // Chart data for "Đánh giá xếp loại cán bộ" based directly on column "Xếp loại thi đua"
  const staffRatings = useMemo(() => {
    const list = [
      { name: 'HT xuất sắc', value: classificationStats.excellent, color: '#1a65ff', fullLabel: 'Hoàn thành xuất sắc nhiệm vụ' },
      { name: 'HT tốt NV', value: classificationStats.good, color: '#03c39a', fullLabel: 'Hoàn thành tốt nhiệm vụ' },
      { name: 'HT nhiệm vụ', value: classificationStats.completed, color: '#f59e0b', fullLabel: 'Hoàn thành nhiệm vụ' },
      { name: 'Không HT', value: classificationStats.failed, color: '#fe275d', fullLabel: 'Không hoàn thành nhiệm vụ' }
    ];

    if (classificationStats.unclassified > 0) {
      list.push({ 
        name: 'Chưa xếp loại', 
        value: classificationStats.unclassified, 
        color: '#94a3b8', 
        fullLabel: 'Chưa xếp loại thi đua' 
      });
    }

    return list;
  }, [classificationStats]);

  const completionDonutData = useMemo(() => {
    // Đã hoàn thành = đúng hạn + trễ hạn (đều là đã xong)
    // Chưa hoàn thành = chưa HT trong hạn + chưa HT trễ hạn
    return [
      { name: 'Đã hoàn thành', value: stats.completed + stats.completedLate, color: '#1a65ff' },
      { name: 'Chưa hoàn thành', value: Math.max(0, stats.unfinished + stats.late), color: '#dae6db' },
    ];
  }, [stats]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Filtered tasks table
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const isAllDept = !selectedDepartment || selectedDepartment.toUpperCase() === 'ALL';
    const activeFilter = activeCardFilter !== 'ALL' ? activeCardFilter : statusFilter;

    return (tasks || []).filter(t => {
      // Group Filter Logic
      if (selectedGroup !== 'ALL') {
        const taskGrp = getTaskBlockGroup(t.department, t.userName, users);
        if (taskGrp !== selectedGroup) return false;
      }

      // Department filter logic (if a specific department is chosen)
      if (!isAllDept) {
        if (!isDepartmentMatch(t.department, selectedDepartment, t.userName, users)) return false;
      }

      // Status filter logic
      if (activeFilter !== 'ALL') {
        const cat = classifyTaskStatus(t.status);
        if (cat !== activeFilter) return false;
      }

      // Search query filter
      if (q) {
        const matchesName = (t.taskName || '').toLowerCase().includes(q);
        const matchesUser = (t.userName || '').toLowerCase().includes(q);
        const matchesDept = (t.department || '').toLowerCase().includes(q);
        if (!matchesName && !matchesUser && !matchesDept) return false;
      }

      return true;
    });
  }, [tasks, selectedDepartment, statusFilter, activeCardFilter, searchQuery, selectedGroup, users]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDepartment, statusFilter, activeCardFilter, searchQuery, selectedGroup]);

  useEffect(() => {
    if (selectedDepartment !== 'ALL') setSelectedGroup('ALL');
  }, [selectedDepartment]);

  // Excel Export
  const handleExportExcel = () => {
    const exportRows = filteredTasks.map((t, index) => ({
      'STT': index + 1,
      'Tên công việc': t.taskName,
      'Loại công việc': t.jobType || 'Kế hoạch',
      'Người chủ trì': t.userName,
      'Đơn vị phối hợp': t.coopUnit || '',
      'Ngày giao việc': t.assignedDate || '',
      'Hạn hoàn thành': t.planDeadline,
      'Tình trạng': t.status,
      'Lý do trễ hạn': t.lateReason || '',
      'Phòng ban': t.department || 'Chưa phân bổ',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard_Tasks');
    XLSX.writeFile(wb, `Dashboard_BaoCao_KPI_${new Date().toISOString().slice(0, 10)}.xlsx`);
    addToast('success', 'Xuất Excel Thành Công!', `Đã xuất ${exportRows.length} công việc ra file Excel.`);
  };

  return (
    <div className="min-h-screen bg-[#eef3ef] p-2 font-sans">
      <div className="w-full mx-auto space-y-3">
        
        {/* MAIN HEADER - Larger logo */}
        <div className="bg-[#78a57b] py-4 px-6 text-center rounded-sm shadow-xs flex items-center justify-center gap-3 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          <div className="text-left">
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-widest uppercase drop-shadow-xs leading-tight">
              KPI DASHBOARD TỔNG HỢP
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-0.5 tracking-wide">Quản Lý Tiến Độ & Hiệu Suất Công Việc</p>
          </div>
        </div>

        
{/* MAIN LAYOUT: Balanced Equal 2 Columns (50% - 50%) */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 w-full">
           <div className="flex flex-col gap-2.5 min-w-0">
          
          
          {/* ================= QUADRANT 1: TỔNG QUAN CHUNG ================= */}
          <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden">
            <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide">
              1. TỔNG CHUNG (= KHỐI CÁC PHÒNG + KHỐI VÙNG 1 + KHỐI VÙNG 2)
            </div>
            
            {/* KPI Row - 5 Equal Width Cards using Flexbox */}
            <div className="flex flex-wrap gap-2 p-2 bg-[#f5f9f6] border-b border-[#c6d8c8]" style={{ width: '100%' }}>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2d6e3e] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('ALL'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Tổng số</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{stats.total}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2563eb] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{stats.completed}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#8b5cf6] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED_LATE'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{stats.completedLate}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#e11d48] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('UNFINISHED'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{stats.unfinished}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#0d9488] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('LATE'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{stats.late}</span>
              </div>
            </div>
            {/* Charts Area */}
            <div className="flex flex-col sm:flex-row h-[280px]">
              {/* Staff Rating Bar Chart */}
              <div className="w-full sm:w-[60%] pt-2 pb-2 pr-2 border-r border-[#e8efe9] flex flex-col">
                <div 
                  className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-emerald-700 transition-colors mt-2 mb-2 group"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'eval_results' }))}
                  title="Nhấn để xem bảng chi tiết tại menu Kết quả đánh giá"
                >
                  <span className="text-[11px] font-semibold text-[#4f6f56] group-hover:text-emerald-700 tracking-wide text-center">
                    ĐÁNH GIÁ XẾP LOẠI CÁN BỘ {selectedDepartment && selectedDepartment !== 'ALL' ? `(${selectedDepartment})` : ''}
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-bold">→</span>
                </div>
                <div className="flex-1 min-h-0 relative flex flex-col" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffRatings} layout="vertical" margin={{ top: 5, right: 28, left: -5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4ebe5" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#7a8c7f' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "#2d4a36", fontWeight: "600" }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(241,245,242,0.7)' }} 
                      formatter={(value: any, name: any, item: any) => [
                        `${value} cán bộ`,
                        item?.payload?.fullLabel || name
                      ]}
                      contentStyle={{ fontSize: '11px', padding: '6px 10px', borderColor: '#c6d8c8', borderRadius: '4px' }} 
                    />
                    <Bar dataKey="value" barSize={18} radius={[0, 3, 3, 0]} isAnimationActive={false}>
                       <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 700, fill: '#2d4a36' }} />
                       {staffRatings.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
              
              {/* Completion Donut Chart */}
              <div className="w-full sm:w-[40%] flex flex-col">
                <div className="h-[100%] p-2 relative flex flex-col items-center justify-center rounded" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  <span className="text-[11px] font-semibold text-[#4f6f56] absolute top-4 text-center tracking-wide">TỶ LỆ HOÀN THÀNH<br/>TRÊN TỔNG SỐ</span>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 mt-6">
                     <span className="text-[20px] font-bold text-[#2563eb]">{stats.completionRate}%</span>
                     <span className="text-[10px] font-medium text-[#4f6f56]">Đúng hạn</span>
                  </div>
                  <ResponsiveContainer width="100%" height="80%" className="z-10 mt-6">
                    <PieChart>
                      <Pie data={completionDonutData} innerRadius="65%" outerRadius="90%" dataKey="value" stroke="none" isAnimationActive={false}>
                        <Cell fill="#2563eb" />
                        <Cell fill="#dae6db" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '10px', padding: '2px 6px', borderColor: '#c6d8c8' }} />
                      <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#4f6f56', paddingBottom: 2 }} formatter={(value) => <span style={{ color: '#4f6f56' }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          
{/* ================= QUADRANT 3: KHỐI VÙNG 1 ================= */}
           <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden">
             <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide">
               3. KHỐI VÙNG 1
             </div>
            {/* KPI Row - 5 Equal Width Cards using Flexbox */}
            <div className="flex flex-wrap gap-2 p-2 bg-[#f5f9f6] border-b border-[#c6d8c8]" style={{ width: '100%' }}>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2d6e3e] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('ALL'); setSelectedGroup('VUNG1'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Tổng số</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung1Stats.total}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2563eb] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED'); setSelectedGroup('VUNG1'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung1Stats.completed}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#8b5cf6] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED_LATE'); setSelectedGroup('VUNG1'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung1Stats.completedLate}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#e11d48] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('UNFINISHED'); setSelectedGroup('VUNG1'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung1Stats.unfinished}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#0d9488] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('LATE'); setSelectedGroup('VUNG1'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung1Stats.unfinishedLate}</span>
              </div>
            </div>
            {/* Charts Area */}
            <div className="flex flex-col sm:flex-row h-[280px]">
              {/* Composed Chart for Vung 1 */}
              <div className="w-full sm:w-[60%] pt-2 pb-2 pr-2 border-r border-[#e8efe9] flex flex-col">
                 <span className="text-[11px] font-semibold text-[#4f6f56] text-center w-full block mt-2 mb-2 tracking-wide">CHI TIẾT ĐƠN VỊ</span>
                <div className="flex-1 min-h-0 relative flex flex-col" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={vung1Data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ebe5" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#2d4a36", fontWeight: "600" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#7a8c7f" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(241,245,242,0.7)" }} content={<DeptTooltip />} />
                    <Legend verticalAlign="top" height={24} iconType="rect" wrapperStyle={{ fontSize: "10px", color: "#4f6f56" }} />
                    <Bar dataKey="Tổng việc" name="Tổng CV" fill="#cbd5e1" barSize={20} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Tổng hoàn thành" name="Hoàn thành" stroke="#2563eb" strokeWidth={3.5} dot={{ r: 5, fill: "#2563eb" }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                </div>
              </div>
              
              {/* Solid Pie Chart for Vung 1 */}
              <div className="w-full sm:w-[40%] flex flex-col">
                <div className="h-[100%] p-2 relative flex flex-col items-center justify-center rounded" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  <span className="text-[11px] font-semibold text-[#4f6f56] absolute top-4 text-center tracking-wide">TỶ LỆ HOÀN THÀNH<br/>TRÊN TỔNG SỐ</span>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                     <span className="text-[20px] font-bold text-[#2563eb]">{vung1Stats.total ? Math.round(((vung1Stats.completed + vung1Stats.completedLate) / vung1Stats.total) * 100) : 0}%</span>
                  </div>
                  <ResponsiveContainer width="100%" height="80%" className="z-10 mt-6">
                    <PieChart>
                      <Pie data={[
                        { name: "Đã hoàn thành", value: vung1Stats.completed + vung1Stats.completedLate },
                        { name: "Chưa hoàn thành", value: vung1Stats.unfinished + vung1Stats.unfinishedLate }
                      ]} innerRadius="65%" outerRadius="85%" dataKey="value" stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                        <Cell fill="#2563eb" />
                        <Cell fill="#e11d48" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "10px", padding: "2px 6px", borderColor: "#c6d8c8" }} />
                      <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#4f6f56', paddingBottom: 2 }} formatter={(value) => <span style={{ color: '#4f6f56' }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
</div>
           </div>
           <div className="flex flex-col gap-2.5 min-w-0">
{/* ================= QUADRANT 2: KHỐI CÁC PHÒNG ================= */}
            <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden">
              <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide">
                2. KHỐI CÁC PHÒNG
              </div>
              {/* KPI Row - 5 Equal Width Cards using Flexbox */}
              <div className="flex flex-wrap gap-2 p-2 bg-[#f5f9f6] border-b border-[#c6d8c8]" style={{ width: '100%' }}>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2d6e3e] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('ALL'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Tổng số</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.total}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2563eb] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.completed}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#8b5cf6] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED_LATE'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành trễ hạn</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.completedLate}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#e11d48] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('UNFINISHED'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.unfinished}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#0d9488] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('LATE'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành trễ hạn</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.unfinishedLate}</span>
                </div>
              </div>
             {/* Charts Area */}
             <div className="flex flex-col sm:flex-row h-[280px]">
               {/* Clustered Vertical Bar Chart for Phong */}
               <div className="w-full sm:w-[60%] pt-2 pb-2 pr-2 border-r border-[#e8efe9] flex flex-col">
                  <span className="text-[11px] font-semibold text-[#4f6f56] text-center w-full block mt-2 mb-2 tracking-wide">CHI TIẾT ĐƠN VỊ</span>
                 <div className="flex-1 min-h-0 relative flex flex-col" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={phongData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%" barGap={2}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ebe5" />
                     <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#2d4a36", fontWeight: "600" }} axisLine={false} tickLine={false} />
                     <YAxis tick={{ fontSize: 9, fill: "#7a8c7f" }} axisLine={false} tickLine={false} />
                     <Tooltip cursor={{ fill: "rgba(241,245,242,0.7)" }} content={<DeptTooltip />} />
                     <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: "10px", color: "#4f6f56" }} />
                     <Bar dataKey="Tổng hoàn thành" name="Hoàn thành" fill="#2563eb" barSize={14} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                     <Bar dataKey="Tổng chưa hoàn thành" name="Chưa HT" fill="#e11d48" barSize={14} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                   </BarChart>
                 </ResponsiveContainer>
                 </div>
               </div>
               
               {/* Solid Pie Chart for Phong */}
               <div className="w-full sm:w-[40%] flex flex-col">
                 <div className="h-[100%] p-2 relative flex flex-col items-center justify-center rounded" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                   <span className="text-[11px] font-semibold text-[#4f6f56] absolute top-4 text-center tracking-wide">TỶ LỆ HOÀN THÀNH<br/>TRÊN TỔNG SỐ</span>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                      <span className="text-[20px] font-bold text-[#2563eb]">{phongStats.total ? Math.round(((phongStats.completed + phongStats.completedLate) / phongStats.total) * 100) : 0}%</span>
                   </div>
                   <ResponsiveContainer width="100%" height="80%" className="z-10 mt-6">
                     <PieChart>
                       <Pie data={[
                         { name: "Đã hoàn thành", value: phongStats.completed + phongStats.completedLate },
                         { name: "Chưa hoàn thành", value: phongStats.unfinished + phongStats.unfinishedLate }
                       ]} innerRadius="65%" outerRadius="85%" dataKey="value" stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                         <Cell fill="#2563eb" />
                         <Cell fill="#e11d48" />
                       </Pie>
                       <Tooltip contentStyle={{ fontSize: "10px", padding: "2px 6px", borderColor: "#c6d8c8" }} />
                       <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#4f6f56', paddingBottom: 2 }} formatter={(value) => <span style={{ color: '#4f6f56' }}>{value}</span>} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
               </div>
             </div>
           </div>
        {/* ================= QUADRANT 4: KHỐI VÙNG 2 ================= */}
           <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden">
            <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide">
              4. KHỐI VÙNG 2
            </div>
            {/* KPI Row - 5 Equal Width Cards using Flexbox */}
            <div className="flex flex-wrap gap-2 p-2 bg-[#f5f9f6] border-b border-[#c6d8c8]" style={{ width: '100%' }}>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2d6e3e] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('ALL'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Tổng số</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.total}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2563eb] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.completed}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#8b5cf6] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED_LATE'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.completedLate}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#e11d48] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('UNFINISHED'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.unfinished}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#0d9488] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('LATE'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.unfinishedLate}</span>
              </div>
            </div>
            {/* Charts Area */}
            <div className="flex flex-col sm:flex-row h-[280px]">
              {/* Area Chart */}
              <div className="w-full sm:w-[60%] pt-2 pb-2 pr-2 border-r border-[#e8efe9] flex flex-col">
                 <span className="text-[11px] font-semibold text-[#4f6f56] text-center w-full block mt-2 mb-2 tracking-wide">CHI TIẾT ĐƠN VỊ</span>
                <div className="flex-1 min-h-0 relative flex flex-col" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={vung2Data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCHT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ebe5" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#2d4a36", fontWeight: "600" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#7a8c7f" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#f1f5f2" }} content={<DeptTooltip />} />
                    <Legend verticalAlign="top" height={24} iconType="plainline" wrapperStyle={{ fontSize: "10px", color: "#4f6f56" }} />
                    <Area type="monotone" strokeWidth={2.5} dataKey="Tổng hoàn thành" name="Hoàn thành" stroke="#2563eb" fillOpacity={1} fill="url(#colorHT)" isAnimationActive={false} />
                    <Area type="monotone" strokeWidth={2.5} dataKey="Tổng chưa hoàn thành" name="Chưa HT" stroke="#e11d48" fillOpacity={1} fill="url(#colorCHT)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </div>
              
              {/* Donut Chart Q4 */}
              <div className="w-full sm:w-[40%] flex flex-col">
                <div className="h-[100%] p-2 relative flex flex-col items-center justify-center rounded" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  <span className="text-[11px] font-semibold text-[#4f6f56] absolute top-4 text-center tracking-wide">TỶ LỆ HOÀN THÀNH<br/>TRÊN TỔNG SỐ</span>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                     <span className="text-[20px] font-bold text-[#2563eb]">{vung2Stats.total ? Math.round(((vung2Stats.completed + vung2Stats.completedLate) / vung2Stats.total) * 100) : 0}%</span>
                  </div>
                  <ResponsiveContainer width="100%" height="80%" className="z-10 mt-6">
                    <PieChart>
                      <Pie data={[
                        { name: "Đã hoàn thành", value: vung2Stats.completed + vung2Stats.completedLate },
                        { name: "Chưa hoàn thành", value: vung2Stats.unfinished + vung2Stats.unfinishedLate }
                      ]} innerRadius="65%" outerRadius="85%" dataKey="value" stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                        <Cell fill="#2563eb" />
                        <Cell fill="#e11d48" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "10px", padding: "2px 6px", borderColor: "#c6d8c8" }} />
                      <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#4f6f56', paddingBottom: 2 }} formatter={(value) => <span style={{ color: '#4f6f56' }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
</div>
            </div>
          </div>
        </div>
      </div>
        </div>

        {/* ================= DATA TABLE ================= */}
        <div id="dataTable" className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col mt-3 scroll-mt-20">
          <div className="bg-[#93b995] text-white text-[10px] font-bold py-1.5 uppercase tracking-widest flex justify-between px-4 items-center">
            <span>BẢNG DỮ LIỆU CHI TIẾT</span>
            <button onClick={handleExportExcel} className="hover:text-[#dae6db] flex items-center gap-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Xuất Excel
            </button>
          </div>
          <div className="p-2 border-b border-[#c6d8c8] flex flex-wrap items-center justify-between bg-[#f5f9f6] gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[180px]">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2 top-1.5 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                <input 
                  type="text"
                  placeholder="Tìm kiếm công việc, cán bộ, đơn vị..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 border border-[#c6d8c8] rounded-sm text-[11px] bg-white text-[#31523b] outline-none focus:border-[#5fa070]"
                />
              </div>
              <select 
                className="border border-[#c6d8c8] rounded-sm text-[11px] px-2 py-1 bg-white text-[#31523b] outline-none focus:border-[#5fa070]"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value as any)}
              >
                <option value="ALL">Tất cả 3 khối</option>
                <option value="PHONG">Khối các phòng</option>
                <option value="VUNG1">Khối vùng 1</option>
                <option value="VUNG2">Khối vùng 2</option>
              </select>
              <select 
                className="border border-[#c6d8c8] rounded-sm text-[11px] px-2 py-1 bg-white text-[#31523b] outline-none focus:border-[#5fa070]"
                value={activeCardFilter !== 'ALL' ? activeCardFilter : statusFilter}
                onChange={(e) => {
                  setActiveCardFilter('ALL');
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="ALL">Tất cả tình trạng</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="COMPLETED_LATE">Hoàn thành trễ hạn</option>
                <option value="UNFINISHED">Chưa hoàn thành</option>
                <option value="LATE">Chưa hoàn thành trễ hạn</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              {/* Active filter badge */}
              {activeCardFilter !== 'ALL' && (
                <span className="text-[10px] px-2 py-0.5 rounded font-medium border flex items-center gap-1 shadow-2xs"
                  style={{
                    backgroundColor: activeCardFilter === 'COMPLETED' ? '#eff6ff' : activeCardFilter === 'COMPLETED_LATE' ? '#f5f3ff' : activeCardFilter === 'LATE' ? '#f0fdfa' : '#fff1f2',
                    borderColor: activeCardFilter === 'COMPLETED' ? '#93c5fd' : activeCardFilter === 'COMPLETED_LATE' ? '#c4b5fd' : activeCardFilter === 'LATE' ? '#99f6e4' : '#fecdd3',
                    color: activeCardFilter === 'COMPLETED' ? '#1d4ed8' : activeCardFilter === 'COMPLETED_LATE' ? '#6d28d9' : activeCardFilter === 'LATE' ? '#0f766e' : '#be123c',
                  }}
                >
                  Đang lọc thẻ: <strong>
                    {activeCardFilter === 'COMPLETED' && 'Hoàn thành'}
                    {activeCardFilter === 'COMPLETED_LATE' && 'Hoàn thành trễ hạn'}
                    {activeCardFilter === 'LATE' && 'Chưa hoàn thành trễ hạn'}
                    {activeCardFilter === 'UNFINISHED' && 'Chưa hoàn thành'}
                  </strong>
                </span>
              )}
              {statusFilter !== 'ALL' && activeCardFilter === 'ALL' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Trạng thái: <strong>
                    {statusFilter === 'COMPLETED' && 'Hoàn thành'}
                    {statusFilter === 'COMPLETED_LATE' && 'Hoàn thành trễ hạn'}
                    {statusFilter === 'LATE' && 'Chưa hoàn thành trễ hạn'}
                    {statusFilter === 'UNFINISHED' && 'Chưa hoàn thành'}
                  </strong>
                </span>
              )}
              <span className="text-[11px] text-[#4f6f56]">
                Tìm thấy: <strong className="text-[#2d6e3e] font-bold">{filteredTasks.length}</strong> việc
              </span>
              {(selectedGroup !== 'ALL' || (activeCardFilter !== 'ALL' || statusFilter !== 'ALL') || searchQuery.trim() !== '') && (
                <button
                  onClick={() => {
                    setSelectedGroup('ALL');
                    setActiveCardFilter('ALL');
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 font-medium transition-colors"
                >
                  Bỏ lọc
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full border-collapse text-sm font-sans min-w-[1400px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#005ba1] text-white font-bold">
                  <th className="px-3 py-2.5 w-12 text-center border-b-2 border-[#004499] border-r border-[#004499]">STT</th>
                  <th className="px-4 py-2.5 w-[40%] min-w-[400px] border-b-2 border-[#004499] border-r border-[#004499]">TÊN CÔNG VIỆC</th>
                  <th className="px-3 py-2.5 w-[15%] min-w-[180px] border-b-2 border-[#004499] border-r border-[#004499]">PHÒNG BAN</th>
                  <th className="px-3 py-2.5 w-[15%] min-w-[180px] border-b-2 border-[#004499] border-r border-[#004499]">NGƯỜI CHỦ TRÌ</th>
                  <th className="px-3 py-2.5 w-[15%] min-w-[150px] text-center border-b-2 border-[#004499] border-r border-[#004499]">HẠN HOÀN THÀNH</th>
                  <th className="px-3 py-2.5 w-[15%] min-w-[150px] text-center border-b-2 border-[#004499]">TÌNH TRẠNG</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">Không có dữ liệu phù hợp với bộ lọc</td>
                  </tr>
                ) : (
                  paginatedTasks.map((t, idx) => {
                    const cat = classifyTaskStatus(t.status);
                    let badgeClass = 'text-slate-700 bg-slate-100';
                    if (cat === 'COMPLETED') badgeClass = 'text-blue-700 bg-blue-50 border border-blue-200';
                    else if (cat === 'COMPLETED_LATE') badgeClass = 'text-purple-700 bg-purple-50 border border-purple-200';
                    else if (cat === 'LATE') badgeClass = 'text-teal-700 bg-teal-50 border border-teal-200';
                    else if (cat === 'UNFINISHED') badgeClass = 'text-rose-700 bg-rose-50 border border-rose-200';

                    return (
                      <tr key={t.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100 hover:bg-slate-50/80 transition-colors`}>
                        <td className="px-3 py-2 w-12 text-center font-mono text-slate-600 border-r border-slate-100">{idx + 1 + (currentPage - 1) * itemsPerPage}</td>
                        <td className="px-4 py-2 min-w-[400px] text-slate-900 font-medium border-r border-slate-100 truncate">{t.taskName}</td>
                        <td className="px-3 py-2 min-w-[180px] text-slate-600 border-r border-slate-100 truncate">{t.department}</td>
                        <td className="px-3 py-2 min-w-[180px] text-slate-900 font-medium border-r border-slate-100 truncate">{t.userName}</td>
                        <td className="px-3 py-2 min-w-[150px] text-center text-slate-900 font-mono border-r border-slate-100">{formatDate(t.planDeadline)}</td>
                        <td className="px-3 py-2 min-w-[150px] text-center border-r border-slate-100">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-[#f5f9f6] border-t border-[#c6d8c8] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-[#4f6f56] font-medium">
                Hien thi <span className="font-bold text-[#2d6e3e]">{(currentPage - 1) * itemsPerPage + 1}</span>-<span className="font-bold text-[#2d6e3e]">{Math.min(currentPage * itemsPerPage, filteredTasks.length)}</span> / <span className="font-bold text-[#2d6e3e]">{filteredTasks.length}</span> dong
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-[11px] font-semibold text-[#31523b] bg-white border border-[#c6d8c8] rounded-sm hover:bg-[#eef3ef] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#2d6e3e] text-white shadow-sm'
                            : 'text-[#31523b] bg-white border border-[#c6d8c8] hover:bg-[#eef3ef]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-[11px] font-semibold text-[#31523b] bg-white border border-[#c6d8c8] rounded-sm hover:bg-[#eef3ef] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
