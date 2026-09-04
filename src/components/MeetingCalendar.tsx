import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Video,
  MapPin,
  Clock,
  X,
  Edit2,
  Save,
  Trash2,
  Users,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Eye,
  AlertCircle,
  Laptop2,
  MonitorSpeaker,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { Meeting, User as UserType } from '../types';

interface MeetingCalendarProps {
  meetings: Meeting[];
  users: UserType[];
  onUpdateMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meetingId: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
  globalRole?: string;
  currentUser?: UserType | null;
}

const MEETING_TYPE_CONFIG = {
  offline: { 
    label: 'Trực tiếp', 
    color: '#16a34a', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/50', 
    text: 'text-emerald-800 dark:text-emerald-300', 
    border: 'border-emerald-300 dark:border-emerald-800',
    badge: 'bg-emerald-600 text-white',
    icon: MapPin 
  },
  google_meet: { 
    label: 'Google Meet', 
    color: '#0284c7', 
    bg: 'bg-sky-50 dark:bg-sky-950/50', 
    text: 'text-sky-800 dark:text-sky-300', 
    border: 'border-sky-300 dark:border-sky-800',
    badge: 'bg-sky-600 text-white',
    icon: Video 
  },
  polycom: { 
    label: 'Polycom', 
    color: '#7c3aed', 
    bg: 'bg-purple-50 dark:bg-purple-950/50', 
    text: 'text-purple-800 dark:text-purple-300', 
    border: 'border-purple-300 dark:border-purple-800',
    badge: 'bg-purple-600 text-white',
    icon: MonitorSpeaker 
  },
  hybrid: { 
    label: 'Hybrid (Trực tiếp & Online)', 
    color: '#d97706', 
    bg: 'bg-amber-50 dark:bg-amber-950/50', 
    text: 'text-amber-800 dark:text-amber-300', 
    border: 'border-amber-300 dark:border-amber-800',
    badge: 'bg-amber-600 text-white',
    icon: Laptop2 
  },
};

const DAY_NAMES = [
  { short: 'T2', full: 'Thứ Hai' },
  { short: 'T3', full: 'Thứ Ba' },
  { short: 'T4', full: 'Thứ Tư' },
  { short: 'T5', full: 'Thứ Năm' },
  { short: 'T6', full: 'Thứ Sáu' },
  { short: 'T7', full: 'Thứ Bảy' },
  { short: 'CN', full: 'Chủ Nhật' },
];

