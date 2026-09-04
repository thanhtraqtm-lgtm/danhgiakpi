import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  MapPin, 
  Users, 
  ExternalLink, 
  Plus, 
  X,
  CalendarDays
} from 'lucide-react';
import { Meeting, ActiveTab } from '../types';

interface SidebarMonthCalendarProps {
  meetings: Meeting[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectMeetingDate?: (date: Date) => void;
}

export const SidebarMonthCalendar: React.FC<SidebarMonthCalendarProps> = ({
  meetings = [],
  setActiveTab,
  onSelectMeetingDate
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  // Prev / Next month handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonthDate(new Date());
  };

  // Days in month calculation (starting Monday)
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon...
  // Convert to Mon=0, Tue=1, ..., Sun=6
  const startingDay = (firstDayIndex + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Helper to dynamically get meetings for a specific day from real data (no hardcoding)
  const getMeetingsForDay = (day: number): Meeting[] => {
    if (!Array.isArray(meetings)) return [];
    return meetings.filter(m => {
      if (!m || !m.startDate) return false;
      const d = new Date(m.startDate);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    setSelectedModalDate(clickedDate);
    if (onSelectMeetingDate) {
      onSelectMeetingDate(clickedDate);
    }
  };

  // Format date helper
  const formatDateVN = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()];
    return `${dayOfWeek}, ngày ${day}/${m}/${y}`;
  };

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Selected date meetings for popup modal (from dynamic real meetings state)
  const modalMeetings = selectedModalDate
    ? (meetings || []).filter(m => {
        if (!m || !m.startDate) return false;
        const d = new Date(m.startDate);
        return (
          d.getFullYear() === selectedModalDate.getFullYear() &&
          d.getMonth() === selectedModalDate.getMonth() &&
          d.getDate() === selectedModalDate.getDate()
        );
      }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    : [];

  return (
    <div className="mt-1.5 bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-white select-none">
      {/* Mini Calendar Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-teal-300 shrink-0" />
          <span className="text-[12px] font-semibold text-slate-100 tracking-tight">
            Tháng {month + 1}/{year}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-1.5 py-0.5 text-[10px] bg-white/10 hover:bg-white/20 text-slate-200 rounded font-medium transition-colors"
            title="Về tháng hiện tại"
          >
            Nay
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded transition-colors"
            title="Tháng sau"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday headers: T2 - CN */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w, idx) => (
          <div
            key={w}
            className={`text-[10px] font-medium py-0.5 ${
              idx >= 5 ? 'text-slate-400' : 'text-slate-300/80'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid - Khung lịch tháng đồng bộ màu nền, ngày có lịch chỉ hơi sáng nhẹ */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading empty spaces */}
        {Array.from({ length: startingDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-6 w-full opacity-0" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const dayNum = i + 1;
          const dayMeetings = getMeetingsForDay(dayNum);
          const hasMeetings = dayMeetings.length > 0;

          return (
            <button
              key={`day-${dayNum}`}
              type="button"
              onClick={() => handleDayClick(dayNum)}
              title={
                hasMeetings
                  ? `Ngày ${dayNum}/${month + 1}: Có ${dayMeetings.length} cuộc họp (Bấm để xem)`
                  : `Ngày ${dayNum}/${month + 1} (Bấm để xem/tạo)`
              }
              className={`h-6 w-full flex items-center justify-center rounded text-[11px] transition-colors cursor-pointer ${
                hasMeetings
                  ? 'bg-white/20 text-white font-semibold border border-white/25 hover:bg-white/30 shadow-xs'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>{dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Legend & Quick Action */}
      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-white/25 border border-white/30 shrink-0 inline-block"></span>
          <span>Ngày có lịch họp</span>
        </div>
        <span className="text-[9.5px] text-slate-400/80">Bấm ngày để xem</span>
      </div>

      {/* MODAL CHI TIẾT LỊCH HỌP KHI BẤM VÀO NGÀY */}
      {selectedModalDate && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedModalDate(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-300 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 relative max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Chi Tiết Lịch Họp
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatDateVN(selectedModalDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModalDate(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4">
              {modalMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-2">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Không có lịch họp nào trong ngày này
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Bạn có thể đăng ký lịch họp mới cho ngày này bất cứ lúc nào.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Danh sách {modalMeetings.length} cuộc họp:
                  </div>

                  {modalMeetings.map((m, idx) => {
                    const startT = new Date(m.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endT = new Date(m.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const typeLabels: Record<string, { label: string; color: string; icon: any }> = {
                      google_meet: { label: 'Google Meet', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300', icon: <Video className="w-3.5 h-3.5" /> },
                      offline: { label: 'Trực Tiếp Tại Phòng Họp', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300', icon: <MapPin className="w-3.5 h-3.5" /> },
                      polycom: { label: 'Truyền Hình Polycom', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300', icon: <Video className="w-3.5 h-3.5" /> },
                      hybrid: { label: 'Kết Hợp (Hybrid)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300', icon: <Video className="w-3.5 h-3.5" /> },
                    };

                    const typeInfo = typeLabels[m.meetingType] || typeLabels.offline;

                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold text-slate-400 mr-2">#{idx + 1}</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {m.title}
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${typeInfo.color} shrink-0`}>
                            {typeInfo.icon}
                            <span>{typeInfo.label}</span>
                          </span>
                        </div>

                        {/* Time and Info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span>{startT} - {endT}</span>
                          </div>

                          {m.attendees && m.attendees.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{m.attendees.length} người tham dự</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {m.description && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            {m.description}
                          </div>
                        )}

                        {/* Link Google Meet */}
                        {m.googleMeetLink && (
                          <div className="pt-1">
                            <a
                              href={m.googleMeetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Tham gia họp: {m.googleMeetLink}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Modal Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedModalDate(null);
                  setActiveTab('meeting_calendar');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Xem Trên Lịch Họp Lớn</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedModalDate(null);
                  setActiveTab('meeting_register');
                }}
                className="px-4 py-2 bg-[#2d6e3e] hover:bg-[#235832] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Đăng Ký Lịch Họp Mới</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
