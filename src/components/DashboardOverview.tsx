import { useMemo, useState, Dispatch, SetStateAction } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Employee, isEmployeeOfficiallyApproved, formatTimelineDisplay } from '../types';
import { calculateKPIResultSummary } from '../initialData';
import { 
  TrendingUp, Users, Target, Award, CheckCircle2, AlertTriangle, 
  HelpCircle, Shield, Clock, Activity, MapPin, ChevronRight, X, ExternalLink, Calendar,
  Bell, Megaphone, Plus, Trash2, Sparkles
} from 'lucide-react';

interface DashboardOverviewProps {
  employees: Employee[];
  departmentsRegion1: string[];
  unitsRegion2: string[];
  onSelectEmployee: (id: string) => void;
  directives: { id: string; category: string; content: string; date: string }[];
  setDirectives: Dispatch<SetStateAction<{ id: string; category: string; content: string; date: string }[]>>;
  isLeaderOrAdmin: boolean;
  selectedCalendarDay?: number | null;
  setSelectedCalendarDay?: (day: number | null) => void;
  selectedCalendarMonth?: number; // 0-11
  selectedCalendarYear?: number;
  getTasksForDay?: (dayNum: number) => { emp: Employee; task: any }[];
}

// CircularProgress component for Left Sidebar Profile
const CircularProgress = ({ score, color = 'text-emerald-500' }: { score: number; color?: string }) => {
  const radius = 38;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center my-1.5 mx-auto">
      <svg className="w-24 h-24 transform -rotate-90">
        {/* Background circle */}
        <circle
          className="text-slate-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
        {/* Foreground circle */}
        <circle
          className={`${color} transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-black font-mono text-slate-800">{score.toFixed(2)}%</span>
        <span className="text-[7px] text-slate-400 font-bold uppercase leading-none tracking-widest mt-0.5">KPI đạt</span>
      </div>
    </div>
  );
};

export default function DashboardOverview({ 
  employees, 
  departmentsRegion1, 
  unitsRegion2, 
  onSelectEmployee,
  directives,
  setDirectives,
  isLeaderOrAdmin,
  selectedCalendarDay,
  setSelectedCalendarDay,
  selectedCalendarMonth,
  selectedCalendarYear,
  getTasksForDay
}: DashboardOverviewProps) {
  const displayCalendarMonth = (selectedCalendarMonth ?? 6) + 1; // props are 0-11, mặc định Tháng 07 nếu không truyền vào
  const displayCalendarYear = selectedCalendarYear ?? 2026;
  
  // State to determine which employee is highlighted/spotlighted on the Left Sidebar
  const [spotlightEmployeeId, setSpotlightEmployeeId] = useState<string>('emp-1');

  // State to filter employees by their task status in prominent KPI cards
  const [activeKpiFilter, setActiveKpiFilter] = useState<'all' | 'in_progress' | 'near_deadline' | 'completed' | 'overdue'>('all');

  // Bộ lọc theo Xếp loại thi đua (bấm vào khối "Xuất sắc (A)" / "Hoàn thành tốt (B)" trong bảng
  // Kiểm soát Chỉ tiêu Thi đua) - dùng để lọc đúng danh sách cán bộ thực tế ở Bảng xếp hạng bên dưới.
  const [activeRatingFilter, setActiveRatingFilter] = useState<'all' | 'excellent' | 'good' | 'good_and_above'>('all');

  // Modal state for viewing block details
  const [selectedDetailBlock, setSelectedDetailBlock] = useState<'phong_ban' | 'vung_1' | 'vung_2' | null>(null);

  // Modal state for viewing tasks list of a KPI block
  const [selectedKpiBlock, setSelectedKpiBlock] = useState<'all' | 'in_progress' | 'near_deadline' | 'completed' | 'overdue' | null>(null);

  // State for date range filters
  const [dateFilterType, setDateFilterType] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Lọc "Hạn báo cáo theo tháng cụ thể" (VD: Tháng 1) - lấy TOÀN BỘ nhiệm vụ có "Hạn hoàn thành" rơi vào tháng đó,
  // không phụ thuộc vào "tháng này/tháng trước" cố định.
  const [specificMonth, setSpecificMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [specificMonthYear, setSpecificMonthYear] = useState<number>(2026);

  // States for inline directive posting form
  const [isAddingDirective, setIsAddingDirective] = useState<boolean>(false);
  const [newDirectiveContent, setNewDirectiveContent] = useState<string>('');
  const [newDirectiveCategory, setNewDirectiveCategory] = useState<'Chỉ đạo' | 'Trọng tâm' | 'Hỗ trợ'>('Chỉ đạo');

  // Helper to determine simulated completion date for a task based on current metadata date 2026-07-16
  const getTaskDate = (taskId: string, timeline: string | undefined | null): Date => {
    const tl = (timeline || '').toLowerCase();
    const idStr = taskId || '';
    
    if (tl.includes('25 hằng tháng')) {
      // Alternate between current month (July 25) and last month (June 25)
      const isEven = idStr.charCodeAt(idStr.length - 1) % 2 === 0;
      return isEven ? new Date(2026, 6, 25) : new Date(2026, 5, 25);
    }
    
    if (tl.includes('hằng tháng') || tl.includes('hàng tháng')) {
      const charCode = idStr.charCodeAt(idStr.length - 1) || 0;
      if (charCode % 3 === 0) {
        return new Date(2026, 6, 15); // July 15 (This Week / Month / Quarter)
      } else if (charCode % 3 === 1) {
        return new Date(2026, 6, 8);  // July 8 (Last Week / This Month / This Quarter)
      } else {
        return new Date(2026, 5, 15); // June 15 (Last Month / Last Quarter)
      }
    }
    
    if (tl.includes('15 ngày') || tl.includes('10/07')) {
      return new Date(2026, 6, 10); // July 10, 2026 (Last Week / This Month)
    }
    
    if (tl.includes('đột xuất')) {
      const isEven = idStr.charCodeAt(idStr.length - 1) % 2 === 0;
      return isEven ? new Date(2026, 6, 14) : new Date(2026, 6, 8); // July 14 (This Week) or July 8 (Last Week)
    }

    if (tl.includes('đúng hạn')) {
      return new Date(2026, 5, 30); // June 30, 2026 (Last Month / Last Quarter)
    }

    if (tl.includes('hằng quý') || tl.includes('hàng quý') || tl.includes('quý')) {
      const isEven = idStr.charCodeAt(idStr.length - 1) % 2 === 0;
      return isEven ? new Date(2026, 6, 5) : new Date(2026, 4, 20); // July 5 (This Month / This Quarter) or May 20 (Last Quarter)
    }

    if (tl.includes('6 tháng')) {
      return new Date(2026, 5, 28); // June 28 (Last Month / Last Quarter)
    }

    if (tl.includes('đảng ủy bộ tài chính')) {
      return new Date(2026, 5, 20); // June 20 (Last Month)
    }

    if (tl.includes('cấp có thẩm quyền') || tl.includes('quy định') || tl.includes('công việc')) {
      const charCode = idStr.charCodeAt(idStr.length - 1) || 0;
      if (charCode % 3 === 0) {
        return new Date(2026, 6, 16); // July 16 (This Week / This Month)
      } else if (charCode % 3 === 1) {
        return new Date(2026, 6, 7);  // July 7 (Last Week / This Month)
      } else {
        return new Date(2026, 5, 12); // June 12 (Last Month)
      }
    }

    // Fallback: distribute deterministically
    const hash = idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const day = (hash % 20) + 5;
    const isJuly = hash % 2 === 0;
    return isJuly ? new Date(2026, 6, day) : new Date(2026, 5, day);
  };

  // Helper to find exact deadline date of a task
  const getDeadlineDateForTask = (task: any): Date => {
    if (task?.deadlineDate) {
      const parts = String(task.deadlineDate).split('-');
      if (parts.length >= 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const candidate = new Date(y, m, d);
        if (!isNaN(candidate.getTime())) return candidate;
      }
      const parsed = new Date(task.deadlineDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const safeTimeline = (task && typeof task.timeline === 'string') ? task.timeline : '';

    const dateRegexFull = /(\d{2})\/(\d{2})\/(\d{4})/;
    const matchFull = safeTimeline.match(dateRegexFull);
    if (matchFull) {
      const d = parseInt(matchFull[1], 10);
      const m = parseInt(matchFull[2], 10) - 1;
      const y = parseInt(matchFull[3], 10);
      const candidate = new Date(y, m, d);
      if (!isNaN(candidate.getTime())) return candidate;
    }

    const dateRegexShort = /(\d{2})\/(\d{2})/;
    const matchShort = safeTimeline.match(dateRegexShort);
    if (matchShort) {
      const d = parseInt(matchShort[1], 10);
      const m = parseInt(matchShort[2], 10) - 1;
      const candidate = new Date(2026, m, d);
      if (!isNaN(candidate.getTime())) return candidate;
    }

    return getTaskDate(task?.id, safeTimeline);
  };

  // Helper to get detailed task status
  const getTaskStatus = (task: any): 'completed' | 'overdue' | 'near_deadline' | 'in_progress' => {
    const qtyRatio = task.targetQuantity > 0 ? (task.actualQtyCount / task.targetQuantity) : 1;
    const progressRatio = task.targetQuantity > 0 ? (task.actualProgressCount / task.targetQuantity) : 1;
    const isCompleted = qtyRatio >= 1 && progressRatio >= 1;
    
    if (isCompleted) return 'completed';

    const deadline = getDeadlineDateForTask(task);
    
    // Today reference is July 18, 2026 as per local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(deadline);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'overdue';
    } else if (diffDays <= 2) {
      return 'near_deadline';
    } else {
      return 'in_progress';
    }
  };

  // Helper to check if task is within 2 days from the deadline and not completed
  const isTaskNearDeadline = (task: any): boolean => {
    return getTaskStatus(task) === 'near_deadline';
  };

  // Helper to check if date matches selected period relative to current local time 2026-07-16
  const isDateInPeriod = (date: Date, period: string, start?: string, end?: string): boolean => {
    const time = date.getTime();
    
    // Boundary dates based on current time 2026-07-16
    const thisWeekStart = new Date(2026, 6, 13, 0, 0, 0).getTime(); // July 13, 2026 (Monday)
    const thisWeekEnd = new Date(2026, 6, 19, 23, 59, 59).getTime(); // July 19, 2026 (Sunday)
    
    const lastWeekStart = new Date(2026, 6, 6, 0, 0, 0).getTime(); // July 6, 2026 (Monday)
    const lastWeekEnd = new Date(2026, 6, 12, 23, 59, 59).getTime(); // July 12, 2026 (Sunday)
    
    const thisMonthStart = new Date(2026, 6, 1, 0, 0, 0).getTime(); // July 1, 2026
    const thisMonthEnd = new Date(2026, 6, 31, 23, 59, 59).getTime(); // July 31, 2026
    
    const lastMonthStart = new Date(2026, 5, 1, 0, 0, 0).getTime(); // June 1, 2026
    const lastMonthEnd = new Date(2026, 5, 30, 23, 59, 59).getTime(); // June 30, 2026
    
    const thisQuarterStart = new Date(2026, 6, 1, 0, 0, 0).getTime(); // July 1, 2026 (Q3)
    const thisQuarterEnd = new Date(2026, 8, 30, 23, 59, 59).getTime(); // Sept 30, 2026 (Q3)
    
    const lastQuarterStart = new Date(2026, 3, 1, 0, 0, 0).getTime(); // April 1, 2026 (Q2)
    const lastQuarterEnd = new Date(2026, 5, 30, 23, 59, 59).getTime(); // June 30, 2026 (Q2)

    switch (period) {
      case 'this_week':
        return time >= thisWeekStart && time <= thisWeekEnd;
      case 'last_week':
        return time >= lastWeekStart && time <= lastWeekEnd;
      case 'this_month':
        return time >= thisMonthStart && time <= thisMonthEnd;
      case 'last_month':
        return time >= lastMonthStart && time <= lastMonthEnd;
      case 'this_quarter':
        return time >= thisQuarterStart && time <= thisQuarterEnd;
      case 'last_quarter':
        return time >= lastQuarterStart && time <= lastQuarterEnd;
      case 'specific_month': {
        // Toàn bộ tháng được chọn (VD Tháng 1) tính theo "Hạn hoàn thành" thực tế của nhiệm vụ
        const mStart = new Date(specificMonthYear, specificMonth - 1, 1, 0, 0, 0).getTime();
        const mEnd = new Date(specificMonthYear, specificMonth, 0, 23, 59, 59).getTime(); // ngày cuối cùng của tháng
        return time >= mStart && time <= mEnd;
      }
      case 'custom':
        if (!start && !end) return true;
        let sTime = 0;
        let eTime = Infinity;
        if (start) {
          const parts = start.split('-');
          sTime = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0).getTime();
        }
        if (end) {
          const parts = end.split('-');
          eTime = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59).getTime();
        }
        return time >= sTime && time <= eTime;
      case 'all':
      default:
        return true;
    }
  };

  // Formatter for timelines to show clear day/month deadlines
  const formatTimelineDate = (timeline: string | undefined | null): string => {
    const tl = (timeline || '').toLowerCase();
    if (tl.includes('25 hằng tháng')) return '25/06/2026';
    if (tl.includes('hằng tháng')) return 'Hằng tháng (Hạn 30/06/2026)';
    if (tl.includes('hằng quý') || tl.includes('hàng quý')) return 'Hằng Quý (Trước 30/06/2026)';
    if (tl.includes('6 tháng')) return '6 tháng đầu năm (Trước 30/06/2026)';
    if (tl.includes('năm')) return 'Cả năm 2026 (Hạn 15/12/2026)';
    if (tl.includes('15 ngày')) return 'Trước 15 ngày ban hành (Hạn 10/07/2026)';
    if (tl.includes('đột xuất')) return 'Đột xuất (Hoàn thành trong 48 giờ)';
    if (tl.includes('đúng hạn')) return 'Đúng hạn quy định (Hạn cuối 30/06/2026)';
    if (tl.includes('đảng ủy bộ tài chính')) return 'Theo yêu cầu Đảng ủy (Trước 30/06/2026)';
    if (tl.includes('cấp có thẩm quyền')) return 'Theo yêu cầu cấp thẩm quyền (Hạn 15/07/2026)';
    if (tl.includes('công việc')) return 'Theo tiến độ công việc (Hạn 30/06/2026)';
    if (tl.includes('quy định')) return '30/06/2026';
    return timeline;
  };

  // Get list of tasks of all employees corresponding to the clicked KPI block card
  const kpiBlockTasks = useMemo(() => {
    if (!selectedKpiBlock) return [];
    
    const list: {
      employeeName: string;
      employeeAvatar: string;
      mission: string;
      reportingLevel: string;
      productName: string;
      taskType: string;
      targetQuantity: number;
      timeline: string;
      maxScore: number;
      assignedScore: number;
      taskDate: Date;
    }[] = [];

    employees.forEach(emp => {
      if (emp.isAdmin) return; // Skip admin
      emp.tasks.forEach(task => {
        // Determine status
        const status = getTaskStatus(task);

        if (selectedKpiBlock === 'all' || selectedKpiBlock === status) {
          const taskDate = getDeadlineDateForTask(task); // Dùng đúng "Hạn hoàn thành" thực tế thay vì ngày giả lập
          
          if (isDateInPeriod(taskDate, dateFilterType, customStartDate, customEndDate)) {
            list.push({
              employeeName: emp.name,
              employeeAvatar: emp.avatar,
              mission: task.mission,
              reportingLevel: task.reportingLevel,
              productName: task.productName,
              taskType: task.taskType || 'Định kỳ',
              targetQuantity: task.targetQuantity,
              timeline: task.timeline,
              maxScore: task.maxScore,
              assignedScore: task.assignedScore,
              taskDate: taskDate
            });
          }
        }
      });
    });

    return list.map((item, idx) => ({
      ...item,
      stt: idx + 1
    }));
  }, [employees, selectedKpiBlock, dateFilterType, customStartDate, customEndDate]);

  // Get active spotlight employee
  const spotlightEmployee = useMemo(() => {
    return employees.find(e => e.id === spotlightEmployeeId) || employees.find(e => !e.isAdmin) || employees[0];
  }, [employees, spotlightEmployeeId]);

  const spotlightSummary = useMemo(() => {
    if (!spotlightEmployee) return null;
    return calculateKPIResultSummary(spotlightEmployee.tasks);
  }, [spotlightEmployee]);

  // Aggregate all tasks and calculate core stats
  const stats = useMemo(() => {
    let totalTasks = 0;
    let sumPerformance = 0;
    
    // Status counts for the requested 5 prominent blocks
    let inProgressTasks = 0;
    let nearDeadlineTasks = 0;
    let completedOnTimeTasks = 0;
    let overdueTasks = 0;

    // Status counts for pie chart
    let fullSuccessCount = 0; // 100% completed
    let highProgressCount = 0; // 85% - 99% completed
    let lowProgressCount = 0;  // < 85% completed

    let sumQtyPercent = 0;
    let sumQualityPercent = 0;
    let sumProgressPercent = 0;
    let empCount = 0;

    employees.forEach(emp => {
      if (emp.isAdmin) return; // Skip admin

      // Filter tasks based on selected period
      const filteredTasks = emp.tasks.filter(task => {
        const taskDate = getDeadlineDateForTask(task); // Dùng đúng "Hạn hoàn thành" thực tế thay vì ngày giả lập
        return isDateInPeriod(taskDate, dateFilterType, customStartDate, customEndDate);
      });

      if (filteredTasks.length === 0) return; // Skip employee with no active tasks in selected period
      
      empCount++;
      const summary = calculateKPIResultSummary(filteredTasks);
      sumPerformance += summary.overallTaskPerformanceScore;
      sumQtyPercent += summary.qtyKPIPercentage;
      sumQualityPercent += summary.qualityKPIPercentage;
      sumProgressPercent += summary.progressKPIPercentage;

      filteredTasks.forEach(task => {
        totalTasks++;
        const qtyPercent = task.targetQuantity > 0 ? (task.actualQtyCount / task.targetQuantity) * 100 : 0;
        const qualPercent = task.targetQuantity > 0 ? (task.actualQualityCount / task.targetQuantity) * 100 : 0;
        const progPercent = task.targetQuantity > 0 ? (task.actualProgressCount / task.targetQuantity) * 100 : 0;
        const avgTask = (qtyPercent + qualPercent + progPercent) / 3;

        // 1. Classification for Recharts Pie Chart
        if (avgTask >= 100) {
          fullSuccessCount++;
        } else if (avgTask >= 85) {
          highProgressCount++;
        } else {
          lowProgressCount++;
        }

        // 2. Classification for the 5 Prominent Cards (Total, In-progress, Near-deadline, On-time, Overdue)
        const status = getTaskStatus(task);
        if (status === 'completed') {
          completedOnTimeTasks++;
        } else if (status === 'overdue') {
          overdueTasks++;
        } else if (status === 'near_deadline') {
          nearDeadlineTasks++;
        } else {
          inProgressTasks++;
        }
      });
    });

    const averagePerformance = empCount > 0 ? Math.round((sumPerformance / empCount) * 100) / 100 : 0;
    const avgQty = empCount > 0 ? Math.round((sumQtyPercent / empCount) * 100) / 100 : 0;
    const avgQual = empCount > 0 ? Math.round((sumQualityPercent / empCount) * 100) / 100 : 0;
    const avgProg = empCount > 0 ? Math.round((sumProgressPercent / empCount) * 100) / 100 : 0;

    const pieData = [
      { name: 'Đạt Hoàn Toàn (100%)', value: fullSuccessCount, color: '#10b981' }, 
      { name: 'Đạt Khá (85-99%)', value: highProgressCount, color: '#3b82f6' }, 
      { name: 'Chậm / Thiếu hụt (<85%)', value: lowProgressCount, color: '#f59e0b' }, 
    ].filter(item => item.value > 0);

    const barData = [
      { name: 'KPI 1: Số Lượng', 'Tỷ lệ đạt (%)': avgQty, fill: '#3b82f6' },
      { name: 'KPI 2: Chất Lượng', 'Tỷ lệ đạt (%)': avgQual, fill: '#10b981' },
      { name: 'KPI 3: Tiến Độ', 'Tỷ lệ đạt (%)': avgProg, fill: '#f59e0b' },
    ];

    return {
      averagePerformance,
      totalTasks,
      inProgressTasks,
      nearDeadlineTasks,
      completedOnTimeTasks,
      overdueTasks,
      pieData,
      barData
    };
  }, [employees, dateFilterType, customStartDate, customEndDate]);

  // Kiểm soát Chỉ tiêu Thi đua "Xuất sắc" (Nghị định 48/2023/NĐ-CP): LUÔN lấy đúng từ cùng một nguồn
  // dữ liệu (employeeRankings) với Bảng xếp hạng cán bộ hiển thị bên dưới, để số liệu ở khối này
  // khớp 100% với danh sách thực tế khi cán bộ bấm vào xem.
  // Employee rankings
  const employeeRankings = useMemo(() => {
    return employees.filter(emp => !emp.isAdmin).map(emp => {
      const filteredTasks = emp.tasks.filter(task => {
        const taskDate = getDeadlineDateForTask(task); // Dùng đúng "Hạn hoàn thành" thực tế thay vì ngày giả lập
        return isDateInPeriod(taskDate, dateFilterType, customStartDate, customEndDate);
      });
      // Fallback to all tasks if none in period
      const activeTasks = filteredTasks.length > 0 ? filteredTasks : emp.tasks;
      const summary = calculateKPIResultSummary(activeTasks);
      return {
        ...emp,
        overallScore: summary.overallTaskPerformanceScore,
        summary,
        isOfficial: isEmployeeOfficiallyApproved(emp),
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [employees, dateFilterType, customStartDate, customEndDate]);

  const quotaStats = useMemo(() => {
    // CHỈ tính trên những cán bộ đã hoàn tất quy trình gửi + phê duyệt (điểm chính thức),
    // đúng theo yêu cầu "hệ thống chỉ tính điểm chính thức sau khi Trưởng đơn vị phê duyệt".
    const rankedWithTasks = employeeRankings.filter(emp => emp.tasks.length > 0 && emp.isOfficial);

    let excellentCount = 0;
    let goodCount = 0;
    let satisfactoryCount = 0;
    let unsatisfactoryCount = 0;

    rankedWithTasks.forEach(emp => {
      if (emp.overallScore >= 99.5) excellentCount++;
      else if (emp.overallScore >= 90) goodCount++;
      else if (emp.overallScore >= 80) satisfactoryCount++;
      else unsatisfactoryCount++;
    });

    const excellentAndGoodTotal = excellentCount + goodCount;
    const maxExcellentAllowed = Math.floor(excellentAndGoodTotal * 0.2);
    const isQuotaValid = excellentCount <= maxExcellentAllowed || excellentCount === 0;
    const quotaPercentage = excellentAndGoodTotal > 0 ? (excellentCount / excellentAndGoodTotal) * 100 : 0;

    return {
      excellentCount,
      goodCount,
      satisfactoryCount,
      unsatisfactoryCount,
      excellentAndGoodTotal,
      maxExcellentAllowed,
      isQuotaValid,
      quotaPercentage
    };
  }, [employeeRankings]);

  // Standing statistics based on Region / Blocks (Requirement 4)
  const regionLeaders = useMemo(() => {
    // Helper to calculate score for an employee based on selected period
    const getEmployeeScoreAndTasks = (e: Employee) => {
      const filteredTasks = e.tasks.filter(task => {
        const taskDate = getDeadlineDateForTask(task); // Dùng đúng "Hạn hoàn thành" thực tế thay vì ngày giả lập
        return isDateInPeriod(taskDate, dateFilterType, customStartDate, customEndDate);
      });
      // Fallback to all tasks if none in period
      const activeTasks = filteredTasks.length > 0 ? filteredTasks : e.tasks;
      const score = calculateKPIResultSummary(activeTasks).overallTaskPerformanceScore;
      return { score, activeTasks };
    };

    // 1. Khối Phòng Ban (departmentsRegion1) - 5 units
    const deptStats = departmentsRegion1.filter(d => d !== 'Lãnh đạo').map(dept => {
      const deptEmployees = employees.filter(e => e.department === dept && !e.isAdmin);
      
      const employeeData = deptEmployees.map(e => {
        const { score } = getEmployeeScoreAndTasks(e);
        return { ...e, score };
      });

      const avgScore = deptEmployees.length > 0 
        ? employeeData.reduce((sum, item) => sum + item.score, 0) / deptEmployees.length 
        : 0;
      
      let leadingEmployee = null;
      let maxScore = -1;
      employeeData.forEach(e => {
        if (e.score > maxScore) {
          maxScore = e.score;
          leadingEmployee = e;
        }
      });

      return {
        name: dept,
        avgScore,
        employeesCount: deptEmployees.length,
        employees: employeeData,
        leadingEmployee,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    // 2. Khối Đơn Vị Cơ Sở Vùng 1 (First 7 units of unitsRegion2)
    const vung1Units = unitsRegion2.slice(0, 7);
    const vung1Stats = vung1Units.map(unit => {
      const unitEmployees = employees.filter(e => e.department === unit && !e.isAdmin);
      
      const employeeData = unitEmployees.map(e => {
        const { score } = getEmployeeScoreAndTasks(e);
        return { ...e, score };
      });

      const avgScore = unitEmployees.length > 0 
        ? employeeData.reduce((sum, item) => sum + item.score, 0) / unitEmployees.length 
        : 0;
      
      let leadingEmployee = null;
      let maxScore = -1;
      employeeData.forEach(e => {
        if (e.score > maxScore) {
          maxScore = e.score;
          leadingEmployee = e;
        }
      });

      return {
        name: unit,
        avgScore,
        employeesCount: unitEmployees.length,
        employees: employeeData,
        leadingEmployee,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    // 3. Khối Đơn Vị Cơ Sở Vùng 2 (Remaining 7 units of unitsRegion2)
    const vung2Units = unitsRegion2.slice(7);
    const vung2Stats = vung2Units.map(unit => {
      const unitEmployees = employees.filter(e => e.department === unit && !e.isAdmin);
      
      const employeeData = unitEmployees.map(e => {
        const { score } = getEmployeeScoreAndTasks(e);
        return { ...e, score };
      });

      const avgScore = unitEmployees.length > 0 
        ? employeeData.reduce((sum, item) => sum + item.score, 0) / unitEmployees.length 
        : 0;
      
      let leadingEmployee = null;
      let maxScore = -1;
      employeeData.forEach(e => {
        if (e.score > maxScore) {
          maxScore = e.score;
          leadingEmployee = e;
        }
      });

      return {
        name: unit,
        avgScore,
        employeesCount: unitEmployees.length,
        employees: employeeData,
        leadingEmployee,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    return {
      deptStats,
      vung1Stats,
      vung2Stats,
      topDept: deptStats[0] || null,
      topVung1: vung1Stats[0] || null,
      topVung2: vung2Stats[0] || null,
    };
  }, [employees, departmentsRegion1, unitsRegion2, dateFilterType, customStartDate, customEndDate]);

  // Filtered employee rankings for click-to-filter KPI cards
  const filteredEmployeeRankings = useMemo(() => {
    let list = employeeRankings;

    // Lọc theo Xếp loại thi đua khi bấm vào khối "Xuất sắc (A)" / "Hoàn thành tốt (B)" ở bảng
    // Kiểm soát Chỉ tiêu Thi đua, để danh sách bên dưới khớp đúng với số liệu của khối đó.
    if (activeRatingFilter !== 'all') {
      list = list.filter(emp => {
        if (emp.tasks.length === 0) return false; // Không tính người chưa có nhiệm vụ nào (khớp với quotaStats)
        if (activeRatingFilter === 'excellent') return emp.overallScore >= 99.5;
        if (activeRatingFilter === 'good') return emp.overallScore >= 90 && emp.overallScore < 99.5;
        if (activeRatingFilter === 'good_and_above') return emp.overallScore >= 90;
        return true;
      });
    }

    if (activeKpiFilter === 'all') return list;
    
    return list.filter(emp => {
      // Check if employee has at least one task matching the selected category
      return emp.tasks.some(task => {
        const taskDate = getDeadlineDateForTask(task); // Dùng đúng "Hạn hoàn thành" thực tế thay vì ngày giả lập
        if (!isDateInPeriod(taskDate, dateFilterType, customStartDate, customEndDate)) return false;

        const status = getTaskStatus(task);

        if (activeKpiFilter === 'completed') return status === 'completed';
        if (activeKpiFilter === 'overdue') return status === 'overdue';
        if (activeKpiFilter === 'near_deadline') return status === 'near_deadline';
        if (activeKpiFilter === 'in_progress') return status === 'in_progress';
        return false;
      });
    });
  }, [employeeRankings, activeKpiFilter, activeRatingFilter, dateFilterType, customStartDate, customEndDate]);

  // Compact charts data mapping
  const compactChartsData = useMemo(() => {
    // 1. Khối Phòng Ban (Pie chart percentages)
    const deptPie = regionLeaders.deptStats.map((item, idx) => ({
      name: item.name.replace('Ban ', '').replace('Phòng ', '').replace('Tổng hợp', 'TH').replace('Đảng ủy', 'ĐU'),
      value: Math.round(item.avgScore),
      color: ['#4f46e5', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6'][idx % 5]
    }));

    // 2. Đơn vị cơ sở Vùng 1 (Bar chart)
    const vung1Bar = regionLeaders.vung1Stats.map((item, idx) => ({
      name: `Veng ${idx + 1}`,
      fullName: item.name,
      Score: Math.round(item.avgScore),
      fill: ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'][idx % 7]
    }));

    // 3. Đơn vị cơ sở Vùng 2 (Horizontal bar chart)
    const vung2Bar = regionLeaders.vung2Stats.map((item, idx) => ({
      name: `Veng ${idx + 7}`,
      fullName: item.name,
      Score: Math.round(item.avgScore),
      fill: ['#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'][idx % 7]
    }));

    return {
      deptPie,
      vung1Bar,
      vung2Bar
    };
  }, [regionLeaders]);

  // Get current active modal list data
  const modalData = useMemo(() => {
    if (selectedDetailBlock === 'phong_ban') {
      return {
        title: 'Chi Tiết Xếp Hạng: Khối Phòng Ban (5 Phòng)',
        stats: regionLeaders.deptStats,
        description: 'Tổng hợp kết quả rà soát hiệu suất làm việc trung bình của toàn thể cán bộ chuyên trách tại các phòng ban.'
      };
    }
    if (selectedDetailBlock === 'vung_1') {
      return {
        title: 'Chi Tiết Xếp Hạng: Đơn Vị Cơ Sở - Vùng 1 (7 Đơn vị)',
        stats: regionLeaders.vung1Stats,
        description: 'Chi tiết điểm thi đua trung bình của 7 đơn vị cơ sở đầu tiên (Vùng 1).'
      };
    }
    if (selectedDetailBlock === 'vung_2') {
      return {
        title: 'Chi Tiết Xếp Hạng: Đơn Vị Cơ Sở - Vùng 2 (7 Đơn vị)',
        stats: regionLeaders.vung2Stats,
        description: 'Báo cáo chi tiết điểm chấm thi đua trung bình của 7 đơn vị cơ sở tiếp theo (Vùng 2).'
      };
    }
    return null;
  }, [selectedDetailBlock, regionLeaders]);

  const generalPerformanceChartData = useMemo(() => {
    const avgQty = stats.barData.find(d => d.name.includes('Số Lượng'))?.['Tỷ lệ đạt (%)'] || 85;
    const avgQual = stats.barData.find(d => d.name.includes('Chất Lượng'))?.['Tỷ lệ đạt (%)'] || 90;
    const avgProg = stats.barData.find(d => d.name.includes('Tiến Độ'))?.['Tỷ lệ đạt (%)'] || 80;
    const avgPerf = stats.averagePerformance || 88;
    const onTimeRate = stats.totalTasks > 0 ? Math.round((stats.completedOnTimeTasks / stats.totalTasks) * 100) : 100;

    return [
      { name: 'V1', fullName: 'Đạt Số lượng chỉ tiêu', value: Math.round(avgQty), shortName: 'Số lượng', fill: '#60a5fa' },
      { name: 'V2', fullName: 'Đạt Chất lượng nhiệm vụ', value: Math.round(avgQual), shortName: 'Chất lượng', fill: '#4ade80' },
      { name: 'V3', fullName: 'Đạt Tiến độ triển khai', value: Math.round(avgProg), shortName: 'Tiến độ', fill: '#fb923c' },
      { name: 'V4', fullName: 'Tỷ lệ hoàn thành đúng tiến độ', value: onTimeRate, shortName: 'Đúng tiến độ', fill: '#22d3ee' },
      { name: 'V5', fullName: 'Chỉ số hiệu suất tổng hợp', value: Math.round(avgPerf), shortName: 'Hiệu suất chung', fill: '#facc15' },
    ];
  }, [stats]);

  return (
    <div id="dashboard-overview" className="animate-fade-in pb-12 space-y-6">
      
      {/* KHU VỰC GIÁM SÁT TRẠNG THÁI - 5 THẺ CHỈ SỐ Toàn ngành */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 shadow-3xs space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-slate-700 shrink-0" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Giám Sát Trạng Thái Đầu Việc & Chỉ Số Khung Toàn ngành
            </h2>
          </div>
          
          <div className="flex items-center space-x-1.5 text-xs bg-amber-500/10 text-amber-800 px-3 py-1 rounded-full border border-amber-200 font-bold">
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600 animate-pulse" />
            <span>Thời gian: {
              dateFilterType === 'all' ? 'Tất cả' :
              dateFilterType === 'this_week' ? 'Tuần này' :
              dateFilterType === 'last_week' ? 'Tuần trước' :
              dateFilterType === 'this_month' ? 'Tháng này' :
              dateFilterType === 'last_month' ? 'Tháng trước' :
              dateFilterType === 'this_quarter' ? 'Quý này' :
              dateFilterType === 'last_quarter' ? 'Quý trước' :
              dateFilterType === 'specific_month' ? `Tháng ${specificMonth.toString().padStart(2, '0')}/${specificMonthYear}` : 'Tùy chọn'
            }</span>
          </div>
        </div>

        {/* BỘ LỌC THỜI GIAN NHANH CHÓNG (FAST DATE RANGE & PERIOD FILTERS) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                BỘ LỌC THỜI GIAN NHANH CHÓNG (Báo cáo Ngày / Tuần / Tháng / Quý)
              </span>
            </div>
            {dateFilterType !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setDateFilterType('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center space-x-1 underline cursor-pointer"
              >
                <span>Xóa bộ lọc / Hiện tất cả</span>
              </button>
            )}
          </div>
          
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">
            {/* Các nút chu kỳ nhanh */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {[
                { label: 'Tất cả', value: 'all' },
                { label: 'Tuần trước', value: 'last_week' },
                { label: 'Tuần này', value: 'this_week' },
                { label: 'Tháng trước', value: 'last_month' },
                { label: 'Tháng này', value: 'this_month' },
                { label: 'Quý trước', value: 'last_quarter' },
                { label: 'Quý này', value: 'this_quarter' },
                { label: 'Theo tháng cụ thể...', value: 'specific_month' },
                { label: 'Chọn khoảng ngày...', value: 'custom' },
              ].map(btn => (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => {
                    setDateFilterType(btn.value);
                    if (btn.value !== 'custom') {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                    dateFilterType === btn.value
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Khi chọn "Theo tháng cụ thể", hiển thị dropdown chọn Tháng / Năm */}
            {dateFilterType === 'specific_month' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start xl:self-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tháng</span>
                <select
                  value={specificMonth}
                  onChange={(e) => setSpecificMonth(parseInt(e.target.value, 10))}
                  className="bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0 focus:outline-hidden font-bold cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-slate-300">/</span>
                <select
                  value={specificMonthYear}
                  onChange={(e) => setSpecificMonthYear(parseInt(e.target.value, 10))}
                  className="bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0 focus:outline-hidden font-bold cursor-pointer"
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Khi chọn Custom, hiển thị input nhập ngày bắt đầu và kết thúc */}
            {dateFilterType === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start xl:self-auto">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Từ</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0 focus:outline-hidden font-bold"
                  />
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Đến</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0 focus:outline-hidden font-bold"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Thông tin chu kỳ hiện tại đang lọc */}
          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Đang lọc theo: <strong className="text-amber-800 font-bold">
                {dateFilterType === 'all' && 'Toàn bộ thời gian (Không giới hạn)'}
                {dateFilterType === 'this_week' && 'Tuần này (13/07/2026 - 19/07/2026)'}
                {dateFilterType === 'last_week' && 'Tuần trước (06/07/2026 - 12/07/2026)'}
                {dateFilterType === 'this_month' && 'Tháng này (Tháng 7/2026)'}
                {dateFilterType === 'last_month' && 'Tháng trước (Tháng 6/2026)'}
                {dateFilterType === 'this_quarter' && 'Quý này (Quý 3/2026: 01/07 - 30/09)'}
                {dateFilterType === 'last_quarter' && 'Quý trước (Quý 2/2026: 01/04 - 30/06)'}
                {dateFilterType === 'specific_month' && `Toàn bộ Tháng ${specificMonth.toString().padStart(2, '0')}/${specificMonthYear} (theo Hạn hoàn thành thực tế)`}
                {dateFilterType === 'custom' && (
                  (customStartDate || customEndDate) 
                    ? `Khoảng ngày tự chọn (${customStartDate ? customStartDate.split('-').reverse().join('/') : '...'} - ${customEndDate ? customEndDate.split('-').reverse().join('/') : '...'})`
                    : 'Nhấp chọn khoảng ngày mong muốn...'
                )}
              </strong>
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Card 1: Total Tasks */}
          <button
            type="button"
            onClick={() => {
              setActiveKpiFilter('all');
              setSelectedKpiBlock('all');
            }}
            className={`text-left border transition-all duration-200 p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-[96px] relative overflow-hidden group cursor-pointer ${
              activeKpiFilter === 'all'
                ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-gradient-to-br from-emerald-50/40 via-white to-white border-slate-200/80 hover:border-emerald-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex justify-between items-center z-10">
              <span className={`text-[9px] font-black uppercase tracking-wider ${activeKpiFilter === 'all' ? 'text-emerald-700' : 'text-slate-500 group-hover:text-emerald-600'}`}>Tổng số công việc</span>
              <div className={`p-1 rounded-lg transition-colors ${activeKpiFilter === 'all' ? 'bg-emerald-150 text-emerald-800' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                <Target className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1 z-10">
              <span className="text-2xl font-black font-mono text-slate-800 tracking-tight leading-none">{stats.totalTasks}</span>
              <span className="text-[9px] text-slate-500 font-extrabold truncate">Đầu việc được giao</span>
            </div>
            
            {/* Elegant drawing (Mini sparkline) */}
            <div className="absolute right-2 bottom-1.5 w-16 h-8 opacity-25 group-hover:opacity-45 transition-opacity pointer-events-none">
              <svg viewBox="0 0 60 30" className="w-full h-full">
                <path d="M0,25 Q15,10 30,22 T60,5" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                <circle cx="60" cy="5" r="2" fill="#10b981" />
              </svg>
            </div>
          </button>

          {/* Card 2: Tasks In Progress */}
          <button
            type="button"
            onClick={() => {
              setActiveKpiFilter('in_progress');
              setSelectedKpiBlock('in_progress');
            }}
            className={`text-left border transition-all duration-200 p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-[96px] relative overflow-hidden group cursor-pointer ${
              activeKpiFilter === 'in_progress'
                ? 'bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-white border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-gradient-to-br from-blue-50/40 via-white to-white border-slate-200/80 hover:border-blue-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex justify-between items-center z-10">
              <span className={`text-[9px] font-black uppercase tracking-wider ${activeKpiFilter === 'in_progress' ? 'text-blue-700' : 'text-slate-500'}`}>Đang triển khai</span>
              <div className={`p-1 rounded-lg transition-colors ${activeKpiFilter === 'in_progress' ? 'bg-blue-150 text-blue-800' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1 z-10">
              <span className="text-2xl font-black font-mono text-slate-800 tracking-tight leading-none">{stats.inProgressTasks}</span>
              <span className="text-[9px] text-slate-500 font-extrabold truncate">Đang thực hiện</span>
            </div>

            {/* Elegant drawing (Mini bar chart) */}
            <div className="absolute right-2 bottom-1.5 w-16 h-8 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
              <svg viewBox="0 0 60 30" className="w-full h-full">
                <rect x="5" y="15" width="6" height="15" rx="1.5" fill="#3b82f6" />
                <rect x="15" y="8" width="6" height="22" rx="1.5" fill="#3b82f6" />
                <rect x="25" y="18" width="6" height="12" rx="1.5" fill="#3b82f6" />
                <rect x="35" y="12" width="6" height="18" rx="1.5" fill="#3b82f6" opacity="0.7" />
                <rect x="45" y="5" width="6" height="25" rx="1.5" fill="#3b82f6" opacity="0.8" />
              </svg>
            </div>
          </button>

          {/* Card 3: Tasks Near Deadline */}
          <button
            type="button"
            onClick={() => {
              setActiveKpiFilter('near_deadline');
              setSelectedKpiBlock('near_deadline');
            }}
            className={`text-left border transition-all duration-200 p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-[96px] relative overflow-hidden group cursor-pointer ${
              activeKpiFilter === 'near_deadline'
                ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-gradient-to-br from-amber-50/40 via-white to-white border-slate-200/80 hover:border-amber-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex justify-between items-center z-10">
              <span className={`text-[9px] font-black uppercase tracking-wider ${activeKpiFilter === 'near_deadline' ? 'text-amber-700' : 'text-slate-500'}`}>Gần đến hạn</span>
              <div className={`p-1 rounded-lg transition-colors ${activeKpiFilter === 'near_deadline' ? 'bg-amber-150 text-amber-800' : 'bg-slate-100 text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-600'}`}>
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1 z-10">
              <span className="text-2xl font-black font-mono text-slate-800 tracking-tight leading-none">{stats.nearDeadlineTasks}</span>
              <span className="text-[9px] text-slate-500 font-extrabold truncate">Hạn ≤ 2 ngày</span>
            </div>

            {/* Elegant drawing (Mini dial gauge) */}
            <div className="absolute right-2 bottom-1 w-14 h-10 opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none">
              <svg viewBox="0 0 40 30" className="w-full h-full">
                <path d="M 5,25 A 18,18 0 0,1 35,25" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
                <path d="M 5,25 A 18,18 0 0,1 25,10" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="20" cy="23" r="3" fill="#f59e0b" />
                <line x1="20" y1="23" x2="26" y2="12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </button>

          {/* Card 4: Tasks Completed On Time */}
          <button
            type="button"
            onClick={() => {
              setActiveKpiFilter('completed');
              setSelectedKpiBlock('completed');
            }}
            className={`text-left border transition-all duration-200 p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-[96px] relative overflow-hidden group cursor-pointer ${
              activeKpiFilter === 'completed'
                ? 'bg-gradient-to-br from-teal-500/15 via-teal-500/5 to-white border-teal-500 ring-2 ring-teal-500/20'
                : 'bg-gradient-to-br from-teal-50/40 via-white to-white border-slate-200/80 hover:border-teal-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex justify-between items-center z-10">
              <span className={`text-[9px] font-black uppercase tracking-wider ${activeKpiFilter === 'completed' ? 'text-teal-700' : 'text-slate-500'}`}>Đúng hạn / Đạt</span>
              <div className={`p-1 rounded-lg transition-colors ${activeKpiFilter === 'completed' ? 'bg-teal-150 text-teal-800' : 'bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1 z-10">
              <span className="text-2xl font-black font-mono text-slate-800 tracking-tight leading-none">{stats.completedOnTimeTasks}</span>
              <span className="text-[9px] text-slate-500 font-extrabold truncate">Đạt chất lượng</span>
            </div>

            {/* Elegant drawing (Growing trend) */}
            <div className="absolute right-2 bottom-1.5 w-16 h-8 opacity-25 group-hover:opacity-45 transition-opacity pointer-events-none">
              <svg viewBox="0 0 60 30" className="w-full h-full">
                <path d="M0,28 L15,22 L30,24 L45,10 L60,4" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="60" cy="4" r="2.5" fill="#14b8a6" />
              </svg>
            </div>
          </button>

          {/* Card 5: Overdue Tasks */}
          <button
            type="button"
            onClick={() => {
              setActiveKpiFilter('overdue');
              setSelectedKpiBlock('overdue');
            }}
            className={`text-left border transition-all duration-200 p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-[96px] relative overflow-hidden group cursor-pointer ${
              activeKpiFilter === 'overdue'
                ? 'bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-white border-rose-500 ring-2 ring-rose-500/20'
                : 'bg-gradient-to-br from-rose-50/40 via-white to-white border-slate-200/80 hover:border-rose-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex justify-between items-center z-10">
              <span className={`text-[9px] font-black uppercase tracking-wider ${activeKpiFilter === 'overdue' ? 'text-rose-700' : 'text-slate-500'}`}>Trễ hạn / Chậm</span>
              <div className={`p-1 rounded-lg transition-colors ${activeKpiFilter === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500 group-hover:bg-rose-50 group-hover:text-rose-600'}`}>
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1 z-10">
              <span className="text-2xl font-black font-mono text-slate-800 tracking-tight leading-none">{stats.overdueTasks}</span>
              <span className="text-[9px] text-slate-500 font-extrabold truncate">Cần đôn đốc gấp</span>
            </div>

            {/* Elegant drawing (Warning area waves) */}
            <div className="absolute right-2 bottom-1.5 w-16 h-8 opacity-25 group-hover:opacity-45 transition-opacity pointer-events-none">
              <svg viewBox="0 0 60 30" className="w-full h-full">
                <path d="M0,10 L15,18 L30,12 L45,26 L60,18" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
                <path d="M0,10 L15,18 L30,12 L45,26 L60,18 L60,30 L0,30 Z" fill="url(#rose-grad)" opacity="0.1" />
                <defs>
                  <linearGradient id="rose-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* 3-CỘT HIỆN ĐẠI: Layout 3 cột (Trái Sidebar Spotlight, Giữa KPIs & Charts, Phải Sidebar Chỉ Đạo) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* SIDEBAR TRÁI: Xu thế hiệu suất & Tổng hợp chỉ số Toàn ngành - Thắt chặt padding và h-full cân bằng */}
        <div 
          id="dashboard-spotlight-sidebar" 
          className="lg:col-span-3 bg-[#135837] text-white p-2.5 rounded-3xl border-2 border-[#34d399]/55 shadow-md flex flex-col justify-between h-full min-h-[320px] lg:min-h-0 relative group overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-emerald-700/40 pb-2 mb-1.5 shrink-0">
            <div className="flex flex-col items-start text-left">
              <span className="text-[8px] font-black uppercase text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-sm tracking-wider">
                Chỉ số tổng hợp
              </span>
              <h3 className="text-xs font-black text-white mt-1 leading-tight truncate max-w-[140px]" title="Chỉ số hiệu suất Toàn ngành">
                Toàn ngành
              </h3>
            </div>
            
            <div className="bg-emerald-900/60 border border-emerald-700/50 rounded px-1.5 py-0.5 text-[8px] font-bold text-emerald-200 flex items-center gap-0.5 select-none shrink-0">
              <span>Khung tiêu chí</span>
              <ChevronRight className="w-2.5 h-2.5 rotate-90" />
            </div>
          </div>

          {generalPerformanceChartData.length > 0 ? (
            <>
              {/* Vertical Bar Chart of overall indices */}
              <div className="flex-1 w-full min-h-[110px] relative mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={generalPerformanceChartData} 
                    margin={{ top: 10, right: 5, left: -28, bottom: 5 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false} 
                      stroke="#1e583c"
                    />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#a7f3d0', fontSize: 8, fontWeight: 700 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#a7f3d0', fontSize: 8, fontWeight: 600 }}
                      ticks={[0, 20, 40, 60, 80, 100]}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 border border-slate-700 p-2 rounded shadow-lg text-left max-w-[200px]">
                              <p className="text-[9px] font-bold text-slate-300 leading-normal">{data.fullName}</p>
                              <p className="text-xs font-black text-white mt-0.5">{data.value}% hoàn thành</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[3, 3, 0, 0]} 
                      barSize={14}
                    >
                      {generalPerformanceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend at the bottom matching the style of the green image */}
              <div className="mt-2 pt-1.5 border-t border-emerald-700/30 shrink-0">
                <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-left">
                  {generalPerformanceChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-1 min-w-0" title={item.fullName}>
                      <span 
                        className="w-2 h-1.5 rounded-xs shrink-0" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-[7.5px] text-emerald-100 font-semibold truncate leading-none">
                        {item.name}: {item.shortName}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-center">
                  <span className="text-[7px] text-emerald-300 font-black uppercase tracking-widest leading-none">
                    Tổng số: {stats.totalTasks} Việc | Đạt chung: {stats.averagePerformance.toFixed(1)}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-emerald-200">
              Không có dữ liệu tổng hợp.
            </div>
          )}
        </div>

        {/* PHÂN KHU CHÍNH Ở GIỮA (KPIs & Charts) - lg:col-span-6 */}
        <div className="lg:col-span-6 flex flex-col h-full">
          
          {/* TẦNG 3: Dẫn Đầu Thi Đua Theo Vùng Phân Phối - Thiết kế sang màu vàng/hổ phách đồng bộ */}
          <div className="border-2 border-amber-500/35 rounded-3xl p-3 space-y-3 bg-amber-50 shadow-3xs text-left animate-fade-in flex-1 flex flex-col justify-between h-full">
            <div className="flex items-center space-x-1.5 pl-1 shrink-0 pb-2 border-b border-amber-300/60">
              <MapPin className="w-4 h-4 text-amber-800 shrink-0" />
              <h2 className="text-xs font-black uppercase tracking-wider text-amber-950">
                Dẫn Đầu Thi Đua Theo Vùng Phân Phối
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 items-stretch">
              {/* Card 1: Khối Phòng Ban (PieChart) */}
              <div 
                onClick={() => setSelectedDetailBlock('phong_ban')}
                className="bg-white/70 hover:bg-white p-2 rounded-2xl border border-amber-200/80 shadow-3xs hover:shadow-2xs transition-all duration-150 flex flex-col justify-between relative group cursor-pointer flex-1 min-h-[195px] h-full"
              >
                <div className="flex justify-between items-center border-b border-amber-100 pb-1 shrink-0">
                  <span className="text-[9px] font-black uppercase text-amber-950 tracking-wider">KHỐI PHÒNG BAN</span>
                  <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-sm">100%</span>
                </div>
                <div className="h-[125px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={compactChartsData.deptPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={42}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        style={{ fontSize: '8px', fontWeight: 700 }}
                      >
                        {compactChartsData.deptPie.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value}% đạt`, name]} contentStyle={{ fontSize: '9px', borderRadius: '4px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[8px] text-amber-800/80 font-extrabold uppercase text-center mt-0.5 shrink-0">Cơ cấu hiệu suất (Pie)</div>
              </div>
              
              {/* Card 2: Đơn vị cơ sở - Vùng 1 (BarChart) */}
              <div 
                onClick={() => setSelectedDetailBlock('vung_1')}
                className="bg-white/70 hover:bg-white p-2 rounded-2xl border border-amber-200/80 shadow-3xs hover:shadow-2xs transition-all duration-150 flex flex-col justify-between relative group cursor-pointer flex-1 min-h-[195px] h-full"
              >
                <div className="flex justify-between items-center border-b border-amber-100 pb-1 shrink-0">
                  <span className="text-[9px] font-black uppercase text-amber-950 tracking-wider">ĐƠN VỊ CƠ SỞ - VÙNG 1</span>
                  <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-sm">100%</span>
                </div>
                <div className="h-[125px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compactChartsData.vung1Bar} margin={{ top: 5, right: 5, left: -38, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fffbeb" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '8px', fill: '#78350f', fontWeight: 700 }} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: '7px', fill: '#78350f', fontWeight: 600 }} />
                      <Tooltip formatter={(value, name, props) => [`${value}%`, props.payload.fullName]} contentStyle={{ fontSize: '9px', borderRadius: '4px' }} />
                      <Bar dataKey="Score" radius={[3, 3, 0, 0]}>
                        {compactChartsData.vung1Bar.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[8px] text-amber-800/80 font-extrabold uppercase text-center mt-0.5 shrink-0">Biểu đồ thi đua (Cột đứng)</div>
              </div>
              
              {/* Card 3: Đơn vị cơ sở - Vùng 2 (Horizontal BarChart) */}
              <div 
                onClick={() => setSelectedDetailBlock('vung_2')}
                className="bg-white/70 hover:bg-white p-2 rounded-2xl border border-amber-200/80 shadow-3xs hover:shadow-2xs transition-all duration-150 flex flex-col justify-between relative group cursor-pointer flex-1 min-h-[195px] h-full"
              >
                <div className="flex justify-between items-center border-b border-amber-100 pb-1 shrink-0">
                  <span className="text-[9px] font-black uppercase text-amber-950 tracking-wider">ĐƠN VỊ CƠ SỞ - VÙNG 2</span>
                  <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-sm">100%</span>
                </div>
                <div className="h-[125px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={compactChartsData.vung2Bar} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fffbeb" />
                      <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: '7px', fill: '#78350f', fontWeight: 600 }} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '8px', fill: '#78350f', fontWeight: 700 }} />
                      <Tooltip formatter={(value, name, props) => [`${value}%`, props.payload.fullName]} contentStyle={{ fontSize: '9px', borderRadius: '4px' }} />
                      <Bar dataKey="Score" radius={[0, 3, 3, 0]}>
                        {compactChartsData.vung2Bar.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[8px] text-amber-800/80 font-extrabold uppercase text-center mt-0.5 shrink-0">Biểu đồ thi đua (Cột ngang)</div>
              </div>
            </div>
          </div>
        </div>


        {/* SIDEBAR PHẢI: Bảng Chỉ Đạo Trọng Tâm - Thiết kế đứng chuẩn phong cách, đặt đúng "quảng cáo" góc phải */}
        <div 
          id="global-executive-notice-board" 
          className="lg:col-span-3 bg-[#135837] text-white p-2.5 rounded-3xl border-2 border-emerald-500/35 shadow-md flex flex-col justify-between h-full min-h-[320px] lg:min-h-0 relative group overflow-hidden text-left"
        >
          {/* Subtle background decorative patterns inside notice board */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:10px_10px] pointer-events-none" />
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-emerald-500/10 pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full border border-emerald-500/10 pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-emerald-700/40 pb-2 mb-2 shrink-0 z-10">
            <div className="flex items-center space-x-1.5">
              <Megaphone className="w-3.5 h-3.5 text-yellow-300 animate-bounce shrink-0" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Chỉ đạo & Tin tức</h3>
            </div>
            <span className="text-[8px] bg-emerald-900/60 border border-emerald-700/50 rounded px-1.5 py-0.5 font-bold text-emerald-200 flex items-center gap-0.5 select-none shrink-0">
              <Bell className="w-2.5 h-2.5 text-yellow-300 animate-pulse" />
              {directives.length} Tin
            </span>
          </div>

          {/* Scroller list of Directives */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 mt-1 max-h-[170px] z-10">
            {directives.map(dir => {
              let tagColor = 'bg-blue-900/60 text-blue-200 border-blue-700/50';
              if (dir.category === 'Chỉ đạo') tagColor = 'bg-rose-950/60 text-rose-200 border-rose-800/50';
              else if (dir.category === 'Trọng tâm') tagColor = 'bg-amber-950/60 text-amber-200 border-amber-800/50';
              else if (dir.category === 'Hỗ trợ') tagColor = 'bg-emerald-950/60 text-emerald-200 border-emerald-800/50';

              return (
                <div key={dir.id} className="p-2.5 bg-emerald-950/45 border border-emerald-800/40 rounded-xl hover:border-emerald-600 shadow-sm transition-all flex flex-col justify-between space-y-1 relative group/item overflow-hidden">
                  
                  {/* Decorative diagonal corner stripes */}
                  <div className="absolute -right-1 -bottom-1 opacity-10 pointer-events-none group-hover/item:opacity-20 transition-opacity">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 40 L40 0 M10 40 L40 10 M20 40 L40 20 M30 40 L40 30" stroke="white" strokeWidth="1.5" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border leading-none ${tagColor}`}>
                      {dir.category}
                    </span>
                    <span className="text-[8px] text-emerald-300/80 font-mono font-medium">{dir.date}</span>
                  </div>

                  <p className="text-[10.5px] text-emerald-50/95 font-medium leading-normal tracking-wide relative z-10">
                    {dir.content}
                  </p>

                  {isLeaderOrAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setDirectives(prev => prev.filter(d => d.id !== dir.id));
                      }}
                      className="absolute top-1 right-1 p-0.5 text-emerald-400 hover:text-rose-400 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer animate-fade-in"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {directives.length === 0 && (
              <div className="text-center py-6 text-emerald-300/60 text-[10px] font-medium">
                Không có chỉ đạo mới.
              </div>
            )}
          </div>

          {/* Post News button inside Left/Right Sidebar for Admin */}
          {isLeaderOrAdmin && (
            <div className="pt-2 mt-1.5 border-t border-emerald-700/30 shrink-0 z-10">
              {isAddingDirective ? (
                <div className="bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-600/45 space-y-2 text-left">
                  <span className="text-[9px] font-black uppercase text-emerald-300">Nội dung chỉ đạo mới</span>
                  <textarea
                    rows={2}
                    value={newDirectiveContent}
                    onChange={(e) => setNewDirectiveContent(e.target.value)}
                    placeholder="Nhập nội dung chỉ đạo / trọng tâm..."
                    className="w-full p-1.5 bg-emerald-900/40 border border-emerald-700/50 rounded-lg text-[10px] text-white placeholder-emerald-400 focus:outline-none focus:border-[#34d399]"
                  />
                  
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[8px] font-bold text-emerald-300">Phân loại:</span>
                    <div className="flex gap-1">
                      {(['Chỉ đạo', 'Trọng tâm', 'Hỗ trợ'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewDirectiveCategory(cat)}
                          className={`px-1.5 py-0.5 text-[8px] font-bold rounded border leading-none transition-all ${
                            newDirectiveCategory === cat
                              ? 'bg-[#34d399] text-slate-900 border-[#34d399]'
                              : 'bg-emerald-900/60 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingDirective(false);
                        setNewDirectiveContent('');
                      }}
                      className="px-2 py-1 border border-emerald-700 hover:bg-emerald-900/40 rounded text-[9px] font-bold text-emerald-300 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (newDirectiveContent.trim()) {
                          const newDir = {
                            id: `dir-${Date.now()}`,
                            category: newDirectiveCategory,
                            content: newDirectiveContent.trim(),
                            date: new Date().toLocaleDateString('vi-VN')
                          };
                          setDirectives([newDir, ...directives]);
                          setIsAddingDirective(false);
                          setNewDirectiveContent('');
                        } else {
                          alert('Vui lòng nhập nội dung chỉ đạo.');
                        }
                      }}
                      className="px-2 py-1 bg-[#34d399] hover:bg-[#10b981] text-slate-900 rounded text-[9px] font-bold transition-colors"
                    >
                      Lưu tin
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingDirective(true)}
                  className="w-full py-1.5 bg-[#34d399] hover:bg-[#10b981] text-slate-900 rounded-lg transition-colors shadow-sm text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                  title="Đăng chỉ đạo mới"
                >
                  <Plus className="w-3 h-3 text-slate-900 stroke-[3]" />
                  <span>Đăng tin chỉ đạo</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* TẦNG 3: Kiểm soát Chỉ tiêu & Bảng xếp hạng cán bộ */}
      <div className="space-y-6">
        
        {/* Civil Service Quota Monitor Panel */}
        <div id="quota-panel" className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-500/35 shadow-3xs space-y-4 font-sans animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <h3 className="text-xs font-black text-amber-950 flex items-center gap-2 uppercase tracking-wide">
                <Shield className="w-4 h-4 text-amber-800 shrink-0" />
                Kiểm soát Chỉ tiêu Thi đua Xếp loại "Xuất sắc" (Nghị định 48/2023/NĐ-CP)
              </h3>
              <p className="text-[11px] text-amber-900 font-semibold leading-normal">
                Tỷ lệ cán bộ "Hoàn thành xuất sắc nhiệm vụ" không quá <strong>20%</strong> số lượng cán bộ được xếp loại "Hoàn thành tốt nhiệm vụ" trở lên trong đơn vị.
              </p>
            </div>

            <div className="shrink-0">
              {quotaStats.isQuotaValid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold text-amber-950 bg-amber-100 border border-amber-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                  HỢP LỆ (Đúng quy chuẩn Nghị định)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  VƯỢT CHỈ TIÊU (Vượt hạn mức 20%)
                </span>
              )}
            </div>
          </div>

          {activeRatingFilter !== 'all' && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-950 text-[10px] font-black rounded-full">
                ĐANG LỌC DANH SÁCH BÊN DƯỚI THEO: {
                  activeRatingFilter === 'excellent' ? 'XUẤT SẮC (A)' :
                  activeRatingFilter === 'good' ? 'HOÀN THÀNH TỐT (B)' : 'TỪ TỐT TRỞ LÊN (A + B)'
                }
                <button
                  type="button"
                  onClick={() => setActiveRatingFilter('all')}
                  className="p-0.5 hover:bg-emerald-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3 text-emerald-800" />
                </button>
              </span>
            </div>
          )}

          {/* Breakdown grid - bấm vào từng khối để xem đúng danh sách cán bộ tương ứng ở bảng bên dưới */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveRatingFilter(prev => prev === 'excellent' ? 'all' : 'excellent');
                document.getElementById('employee-ranks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`text-left p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                activeRatingFilter === 'excellent'
                  ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30'
                  : 'bg-white/70 border-amber-200/60 hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">Xuất sắc (A)</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-black text-amber-950 font-mono">{quotaStats.excellentCount}</span>
                <span className="text-xs text-amber-800 font-bold">đồng chí</span>
              </div>
              <p className="text-[9px] text-amber-700/80 mt-0.5">Tiêu chuẩn: Điểm đạt ≥ 99.5%</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRatingFilter(prev => prev === 'good' ? 'all' : 'good');
                document.getElementById('employee-ranks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`text-left p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                activeRatingFilter === 'good'
                  ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30'
                  : 'bg-white/70 border-amber-200/60 hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">Hoàn thành tốt (B)</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-black text-amber-900 font-mono">{quotaStats.goodCount}</span>
                <span className="text-xs text-amber-800 font-bold">đồng chí</span>
              </div>
              <p className="text-[9px] text-amber-700/80 mt-0.5">Tiêu chuẩn: Điểm đạt 90% - 99.4%</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRatingFilter(prev => prev === 'good_and_above' ? 'all' : 'good_and_above');
                document.getElementById('employee-ranks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`text-left p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                activeRatingFilter === 'good_and_above'
                  ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30'
                  : 'bg-white/70 border-amber-200/60 hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">Tỷ lệ thực tế</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-lg font-black font-mono ${quotaStats.isQuotaValid ? 'text-amber-950' : 'text-rose-600'}`}>
                  {quotaStats.quotaPercentage.toFixed(1)}%
                </span>
                <span className="text-[10px] text-amber-800 font-bold">/ 20.0% tối đa</span>
              </div>
              <p className="text-[9px] text-amber-700/80 mt-0.5">Trên tổng {quotaStats.excellentAndGoodTotal} cán bộ đạt Tốt trở lên</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRatingFilter(prev => prev === 'good_and_above' ? 'all' : 'good_and_above');
                document.getElementById('employee-ranks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`text-left p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                activeRatingFilter === 'good_and_above'
                  ? 'ring-2 ring-amber-500/30 ' + (quotaStats.isQuotaValid ? 'bg-amber-100/70 border-amber-500 text-amber-950' : 'bg-rose-100/70 border-rose-500 text-rose-950')
                  : (quotaStats.isQuotaValid ? 'bg-amber-100/55 border-amber-300 text-amber-950 hover:border-amber-400' : 'bg-rose-50/55 border-rose-200 text-rose-950 hover:border-rose-400')
              }`}
            >
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">Cơ cấu chỉ tiêu</span>
              <div className="flex items-baseline gap-1.5 mt-1 font-sans font-bold text-xs">
                {quotaStats.isQuotaValid ? (
                  <span>Tối đa cho phép: <span className="font-mono text-sm font-black text-amber-950">{quotaStats.maxExcellentAllowed}</span> đồng chí</span>
                ) : (
                  <span className="text-rose-600 font-black">Thừa {quotaStats.excellentCount - quotaStats.maxExcellentAllowed} chỉ tiêu xuất sắc</span>
                )}
              </div>
              <p className="text-[9px] text-amber-800/80 mt-0.5 font-bold">
                {quotaStats.isQuotaValid 
                  ? `Có thể bổ sung thêm ${quotaStats.maxExcellentAllowed - quotaStats.excellentCount} đồng chí` 
                  : 'Yêu cầu cơ cấu lại danh sách xếp loại'}
              </p>
            </button>
          </div>
        </div>

        {/* Cán Bộ Leaderboard Table */}
        <div id="employee-ranks" className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-500/35 shadow-3xs text-left animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                  {selectedCalendarDay !== null && selectedCalendarDay !== undefined
                    ? `Danh Sách Báo Cáo Hạn Ngày ${selectedCalendarDay}/${displayCalendarMonth.toString().padStart(2, '0')}/${displayCalendarYear}`
                    : activeRatingFilter !== 'all'
                    ? `Danh Sách Cán Bộ Xếp Loại: ${
                        activeRatingFilter === 'excellent' ? 'Xuất Sắc (A)' :
                        activeRatingFilter === 'good' ? 'Hoàn Thành Tốt (B)' : 'Từ Tốt Trở Lên (A + B)'
                      }`
                    : 'Bảng Xếp Hạng Đánh Giá Đảng Viên, Cán Bộ'}
                </h3>
                <p className="text-xs text-amber-900 font-semibold leading-normal mt-0.5">
                  {selectedCalendarDay !== null && selectedCalendarDay !== undefined
                    ? `Danh sách các cán bộ có báo cáo/nhiệm vụ đến hạn cần rà soát trong ngày ${selectedCalendarDay} tháng ${displayCalendarMonth.toString().padStart(2, '0')} năm ${displayCalendarYear}.`
                    : activeRatingFilter !== 'all'
                    ? `Đây chính là danh sách thực tế dùng để tính số liệu ở khối "Kiểm soát Chỉ tiêu Thi đua" phía trên. Tổng số: ${filteredEmployeeRankings.length} cán bộ.`
                    : 'Tổng hợp kết quả đánh giá thực hiện nhiệm vụ công việc Quý II / 2026. Nhấn vào hàng bất kỳ để xem nhanh cán bộ trên thanh tiêu điểm.'}
                </p>
              </div>
              {selectedCalendarDay !== null && selectedCalendarDay !== undefined && setSelectedCalendarDay ? (
                <div className="animate-fade-in flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-950 text-[10px] font-black rounded-full shrink-0 shadow-3xs">
                  <span>ĐANG LỌC: BÁO CÁO NGÀY {selectedCalendarDay}/{displayCalendarMonth.toString().padStart(2, '0')}</span>
                  <button
                    onClick={() => setSelectedCalendarDay(null)}
                    className="p-0.5 hover:bg-emerald-200 rounded-full transition-colors cursor-pointer"
                    title="Quay lại bảng xếp hạng mặc định"
                  >
                    <X className="w-3 h-3 text-emerald-800" />
                  </button>
                </div>
              ) : activeRatingFilter !== 'all' ? (
                <div className="animate-fade-in flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-black rounded-full shrink-0 shadow-3xs">
                  <span>
                    ĐANG LỌC: {
                      activeRatingFilter === 'excellent' ? 'XUẤT SẮC (A)' :
                      activeRatingFilter === 'good' ? 'HOÀN THÀNH TỐT (B)' : 'TỪ TỐT TRỞ LÊN (A + B)'
                    }
                  </span>
                  <button
                    onClick={() => setActiveRatingFilter('all')}
                    className="p-0.5 hover:bg-amber-200 rounded-full transition-colors cursor-pointer"
                    title="Xóa bộ lọc"
                  >
                    <X className="w-3 h-3 text-amber-800" />
                  </button>
                </div>
              ) : activeKpiFilter !== 'all' ? (
                <div className="animate-fade-in flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-black rounded-full shrink-0 shadow-3xs">
                  <span>
                    ĐANG LỌC: {
                      activeKpiFilter === 'in_progress' ? 'CÔNG VIỆC ĐANG THỰC HIỆN' :
                      activeKpiFilter === 'near_deadline' ? 'CÔNG VIỆC GẦN ĐẾN HẠN' :
                      activeKpiFilter === 'completed' ? 'CÔNG VIỆC ĐÚNG HẠN / ĐẠT' : 'CÔNG VIỆC TRỄ HẠN / CHẬM'
                    }
                  </span>
                  <button
                    onClick={() => setActiveKpiFilter('all')}
                    className="p-0.5 hover:bg-amber-200 rounded-full transition-colors cursor-pointer"
                    title="Xóa bộ lọc"
                  >
                    <X className="w-3 h-3 text-amber-800" />
                  </button>
                </div>
              ) : null}
            </div>
            <span className="text-[10px] font-mono text-amber-950 bg-amber-100 px-2.5 py-1 rounded-md font-bold border border-amber-350 shrink-0 self-start sm:self-auto">
             Lãnh Đạo duyệt
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {selectedCalendarDay !== null && selectedCalendarDay !== undefined ? (
                  <tr className="border-b border-amber-300/60 text-[10px] text-amber-900/80 uppercase font-bold">
                    <th className="py-3 px-4 w-12">STT</th>
                    <th className="py-3 px-4">Đồng chí phụ trách</th>
                    <th className="py-3 px-4">Chức vụ / Phòng ban</th>
                    <th className="py-3 px-4">Nội dung báo cáo / Nhiệm vụ</th>
                    <th className="py-3 px-4 text-center">Tiến độ quy định</th>
                    <th className="py-3 px-4 text-center">Trạng thái hiện tại</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                ) : (
                  <tr className="border-b border-amber-300/60 text-[10px] text-amber-900/80 uppercase font-bold">
                    <th className="py-3 px-4 w-12">Hạng</th>
                    <th className="py-3 px-4">Họ và Tên Cán bộ</th>
                    <th className="py-3 px-4">Chức vụ / Đơn vị</th>
                    <th className="py-3 px-4 text-center">Số công việc</th>
                    <th className="py-3 px-4 text-right">Tổng Quy đổi MT</th>
                    <th className="py-3 px-4 text-right">Điểm Đạt KPI</th>
                    <th className="py-3 px-4 text-center">Phân Loại Công Chức</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-amber-100/40">
                {selectedCalendarDay !== null && selectedCalendarDay !== undefined && getTasksForDay ? (
                  getTasksForDay(selectedCalendarDay).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-amber-900/60 italic font-bold">
                        Không có báo cáo hay nhiệm vụ nào có hạn vào ngày {selectedCalendarDay}/{displayCalendarMonth.toString().padStart(2, '0')}/{displayCalendarYear}.
                      </td>
                    </tr>
                  ) : (
                    getTasksForDay(selectedCalendarDay).map((item, index) => {
                      const emp = item.emp;
                      const task = item.task;
                      const isCompleted = task.actualQtyCount >= task.targetQuantity;
                      const selectedDateObj = new Date(displayCalendarYear, displayCalendarMonth - 1, selectedCalendarDay);
                      const todayObj = new Date();
                      todayObj.setHours(0, 0, 0, 0);
                      const isOverdue = !isCompleted && selectedDateObj.getTime() < todayObj.getTime();
                      
                      return (
                        <tr 
                          key={`${emp.id}-${task.id}`}
                          className="bg-white/40 hover:bg-amber-100/60 transition-all duration-150"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-amber-900">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={emp.avatar} 
                                alt={emp.name} 
                                className="w-8 h-8 rounded-full object-cover border border-amber-200/60"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="font-bold text-amber-950">{emp.name}</p>
                                <p className="text-[10px] text-amber-800/80 font-bold">{emp.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-amber-900 font-semibold">{emp.department}</td>
                          <td className="py-3 px-4 text-slate-700 font-medium max-w-md">
                            <p className="font-semibold text-slate-800 text-[11px] whitespace-normal break-words leading-normal">{task.mission}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold">SP: {task.productName}</p>
                          </td>
                          <td className="py-3 px-4 text-center text-amber-900 font-semibold italic">{formatTimelineDisplay(task.timeline)}</td>
                          <td className="py-3 px-4 text-center">
                            {isCompleted ? (
                              <span className="px-2.5 py-0.5 text-[9px] font-bold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                Đã hoàn thành
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2.5 py-0.5 text-[9px] font-bold rounded-full border bg-rose-50 text-rose-700 border-rose-200 animate-pulse">
                                Trễ hạn / Chậm
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 text-[9px] font-bold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                                Đang triển khai
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button 
                              onClick={() => {
                                if (setSelectedCalendarDay) {
                                  setSelectedCalendarDay(null); // Clear calendar day so they see employee sheet properly
                                }
                                onSelectEmployee(emp.id);
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center justify-center gap-0.5 mx-auto"
                            >
                              Hồ sơ &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )
                ) : (
                  filteredEmployeeRankings.map((emp, index) => {
                    const rankColors = [
                      'bg-amber-200 text-amber-950 font-bold border-amber-300',
                      'bg-amber-100/80 text-amber-900 font-semibold border-amber-200',
                      'bg-amber-50 text-amber-800 border-amber-150',
                    ];
                    
                    let statusLabel = 'Hoàn thành nhiệm vụ';
                    let statusBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    
                    if (emp.overallScore >= 99.5) {
                      statusLabel = 'Hoàn thành xuất sắc';
                      statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    } else if (emp.overallScore >= 90) {
                      statusLabel = 'Hoàn thành tốt';
                      statusBadgeColor = 'bg-teal-50 text-teal-700 border-teal-200';
                    } else if (emp.overallScore < 85) {
                      statusLabel = 'Cần nỗ lực thêm';
                      statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                    }

                    const isSpotlighted = emp.id === spotlightEmployeeId;

                    return (
                      <tr 
                        key={emp.id} 
                        onClick={() => setSpotlightEmployeeId(emp.id)}
                        className={`hover:bg-amber-100/60 transition-all duration-150 cursor-pointer group ${isSpotlighted ? 'bg-white shadow-xs border-2 border-amber-500/25' : 'bg-white/40'}`}
                      >
                        <td className="py-3 px-4">
                          {index < 3 ? (
                            <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${rankColors[index]}`}>
                              {index + 1}
                            </span>
                          ) : (
                            <span className="text-amber-900/60 pl-2 font-mono font-bold">{index + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={emp.avatar} 
                              alt={emp.name} 
                              className="w-8 h-8 rounded-full object-cover border border-amber-200/60"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-amber-950">{emp.name}</p>
                              <p className="text-[10px] text-amber-800/80 font-bold">{emp.role}</p>
                              {emp.isOfficial ? (
                                <span className="inline-flex items-center gap-0.5 mt-0.5 text-[8.5px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
                                  Điểm chính thức
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 mt-0.5 text-[8.5px] font-black uppercase text-slate-500 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">
                                  Chờ gửi/duyệt
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-amber-900 font-semibold">{emp.department}</td>
                        <td className="py-3 px-4 text-amber-900/90 text-center font-bold">{emp.tasks.length} đầu việc</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-800 font-bold">
                          {emp.summary.totalTargetConverted.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-950">
                          {emp.overallScore.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${statusBadgeColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setSpotlightEmployeeId(emp.id)}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer"
                            >
                              Tiêu điểm
                            </button>
                            <span className="text-slate-200">|</span>
                            <button 
                              onClick={() => onSelectEmployee(emp.id)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              Hồ sơ <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* BLOCK DETAILS INTERACTIVE MODAL (Requirement 4: "khi kích vào đó sẽ hiện lên chi tiết") */}
      {selectedDetailBlock && modalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-zoom-in">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-sm">
                  Rà soát nội bộ thi đua
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">{modalData.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{modalData.description}</p>
              </div>
              <button 
                onClick={() => setSelectedDetailBlock(null)}
                className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* 1. Rankings table of departments in this block */}
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">
                  Xếp Hạng Các Đơn Vị Trong Khối
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {modalData.stats.map((item, index) => {
                    const progressVal = Math.min(100, item.avgScore);
                    let barColor = 'bg-indigo-600';
                    if (index === 0) barColor = 'bg-emerald-500';
                    else if (index === 1) barColor = 'bg-teal-500';

                    return (
                      <div key={item.name} className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center space-x-3 w-full sm:w-1/3 shrink-0">
                          <span className={`w-6 h-6 rounded-full font-bold font-mono text-[11px] flex items-center justify-center shrink-0 border ${
                            index === 0 
                              ? 'bg-amber-100 text-amber-800 border-amber-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            #{index + 1}
                          </span>
                          <span className="font-extrabold text-slate-800 text-xs truncate" title={item.name}>{item.name}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex-1 w-full space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">{item.employeesCount} nhân sự trực thuộc</span>
                            <span className="text-slate-700 font-mono">{item.avgScore.toFixed(2)}% đạt</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className={`${barColor} h-2 rounded-full`} style={{ width: `${progressVal}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. List of individual employees sorted */}
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">
                  Danh Sách Toàn Bộ Cán Bộ / Đảng Viên Thuộc Khối
                </p>
                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 text-xs">
                  
                  {/* Collect and sort all employees in this block */}
                  {modalData.stats
                    .flatMap(stat => stat.employees)
                    .sort((a, b) => b.score - a.score)
                    .map((emp, empIdx) => (
                      <div key={emp.id} className="p-3.5 hover:bg-slate-50/50 flex items-center justify-between transition-colors">
                        <div className="flex items-center space-x-3 truncate">
                          <span className="w-5 font-mono font-bold text-slate-400 text-right pr-1">{(empIdx + 1)}.</span>
                          <img 
                            src={emp.avatar} 
                            alt="" 
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{emp.role} • <strong>{emp.department}</strong></p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-lg">
                            {emp.score.toFixed(2)}%
                          </span>
                          <button
                            onClick={() => {
                              onSelectEmployee(emp.id);
                              setSelectedDetailBlock(null);
                            }}
                            className="px-3 py-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                          >
                            Xem hồ sơ
                          </button>
                        </div>
                      </div>
                    ))
                  }

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetailBlock(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold rounded-xl cursor-pointer transition-colors"
              >
                Đóng rà soát
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT DANH SÁCH ĐẦU VIỆC THEO KHỐI TRẠNG THÁI */}
      {selectedKpiBlock && (
        <div id="kpi-tasks-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div className="text-left">
                <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Danh sách chỉ tiêu & trạng thái
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600 animate-pulse" />
                  Danh Sách Chi Tiết Đầu Việc: {
                    selectedKpiBlock === 'all' ? 'Tổng số công việc Toàn ngành' :
                    selectedKpiBlock === 'in_progress' ? 'Đầu việc Đang triển khai' :
                    selectedKpiBlock === 'near_deadline' ? 'Đầu việc Gần đến hạn' :
                    selectedKpiBlock === 'completed' ? 'Đầu việc Đúng hạn / Đạt chất lượng' : 'Đầu việc Trễ hạn / Chậm tiến độ'
                  }
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  {selectedKpiBlock === 'near_deadline' ? (
                    <>
                      Hiển thị các nhiệm vụ chưa hoàn thành và <strong>còn cách hạn hoàn thành 2 ngày trở xuống</strong> (≤ 2 ngày so với hôm nay). Tổng số: <strong>{kpiBlockTasks.length}</strong> đầu việc.
                    </>
                  ) : (
                    <>
                      Hiển thị danh sách nhiệm vụ được phân loại chi tiết theo từng cán bộ, đảng viên thực hiện. Tổng số: <strong>{kpiBlockTasks.length}</strong> đầu việc.
                    </>
                  )}
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedKpiBlock(null);
                }}
                className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              
              {/* BỘ LỌC THỜI GIAN NHANH CHÓNG (FAST DATE RANGE & PERIOD FILTERS) */}
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                
                {/* Nút lọc nhanh */}
                <div className="flex flex-col gap-1.5 text-left flex-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Lọc nhanh theo các khoảng thời gian chính:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {[
                      { type: 'all', label: 'Tất cả thời gian' },
                      { type: 'last_week', label: 'Tuần trước' },
                      { type: 'this_week', label: 'Tuần này' },
                      { type: 'last_month', label: 'Tháng trước' },
                      { type: 'this_month', label: 'Tháng này' },
                      { type: 'last_quarter', label: 'Quý trước' },
                      { type: 'this_quarter', label: 'Quý này' },
                      { type: 'specific_month', label: 'Theo tháng cụ thể...' },
                    ].map((btn) => (
                      <button
                        key={btn.type}
                        type="button"
                        onClick={() => {
                          setDateFilterType(btn.type);
                          if (btn.type !== 'custom') {
                            setCustomStartDate('');
                            setCustomEndDate('');
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 cursor-pointer ${
                          dateFilterType === btn.type
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  {dateFilterType === 'specific_month' && (
                    <div className="flex items-center gap-2 mt-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 self-start">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Tháng</span>
                      <select
                        value={specificMonth}
                        onChange={(e) => setSpecificMonth(parseInt(e.target.value, 10))}
                        className="bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0 focus:outline-hidden font-bold cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>Tháng {m.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                      <span className="text-slate-300">/</span>
                      <select
                        value={specificMonthYear}
                        onChange={(e) => setSpecificMonthYear(parseInt(e.target.value, 10))}
                        className="bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0 focus:outline-hidden font-bold cursor-pointer"
                      >
                        {[2025, 2026, 2027].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Hoặc tự chọn Ngày cụ thể */}
                <div className="flex flex-col gap-1.5 text-left border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-6 shrink-0">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Hoặc thiết lập khoảng ngày tùy biến:
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setDateFilterType('custom');
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                      />
                    </div>
                    <span className="text-slate-400 text-xs font-bold">đến</span>
                    <div className="relative">
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          setDateFilterType('custom');
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                      />
                    </div>
                    
                    {(customStartDate || customEndDate || dateFilterType !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilterType('all');
                          setCustomStartDate('');
                          setCustomEndDate('');
                        }}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 font-bold transition-colors cursor-pointer"
                        title="Xóa bộ lọc"
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* BẢNG DANH SÁCH CHI TIẾT */}
              <div className="min-w-[1200px] border border-slate-100 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200/60 text-slate-700 uppercase font-black text-[10px] tracking-wider">
                      <th className="py-3.5 px-3 text-center w-14">STT</th>
                      <th className="py-3.5 px-4 w-48">Họ và tên</th>
                      <th className="py-3.5 px-4 min-w-[240px]">Nội dung nhiệm vụ</th>
                      <th className="py-3.5 px-4 w-36">Cấp trình</th>
                      <th className="py-3.5 px-4 w-44">Sản phẩm</th>
                      <th className="py-3.5 px-4 w-36 text-center">Phân loại công việc</th>
                      <th className="py-3.5 px-3 text-center w-20">Số lượng</th>
                      <th className="py-3.5 px-4 w-52">Tiến độ (Hạn hoàn thành)</th>
                      <th className="py-3.5 px-3 text-center w-28">Khung điểm tối đa</th>
                      <th className="py-3.5 px-3 text-center w-24">Điểm tự chấm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kpiBlockTasks.map((item) => (
                      <tr key={item.stt} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400 font-mono">{item.stt}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <img 
                              src={item.employeeAvatar} 
                              alt="" 
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <span className="font-bold text-slate-800 line-clamp-1">{item.employeeName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 leading-relaxed text-justify">{item.mission}</td>
                        <td className="py-3 px-4 text-slate-600 font-bold">{item.reportingLevel}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{item.productName}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                            item.taskType === 'Phát sinh' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            item.taskType === 'Đột xuất' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {item.taskType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{item.targetQuantity}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 text-left">
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded-md text-[10.5px] w-fit">
                              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              {item.taskDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold italic pl-1">
                              ({formatTimelineDisplay(item.timeline)})
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">{item.maxScore}</td>
                        <td className="py-3 px-3 text-center font-mono font-black text-amber-600 bg-amber-50/40 rounded-md">{item.assignedScore}</td>
                      </tr>
                    ))}
                    {kpiBlockTasks.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                          Không tìm thấy công việc nào phù hợp trong danh mục rà soát này trong khoảng thời gian đã chọn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedKpiBlock(null);
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-950 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                Đóng danh sách
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