export const MeetingCalendar: React.FC<MeetingCalendarProps> = ({
  meetings,
  users,
  onUpdateMeeting,
  onDeleteMeeting,
  addToast,
  globalRole,
  currentUser
}) => {
  const isStaff = globalRole === 'STAFF';
  // State for Month & Year Navigation
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  // Selected single day filter (null = show all meetings of the month)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Modal State
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editForm, setEditForm] = useState<Partial<Meeting>>({});
  const [showPersonnelPicker, setShowPersonnelPicker] = useState<boolean>(false);
  const [personnelSearch, setPersonnelSearch] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDate(null);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentDate(new Date(currentYear, newMonth, 1));
    setSelectedDate(null);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentDate(new Date(newYear, currentMonth, 1));
    setSelectedDate(null);
  };

  // Calculate calendar grid days
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // In Vietnam, week starts on Monday (1=Mon ... 0=Sun). Offset for Monday-start:
  const startingDayOffset = (firstDayOfMonth + 6) % 7;
  const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();

  // Filter meetings by search and type
  const processedMeetings = useMemo(() => {
    return meetings.filter(m => {
      if (filterType !== 'ALL' && m.meetingType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = m.title?.toLowerCase().includes(q);
        const matchDesc = m.description?.toLowerCase().includes(q);
        const matchLoc = m.location?.toLowerCase().includes(q);
        const matchOrg = m.organizer?.toLowerCase().includes(q);
        const matchAtt = m.attendees?.some(a => a.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchLoc && !matchOrg && !matchAtt) return false;
      }
      return true;
    });
  }, [meetings, filterType, searchQuery]);

  // Meetings in the current active month
  const monthMeetings = useMemo(() => {
    return processedMeetings.filter(m => {
      if (!m.startDate) return false;
      const d = new Date(m.startDate);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [processedMeetings, currentYear, currentMonth]);

  // Group meetings by day in month (1..31)
  const meetingsByDay = useMemo(() => {
    const map: Record<number, Meeting[]> = {};
    monthMeetings.forEach(m => {
      if (!m.startDate) return;
      const d = new Date(m.startDate);
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(m);
    });
    return map;
  }, [monthMeetings]);

  // Filter meetings for the detailed list
  const detailedListMeetings = useMemo(() => {
    if (!selectedDate) {
      return monthMeetings;
    }
    return monthMeetings.filter(m => {
      if (!m.startDate) return false;
      const d = new Date(m.startDate);
      return (
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate()
      );
    });
  }, [monthMeetings, selectedDate]);

  // Stats for the month
  const monthStats = useMemo(() => {
    const total = monthMeetings.length;
    const offline = monthMeetings.filter(m => m.meetingType === 'offline').length;
    const meet = monthMeetings.filter(m => m.meetingType === 'google_meet').length;
    const poly = monthMeetings.filter(m => m.meetingType === 'polycom').length;
    const hybrid = monthMeetings.filter(m => m.meetingType === 'hybrid').length;
    const now = new Date();
    const upcoming = monthMeetings.filter(m => new Date(m.startDate) >= now).length;
    return { total, offline, meet, poly, hybrid, upcoming };
  }, [monthMeetings]);

  // Departments list for personnel picker
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    (users || []).forEach(u => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set);
  }, [users]);

  // Filtered users for personnel picker
  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => {
      if (selectedDeptFilter !== 'ALL' && u.department !== selectedDeptFilter) return false;
      if (personnelSearch.trim()) {
        const q = personnelSearch.toLowerCase().trim();
        const mName = u.fullName?.toLowerCase().includes(q);
        const mDept = u.department?.toLowerCase().includes(q);
        const mPos = u.position?.toLowerCase().includes(q);
        if (!mName && !mDept && !mPos) return false;
      }
      return true;
    });
  }, [users, selectedDeptFilter, personnelSearch]);

  // Copy meeting link
  const handleCopyLink = (m: Meeting) => {
    const link = m.googleMeetLink || (m.meetingType === 'google_meet' || m.meetingType === 'hybrid' ? 'https://meet.google.com/bbn-satc-cxm' : (m.meetingType === 'offline' ? m.location : ''));
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedId(m.id);
      addToast('success', 'Đã sao chép link', link);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyAgencyMeet = () => {
    const link = 'https://meet.google.com/bbn-satc-cxm';
    navigator.clipboard.writeText(link);
    setCopiedId('agency-meet');
    addToast('success', 'Đã sao chép link Google Meet cơ quan', link);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Edit Handlers
  const handleOpenEdit = (m: Meeting) => {
    setEditingMeeting(m);
    setEditForm({
      title: m.title || '',
      description: m.description || '',
      meetingType: m.meetingType || 'offline',
      startDate: m.startDate ? new Date(m.startDate).toISOString().slice(0, 16) : '',
      endDate: m.endDate ? new Date(m.endDate).toISOString().slice(0, 16) : '',
      location: m.location || '',
      organizer: m.organizer || '',
      googleMeetLink: m.googleMeetLink || (m.meetingType === 'google_meet' || m.meetingType === 'hybrid' ? 'https://meet.google.com/bbn-satc-cxm' : ''),
      attendees: m.attendees || []
    });
    setShowPersonnelPicker(false);
  };

  const handleToggleAttendeeInEdit = (personName: string) => {
    const currentList = editForm.attendees || [];
    if (currentList.includes(personName)) {
      setEditForm({
        ...editForm,
        attendees: currentList.filter(a => a !== personName)
      });
    } else {
      setEditForm({
        ...editForm,
        attendees: [...currentList, personName]
      });
    }
  };

  const handleRemoveAttendeeInEdit = (personName: string) => {
    const currentList = editForm.attendees || [];
    setEditForm({
      ...editForm,
      attendees: currentList.filter(a => a !== personName)
    });
  };

  const handleSaveEdit = () => {
    if (!editingMeeting) return;
    if (!editForm.title?.trim()) {
      addToast('error', 'Lỗi', 'Vui lòng nhập tiêu đề cuộc họp');
      return;
    }
    if (!editForm.startDate || !editForm.endDate) {
      addToast('error', 'Lỗi', 'Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }
    if (new Date(editForm.startDate) >= new Date(editForm.endDate)) {
      addToast('error', 'Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const updated: Meeting = {
      ...editingMeeting,
      title: editForm.title.trim(),
      description: editForm.description || '',
      meetingType: (editForm.meetingType as any) || 'offline',
      startDate: new Date(editForm.startDate).toISOString(),
      endDate: new Date(editForm.endDate).toISOString(),
      location: editForm.location || '',
      organizer: editForm.organizer || '',
      googleMeetLink: editForm.googleMeetLink || '',
      attendees: editForm.attendees || []
    };

    onUpdateMeeting(updated);
    setEditingMeeting(null);
    addToast('success', 'Thành công', 'Đã cập nhật thông tin cuộc họp');
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa cuộc họp: "${title}" không?`)) {
      onDeleteMeeting(id);
      addToast('success', 'Đã xóa cuộc họp', title);
    }
  };

  const handleNavigateToRegister = () => {
    const event = new CustomEvent('navigate-to-tab', { detail: 'meeting_register' });
    window.dispatchEvent(event);
  };

  const todayDate = new Date();

  return (
    <div className="w-full max-w-[100vw] px-2 sm:px-4 py-2 space-y-3 animate-in fade-in duration-200">
      
      {/* 1. TOP HEADER & TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-3 sm:p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          
          {/* Title & Month Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004499] to-[#002b66] flex items-center justify-center text-white shadow-xs shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Lịch Bàn Tháng & Danh Sách Cuộc Họp
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Tháng {currentMonth + 1}/{currentYear}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                Giao diện toàn màn hình: Lịch tháng bên trái (40%) và Danh sách chi tiết các cuộc họp bên phải (60%)
              </p>
            </div>
          </div>

          {/* Month / Year Navigator Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition-all"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-2">
                <select
                  value={currentMonth}
                  onChange={handleMonthChange}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer py-1"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      Tháng {i + 1}
                    </option>
                  ))}
                </select>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <select
                  value={currentYear}
                  onChange={handleYearChange}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer py-1"
                >
                  {Array.from({ length: 7 }, (_, i) => 2023 + i).map(y => (
                    <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition-all"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Hôm nay
            </button>

            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1 transition-all"
              >
                <span>Xem cả tháng</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleNavigateToRegister}
              className="px-3.5 py-1.5 bg-[#004499] hover:bg-[#003377] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Đăng ký lịch họp
            </button>

            {/* Link Google Meet cố định của cơ quan */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 rounded-xl">
              <Video className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <div className="flex flex-col text-left pr-1">
                <span className="text-[9.5px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-tight">Meet Cơ Quan</span>
                <span className="text-[10px] font-mono text-sky-700 dark:text-sky-400 font-medium">bbn-satc-cxm</span>
              </div>
              <a
                href="https://meet.google.com/bbn-satc-cxm"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                title="Vào phòng họp Google Meet chính thức"
              >
                <span>Vào Meet</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                type="button"
                onClick={handleCopyAgencyMeet}
                className="p-1 text-sky-700 hover:text-sky-900 dark:text-sky-400 hover:bg-sky-100 rounded"
                title="Sao chép link Google Meet: https://meet.google.com/bbn-satc-cxm"
              >
                {copiedId === 'agency-meet' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FULL SCREEN 2-COLUMN SIDE-BY-SIDE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: LỊCH BÀN THÁNG (40% WIDTH)                                 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col">
            
            {/* Header of Calendar Grid */}
            <div className="px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#004499]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Lịch Bàn Tháng {currentMonth + 1}/{currentYear}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {monthMeetings.length} cuộc họp
              </span>
            </div>

            {/* 7 Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 text-center">
              {DAY_NAMES.map((day, idx) => {
                const isWeekend = idx >= 5;
                return (
                  <div 
                    key={day.short} 
                    className={`py-1.5 text-center border-r last:border-r-0 border-slate-200/60 dark:border-slate-800 ${
                      isWeekend ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${
                      isWeekend ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {day.short}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              
              {/* Trailing days from previous month */}
              {Array.from({ length: startingDayOffset }, (_, i) => {
                const prevDateNum = prevMonthDaysCount - startingDayOffset + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    className="h-16 sm:h-20 p-1 bg-slate-50/40 dark:bg-slate-900/30 text-slate-300 dark:text-slate-700 select-none flex flex-col justify-start"
                  >
                    <span className="text-[10.5px] font-medium text-slate-300 dark:text-slate-700 pl-1">{prevDateNum}</span>
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dayDate = new Date(currentYear, currentMonth, dayNum);
                const dayMeetings = meetingsByDay[dayNum] || [];
                const hasMeetings = dayMeetings.length > 0;

                const isToday =
                  todayDate.getFullYear() === currentYear &&
                  todayDate.getMonth() === currentMonth &&
                  todayDate.getDate() === dayNum;

                const isSelected =
                  selectedDate !== null &&
                  selectedDate.getFullYear() === currentYear &&
                  selectedDate.getMonth() === currentMonth &&
                  selectedDate.getDate() === dayNum;

                const dayOfWeekIdx = (dayDate.getDay() + 6) % 7;
                const isWeekend = dayOfWeekIdx >= 5;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDate(prev => (prev?.getDate() === dayNum && prev?.getMonth() === currentMonth ? null : dayDate))}
                    className={`h-16 sm:h-20 p-1 relative cursor-pointer transition-all duration-150 flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-[#004499] z-10'
                        : hasMeetings
                        ? 'bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-slate-800/80'
                        : isWeekend
                        ? 'bg-slate-50/30 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Day Number and Indicator */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] w-5 h-5 flex items-center justify-center rounded-full font-bold transition-all ${
                          isToday
                            ? 'bg-[#004499] text-white shadow-xs'
                            : isSelected
                            ? 'bg-blue-600 text-white'
                            : isWeekend
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {hasMeetings && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                          {dayMeetings.length}
                        </span>
                      )}
                    </div>

                    {/* Small meeting pills inside the day cell */}
                    <div className="flex-1 overflow-hidden space-y-0.5 my-0.5">
                      {dayMeetings.slice(0, 2).map(m => {
                        const cfg = MEETING_TYPE_CONFIG[m.meetingType as keyof typeof MEETING_TYPE_CONFIG] || MEETING_TYPE_CONFIG.offline;
                        return (
                          <div
                            key={m.id}
                            className={`px-1 py-0.5 rounded text-[8.5px] font-medium truncate leading-tight border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            title={m.title}
                          >
                            {m.title}
                          </div>
                        );
                      })}
                      {dayMeetings.length > 2 && (
                        <span className="text-[8px] font-bold text-slate-500 pl-0.5 block">
                          +{dayMeetings.length - 2} cuộc họp nữa
                        </span>
                      )}
                    </div>

                    {isToday && (
                      <span className="text-[7.5px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tighter self-end">
                        Hôm nay
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Trailing empty cells for the next month */}
              {Array.from({ length: (7 - ((startingDayOffset + daysInMonth) % 7)) % 7 }, (_, i) => {
                return (
                  <div
                    key={`next-${i}`}
                    className="h-16 sm:h-20 p-1 bg-slate-50/40 dark:bg-slate-900/30 text-slate-300 dark:text-slate-700 select-none flex flex-col justify-start"
                  >
                    <span className="text-[10.5px] font-medium text-slate-300 dark:text-slate-700 pl-1">{i + 1}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick Meeting Type Legend */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-1.5 text-[10.5px]">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Chú thích:</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Trực tiếp
                </span>
                <span className="flex items-center gap-1 text-sky-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block"></span> Google Meet
                </span>
                <span className="flex items-center gap-1 text-purple-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span> Polycom
                </span>
                <span className="flex items-center gap-1 text-amber-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span> Hybrid
                </span>
              </div>
            </div>
          </div>

          {/* Quick Month Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-around text-center text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">Tổng số họp</p>
              <p className="text-base font-extrabold text-[#004499]">{monthStats.total}</p>
            </div>
            <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">Trực tiếp</p>
              <p className="text-base font-extrabold text-emerald-600">{monthStats.offline}</p>
            </div>
            <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">Trực tuyến</p>
              <p className="text-base font-extrabold text-sky-600">{monthStats.meet + monthStats.poly}</p>
            </div>
            <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">Hybrid</p>
              <p className="text-base font-extrabold text-amber-600">{monthStats.hybrid}</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: DANH SÁCH CHI TIẾT CÁC LỊCH HỌP TRONG THÁNG (60% WIDTH)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col">
            
            {/* Header & Filters */}
            <div className="p-3 sm:p-3.5 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>
                    {selectedDate 
                      ? `LỊCH HỌP NGÀY ${selectedDate.getDate().toString().padStart(2, '0')}/${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getFullYear()}`
                      : `DANH SÁCH LỊCH HỌP THÁNG ${currentMonth + 1}/${currentYear}`
                    }
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#004499] text-white">
                    {detailedListMeetings.length}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedDate 
                    ? 'Bấm "Xem cả tháng" để quay lại toàn bộ lịch trong tháng' 
                    : 'Bấm chọn một ngày bất kỳ trên lịch bên trái để lọc nhanh'}
                </p>
              </div>

              {/* Quick Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative min-w-[140px] sm:min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm..."
                    className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="px-2 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả hình thức</option>
                  <option value="offline">Trực tiếp</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="polycom">Polycom</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {/* Table of Meetings - Full width, Fixed header, scrollable body */}
            <div className="overflow-x-auto max-h-[calc(100vh-250px)] min-h-[420px] overflow-y-auto custom-scrollbar">
              {detailedListMeetings.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50/30 dark:bg-slate-900/30">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    {selectedDate 
                      ? `Không có cuộc họp nào trong ngày ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`
                      : `Không có cuộc họp nào trong tháng ${currentMonth + 1}/${currentYear}`
                    }
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Nhấn nút &quot;Đăng ký lịch họp&quot; để tạo lịch mới
                  </p>
                  <button
                    type="button"
                    onClick={handleNavigateToRegister}
                    className="mt-3 px-3 py-1.5 bg-[#004499] hover:bg-[#003377] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Đăng ký lịch họp ngay
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-[#004499] text-white text-[11px] font-bold uppercase sticky top-0 z-10 shadow-xs">
                      <th className="py-2.5 px-2 text-center w-10 border-r border-white/20">STT</th>
                      <th className="py-2.5 px-3 min-w-[200px] border-r border-white/20">Nội Dung Chi Tiết</th>
                      <th className="py-2.5 px-2.5 min-w-[130px] border-r border-white/20">Họp Theo Hình Thức</th>
                      <th className="py-2.5 px-2.5 min-w-[100px] text-center border-r border-white/20">Thời Gian</th>
                      <th className="py-2.5 px-2.5 min-w-[100px] text-center border-r border-white/20">Ngày Tháng</th>
                      <th className="py-2.5 px-3 min-w-[150px] border-r border-white/20">Người Tham Dự</th>
                      <th className="py-2.5 px-2 text-center w-24">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {detailedListMeetings.map((m, idx) => {
                      const startDateObj = m.startDate ? new Date(m.startDate) : null;
                      const endDateObj = m.endDate ? new Date(m.endDate) : null;

                      const dayOfWeek = startDateObj ? startDateObj.getDay() : 0;
                      const dayLabelVN = DAY_NAMES[(dayOfWeek + 6) % 7]?.full || 'Thứ';

                      const dateStr = startDateObj
                        ? `${startDateObj.getDate().toString().padStart(2, '0')}/${(startDateObj.getMonth() + 1).toString().padStart(2, '0')}/${startDateObj.getFullYear()}`
                        : '—';

                      const timeStartStr = startDateObj
                        ? startDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';
                      const timeEndStr = endDateObj
                        ? endDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';

                      const cfg = MEETING_TYPE_CONFIG[m.meetingType as keyof typeof MEETING_TYPE_CONFIG] || MEETING_TYPE_CONFIG.offline;
                      const TypeIcon = cfg.icon;

                      const isPast = endDateObj ? endDateObj < new Date() : false;

                      return (
                        <tr 
                          key={m.id || idx}
                          className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors ${
                            isPast ? 'opacity-85' : ''
                          }`}
                        >
                          {/* STT */}
                          <td className="py-2.5 px-2 text-center font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {idx + 1}
                          </td>

                          {/* 1. NỘI DUNG CHI TIẾT */}
                          <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                                {m.title}
                              </p>
                              {m.description && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">
                                  {m.description}
                                </p>
                              )}
                              {m.organizer && (
                                <div className="flex items-center gap-1 text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                                  <span>Chủ trì:</span>
                                  <strong className="text-slate-700 dark:text-slate-200">{m.organizer}</strong>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 2. HỌP THEO HÌNH THỨC */}
                          <td className="py-2.5 px-2.5 border-r border-slate-100 dark:border-slate-800">
                            <div className="space-y-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                <TypeIcon className="w-3 h-3 shrink-0" />
                                <span>{cfg.label}</span>
                              </span>

                              {m.location && (
                                <div className="flex items-center gap-1 text-[10.5px] text-slate-600 dark:text-slate-300">
                                  <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                  <span className="truncate">{m.location}</span>
                                </div>
                              )}

                              {(m.googleMeetLink || m.meetingType === 'google_meet' || m.meetingType === 'hybrid') && (() => {
                                const meetLink = m.googleMeetLink || 'https://meet.google.com/bbn-satc-cxm';
                                const cleanHref = meetLink.startsWith('http') ? meetLink : `https://${meetLink}`;
                                return (
                                  <div className="pt-0.5 flex flex-wrap items-center gap-1">
                                    <a
                                      href={cleanHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-[10.5px] font-bold shadow-2xs transition-colors"
                                      title={`Vào họp: ${cleanHref}`}
                                    >
                                      <Video className="w-3 h-3 shrink-0" />
                                      <span>Vào Google Meet</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyLink(m)}
                                      className="p-1 rounded text-slate-500 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-slate-800"
                                      title="Sao chép link Google Meet"
                                    >
                                      {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>

                          {/* 3. THỜI GIAN */}
                          <td className="py-2.5 px-2.5 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {timeStartStr} {timeEndStr && `- ${timeEndStr}`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                                Giờ họp
                              </span>
                            </div>
                          </td>

                          {/* 4. NGÀY THÁNG */}
                          <td className="py-2.5 px-2.5 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-blue-900 dark:text-blue-300 text-xs">
                                {dateStr}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {dayLabelVN}
                              </span>
                            </div>
                          </td>

                          {/* 5. NGƯỜI THAM DỰ */}
                          <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800">
                            {m.attendees && m.attendees.length > 0 ? (
                              <div className="space-y-1">
                                <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                                  {m.attendees.length} cán bộ
                                </span>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                                  {m.attendees.join(', ')}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Toàn thể cơ quan</span>
                            )}
                          </td>

                          {/* 6. THAO TÁC */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {m.googleMeetLink && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(m)}
                                  className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                  title="Sao chép link"
                                >
                                  {copiedId === m.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {!isStaff && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(m)}
                                    className="p-1 rounded text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                    title="Chỉnh sửa"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDelete(m.id, m.title)}
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom count */}
            <div className="p-2.5 bg-slate-50/90 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
              <span>Đang hiển thị <strong>{detailedListMeetings.length}</strong> cuộc họp</span>
              <button
                type="button"
                onClick={handleNavigateToRegister}
                className="text-[#004499] hover:underline font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Đăng ký thêm lịch họp mới
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 3. MODAL CHỈNH SỬA CUỘC HỌP */}
      {editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#004499] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                <h3 className="font-bold text-sm">
                  Chỉnh Sửa Thông Tin Cuộc Họp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMeeting(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-5 space-y-3.5 overflow-y-auto custom-scrollbar text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung chi tiết / Tiêu đề cuộc họp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Nhập tiêu đề cuộc họp..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả / Chương trình làm việc
                </label>
                <textarea
                  rows={2}
                  value={editForm.description || ''}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Mô tả nội dung..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hình thức họp <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.meetingType || 'offline'}
                    onChange={e => setEditForm({ ...editForm, meetingType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="offline">Trực tiếp (Tại CQ / Hội trường)</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="polycom">Polycom</option>
                    <option value="hybrid">Hybrid (Trực tiếp & Online)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Người chủ trì / Đơn vị tổ chức
                  </label>
                  <input
                    type="text"
                    value={editForm.organizer || ''}
                    onChange={e => setEditForm({ ...editForm, organizer: e.target.value })}
                    placeholder="VD: Cục trưởng, Trưởng phòng..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thời gian bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.startDate || ''}
                    onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thời gian kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.endDate || ''}
                    onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Địa điểm / Phòng họp
                </label>
                <input
                  type="text"
                  value={editForm.location || ''}
                  onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="VD: Phòng họp số 1, Tầng 3..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              {(editForm.meetingType === 'google_meet' || editForm.meetingType === 'hybrid' || editForm.meetingType === 'polycom' || editForm.googleMeetLink) && (
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-sky-950 dark:text-sky-200 text-xs flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-sky-600" />
                      <span>Đường dẫn Google Meet / Online link</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, googleMeetLink: 'https://meet.google.com/bbn-satc-cxm' })}
                      className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline"
                    >
                      Dán link cơ quan: bbn-satc-cxm
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editForm.googleMeetLink || ''}
                      onChange={e => setEditForm({ ...editForm, googleMeetLink: e.target.value })}
                      placeholder="https://meet.google.com/bbn-satc-cxm"
                      className="flex-1 px-3 py-2 border border-sky-300 dark:border-sky-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none text-xs font-medium"
                    />
                    {editForm.googleMeetLink && (
                      <a
                        href={editForm.googleMeetLink.startsWith('http') ? editForm.googleMeetLink : `https://${editForm.googleMeetLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Vào họp
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* NGƯỜI THAM DỰ & PICKER TỪ DANH SÁCH NHÂN SỰ */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#004499]" />
                    <span>Người tham dự ({editForm.attendees?.length || 0})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPersonnelPicker(!showPersonnelPicker)}
                    className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {showPersonnelPicker ? 'Đóng bảng chọn nhân sự' : 'Chọn từ Danh sách nhân sự'}
                  </button>
                </div>

                {/* Selected attendees chips */}
                {editForm.attendees && editForm.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 max-h-28 overflow-y-auto custom-scrollbar">
                    {editForm.attendees.map(name => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 text-[11px] font-medium"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendeeInEdit(name)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline Personnel Picker */}
                {showPersonnelPicker && (
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={personnelSearch}
                        onChange={e => setPersonnelSearch(e.target.value)}
                        placeholder="Tìm họ tên nhân sự..."
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white dark:bg-slate-800"
                      />
                      <select
                        value={selectedDeptFilter}
                        onChange={e => setSelectedDeptFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white dark:bg-slate-800"
                      >
                        <option value="ALL">Tất cả phòng ban</option>
                        {departmentsList.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {filteredUsers.map(u => {
                        const isChecked = editForm.attendees?.includes(u.fullName);
                        return (
                          <button
                            key={u.id || u.fullName}
                            type="button"
                            onClick={() => handleToggleAttendeeInEdit(u.fullName)}
                            className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                              isChecked
                                ? 'bg-[#004499] text-white border-[#004499]'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border-slate-200'
                            }`}
                          >
                            <div className="truncate pr-1">
                              <p className="font-bold text-[11px] truncate">{u.fullName}</p>
                              <p className={`text-[9.5px] truncate ${isChecked ? 'text-blue-100' : 'text-slate-500'}`}>{u.department}</p>
                            </div>
                            {isChecked && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMeeting(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-bold text-white bg-[#004499] hover:bg-[#003377] rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu thay đổi
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MeetingCalendar;
