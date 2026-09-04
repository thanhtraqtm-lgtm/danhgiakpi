import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  UserSquare,
  Network,
  ListTodo,
  FileSpreadsheet,
  CalendarClock,
  BookOpen,
  ClipboardCheck,
  Calculator,
  Workflow,
  Lock,
  ListChecks,
  BarChart4,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  KeyRound,
  LogIn,
  LogOut,
  UserCheck,
  Shield
} from 'lucide-react';
import { ActiveTab, User, Meeting } from '../types';
import { SidebarMonthCalendar } from './SidebarMonthCalendar';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  globalRole?: string;
  setGlobalRole?: (role: any) => void;
  currentUser?: User | null;
  setCurrentUser?: (user: User | null) => void;
  setSelectedDepartment?: (dept: string) => void;
  users?: User[];
  meetings?: Meeting[];
  onOpenLoginModal?: () => void;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
  onResetAllData?: () => void;
  userCount?: number;
  taskCount?: number;
  docCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  globalRole = 'ADMIN',
  setGlobalRole,
  currentUser,
  setCurrentUser,
  setSelectedDepartment,
  users = [],
  meetings = [],
  onOpenLoginModal,
  onOpenChangePassword,
  onLogout
}) => {
  // Helper to find which section owns the current tab
  const getSectionForTab = (tab: ActiveTab): string | null => {
    if (tab === 'users_list' || tab === 'org_chart') return 'personnel';
    if (tab === 'kpi_assign' || tab === 'kpi_catalog_lookup' || tab === 'kpi_catalog' || tab === 'kpi_late_rules' || tab === 'kpi_rules_doc') return 'kpi';
    if (tab === 'self_eval_30' || tab === 'self_eval_70' || tab === 'self_eval_workflow') return 'self_eval';
    if (tab === 'eval_list' || tab === 'eval_results' || tab === 'eval_lock') return 'eval_mgt';
    if (tab === 'meeting_register' || tab === 'meeting_calendar') return 'meeting_mgt';
    return null;
  };

  // Only ONE section is open at a time (exclusive accordion)
  const [openSection, setOpenSection] = useState<string | null>(() => getSectionForTab(activeTab) || 'personnel');

  // Auto-sync open section when activeTab changes
  useEffect(() => {
    const matchingSection = getSectionForTab(activeTab);
    if (matchingSection) {
      setOpenSection(matchingSection);
    }
  }, [activeTab]);

  const toggleSection = (sectionId: string) => {
    setOpenSection(prev => (prev === sectionId ? null : sectionId));
  };

  const getRoleDisplayName = () => {
    if (!currentUser) return 'Chưa đăng nhập';
    if (globalRole === 'ADMIN') return 'Quản trị viên';
    if (globalRole === 'PROVINCE_LEADER') return 'Lãnh đạo Cục';
    if (globalRole === 'DEPT_HEAD') {
      if (currentUser?.position) return currentUser.position;
      if (currentUser?.department && (currentUser.department.includes('Thống kê cơ sở') || currentUser.department.includes('cơ sở'))) {
        return 'Trưởng Thống kê cơ sở';
      }
      return 'Trưởng phòng';
    }
    return currentUser?.position || 'Chuyên viên';
  };

  const menuGroups = [
    {
      id: 'dashboard',
      label: 'Tổng Quan',
      icon: <LayoutDashboard className="w-4 h-4 text-yellow-300" />,
      tab: 'dashboard' as ActiveTab
    },
    {
      id: 'personnel',
      label: 'Sơ Đồ & Nhân Sự',
      icon: <Users className="w-4 h-4 text-yellow-300" />,
      children: [
        { id: 'users_list', label: 'Danh sách nhân sự', icon: <UserSquare className="w-3.5 h-3.5" />, tab: 'users_list' as ActiveTab },
        { id: 'org_chart', label: 'Sơ đồ tổ chức', icon: <Network className="w-3.5 h-3.5" />, tab: 'org_chart' as ActiveTab },
      ]
    },
    {
      id: 'kpi',
      label: 'Quản Lý Tiêu Chí KPI',
      icon: <Settings className="w-4 h-4 text-yellow-300" />,
      children: [
        { id: 'kpi_assign', label: 'Danh sách công việc', icon: <FileText className="w-3.5 h-3.5" />, tab: 'kpi_assign' as ActiveTab },
        { id: 'kpi_catalog_lookup', label: 'Danh mục công việc', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, tab: 'kpi_catalog_lookup' as ActiveTab },
        { id: 'kpi_catalog', label: 'Thiết lập công việc & SP đầu ra', icon: <ListTodo className="w-3.5 h-3.5" />, tab: 'kpi_catalog' as ActiveTab },
        { id: 'kpi_late_rules', label: 'Quy tắc trễ hạn', icon: <CalendarClock className="w-3.5 h-3.5" />, tab: 'kpi_late_rules' as ActiveTab },
        { id: 'kpi_rules_doc', label: 'Quy chế & Cách tính điểm', icon: <BookOpen className="w-3.5 h-3.5" />, tab: 'kpi_rules_doc' as ActiveTab },
      ]
    },
    {
      id: 'self_eval',
      label: 'Tự Nhận Xét & Chấm Điểm',
      icon: <ClipboardCheck className="w-4 h-4 text-yellow-300" />,
      children: [
        { id: 'self_eval_30', label: 'Điểm Tiêu chí chung', icon: <FileText className="w-3.5 h-3.5" />, tab: 'self_eval_30' as ActiveTab },
        { id: 'self_eval_70', label: 'Điểm thực hiện nhiệm vụ', icon: <Calculator className="w-3.5 h-3.5" />, tab: 'self_eval_70' as ActiveTab },
        { id: 'self_eval_workflow', label: 'Phê duyệt', icon: <Workflow className="w-3.5 h-3.5" />, tab: 'self_eval_workflow' as ActiveTab },
      ]
    },
    {
      id: 'eval_mgt',
      label: 'Đánh Giá & Xếp Loại',
      icon: <ShieldCheck className="w-4 h-4 text-yellow-300" />,
      children: [
        { id: 'eval_list', label: 'Danh sách đánh giá', icon: <ListChecks className="w-3.5 h-3.5" />, tab: 'eval_list' as ActiveTab },
        { id: 'eval_results', label: 'Kết quả đánh giá', icon: <BarChart4 className="w-3.5 h-3.5" />, tab: 'eval_results' as ActiveTab },
        { id: 'eval_lock', label: 'Khóa / Mở đánh giá', icon: <Lock className="w-3.5 h-3.5" />, tab: 'eval_lock' as ActiveTab },
      ]
    },
    {
      id: 'meeting_mgt',
      label: 'Quản Lý Lịch',
      icon: <Calendar className="w-4 h-4 text-yellow-300" />,
      children: [
        { id: 'meeting_register', label: 'Đăng ký lịch họp', icon: <CalendarPlus className="w-3.5 h-3.5" />, tab: 'meeting_register' as ActiveTab },
        { id: 'meeting_calendar', label: 'Lịch bàn tháng', icon: <CalendarDays className="w-3.5 h-3.5" />, tab: 'meeting_calendar' as ActiveTab },
        { id: 'weekly_schedule', label: 'Lịch công tác Ban Lãnh Đạo', icon: <CalendarRange className="w-3.5 h-3.5" />, tab: 'weekly_schedule' as ActiveTab },
      ]
    }
  ];

  return (
    <div className="w-72 bg-[#005C35] text-white fixed top-0 left-0 bottom-0 flex flex-col z-40 border-r border-[#004A2A] shadow-md font-sans">
      {/* Brand Header */}
      <div className="h-14 bg-[#004A2A] border-b border-[#003D22] flex items-center justify-center px-4 shrink-0 select-none">
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-300 font-bold text-xs shadow-xs">
            KPI
          </div>
          <div className="text-xs font-bold text-white tracking-wider uppercase leading-tight">
            HỆ THỐNG KPI
          </div>
        </div>
      </div>

      {/* Vertical Navigation List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
        {menuGroups.map((group) => {
          const isOpen = openSection === group.id;
          const isGroupActive = group.children 
            ? group.children.some(c => c.tab === activeTab) 
            : activeTab === group.tab;

          return (
            <div key={group.id} className="space-y-1">
              {group.children ? (
                <button
                  type="button"
                  onClick={() => toggleSection(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-[13px] font-medium ${
                    isOpen 
                      ? 'bg-[#007A4D] text-white shadow-xs font-semibold' 
                      : isGroupActive
                      ? 'bg-[#006642] text-white font-medium'
                      : 'text-white/90 hover:bg-[#006642] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{group.icon}</span>
                    <span className="text-left truncate tracking-tight">{group.label}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-yellow-300 shrink-0 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/60 shrink-0 transition-transform duration-200" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpenSection(null);
                    setActiveTab(group.tab!);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 text-[13px] font-medium ${
                    activeTab === group.tab
                      ? 'bg-yellow-400/20 text-yellow-200 font-semibold shadow-xs border border-yellow-400/30'
                      : 'text-white/90 hover:bg-[#006642] hover:text-white'
                  }`}
                >
                  <span className="shrink-0">{group.icon}</span>
                  <span className="text-left tracking-tight">{group.label}</span>
                </button>
              )}

              {group.children && isOpen && (
                <div className="pl-4 pr-1 py-1 space-y-1 animate-in slide-in-from-top-1 duration-150">
                  {group.children.map((child) => {
                    const isChildActive = activeTab === child.tab;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setActiveTab(child.tab)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-[12.5px] ${
                          isChildActive
                            ? 'bg-yellow-300 text-[#004A2A] font-bold shadow-xs'
                            : 'text-white hover:bg-[#006642] hover:text-yellow-200 font-medium'
                        }`}
                      >
                        <span className={`shrink-0 ${isChildActive ? 'text-[#004A2A]' : 'text-yellow-300/90'}`}>
                          {child.icon}
                        </span>
                        <span className="text-left leading-snug tracking-tight">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Lịch tháng luôn hiển thị ngay dưới Menu Quản lý Đăng ký Lịch Họp */}
              {group.id === 'meeting_mgt' && (
                <div className="pt-1.5 px-0.5">
                  <SidebarMonthCalendar 
                    meetings={meetings} 
                    setActiveTab={setActiveTab} 
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile & Logout Footer in Sidebar */}
      <div className="p-3 border-t border-[#003D22] bg-[#004A2A] shrink-0">
        <div className="flex items-center justify-between gap-2.5 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 ring-1 ring-white/20">
            {currentUser ? (currentUser.fullName ? currentUser.fullName.charAt(0) : 'U') : '?'}
          </div>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-xs font-bold text-white truncate" title={currentUser ? currentUser.fullName : 'Chưa đăng nhập'}>
              {currentUser ? currentUser.fullName : 'Chưa đăng nhập'}
            </div>
            <div className="text-[11px] text-amber-300 font-medium truncate flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{getRoleDisplayName()}</span>
            </div>
          </div>
          {currentUser && onLogout ? (
            <div className="flex items-center gap-1 shrink-0">
              {onOpenChangePassword && (
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 hover:text-white transition-colors"
                  title="Đổi mật khẩu"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            onOpenLoginModal && (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 hover:text-white transition-colors shrink-0"
                title="Đăng nhập tài khoản"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
