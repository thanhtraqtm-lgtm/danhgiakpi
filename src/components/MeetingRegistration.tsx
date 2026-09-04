import React, { useState, useRef, useMemo } from 'react';
import {
  CalendarDays,
  Video,
  Users,
  Bell,
  Paperclip,
  Plus,
  Trash2,
  X,
  MapPin,
  Laptop2,
  MonitorSpeaker,
  FileText,
  Search,
  Check,
  Building2,
  UserCheck,
  UserPlus,
  ArrowLeft,
  ExternalLink,
  Copy
} from 'lucide-react';
import { Meeting, User as UserType } from '../types';

interface MeetingRegistrationProps {
  users?: UserType[];
  onAddMeeting: (meeting: Meeting) => void;
  onCancel: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const MeetingRegistration: React.FC<MeetingRegistrationProps> = ({
  users = [],
  onAddMeeting,
  onCancel,
  addToast
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState<'google_meet' | 'offline' | 'polycom' | 'hybrid'>('offline');
  const [googleMeetLink, setGoogleMeetLink] = useState('https://meet.google.com/bbn-satc-cxm');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [repeat, setRepeat] = useState(false);
  
  // Attendees state
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  
  // Personnel Picker state
  const [showPersonnelPicker, setShowPersonnelPicker] = useState(true);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  
  const [reminderType, setReminderType] = useState<'notification' | 'email'>('notification');
  const [reminderTime, setReminderTime] = useState<number>(10);
  const [reminders, setReminders] = useState<{type: 'notification'|'email', minutesBefore: number}[]>([
    { type: 'notification', minutesBefore: 10 },
    { type: 'email', minutesBefore: 60 }
  ]);
  
  const [attachments, setAttachments] = useState<{name: string, url: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddAttendee = () => {
    if (!attendeeInput.trim()) return;
    const name = attendeeInput.trim();
    if (!attendees.includes(name)) {
      setAttendees([...attendees, name]);
    }
    setAttendeeInput('');
  };

  const handleTogglePersonnel = (name: string) => {
    if (attendees.includes(name)) {
      setAttendees(attendees.filter(a => a !== name));
    } else {
      setAttendees([...attendees, name]);
    }
  };

  const handleSelectAllInFilteredDept = () => {
    const namesToAdd = filteredUsers.map(u => u.fullName).filter(Boolean);
    const set = new Set([...attendees, ...namesToAdd]);
    setAttendees(Array.from(set));
    addToast('info', 'Đã thêm nhân sự', `Đã chọn ${namesToAdd.length} cán bộ từ danh sách`);
  };

  const handleClearAllAttendees = () => {
    setAttendees([]);
  };

  const handleRemoveAttendee = (name: string) => {
    setAttendees(attendees.filter(a => a !== name));
  };

  const handleAddReminder = () => {
    setReminders([...reminders, { type: reminderType, minutesBefore: reminderTime }]);
  };

  const handleRemoveReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map((f: File) => ({
      name: f.name,
      url: URL.createObjectURL(f)
    }));
    setAttachments([...attachments, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      addToast('error', 'Lỗi', 'Vui lòng nhập tiêu đề cuộc họp');
      return;
    }
    if (!startDate || !endDate) {
      addToast('error', 'Lỗi', 'Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
      addToast('error', 'Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const newMeeting: Meeting = {
      id: 'meet_' + Date.now(),
      title: title.trim(),
      description: description.trim(),
      meetingType,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      location: location.trim(),
      organizer: organizer.trim(),
      repeat,
      googleMeetLink: (meetingType === 'google_meet' || meetingType === 'hybrid' || meetingType === 'polycom') 
        ? (googleMeetLink.trim() || 'https://meet.google.com/bbn-satc-cxm') 
        : (googleMeetLink.trim() ? googleMeetLink.trim() : undefined),
      attendees,
      reminders,
      attachments,
      createdAt: new Date().toISOString()
    };

    onAddMeeting(newMeeting);
  };

  const getReminderText = (minutes: number) => {
    if (minutes < 60) return `Trước ${minutes} phút`;
    if (minutes === 60) return `Trước 1 giờ`;
    if (minutes === 1440) return `Trước 1 ngày`;
    return `Trước ${minutes} phút`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-20 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
            title="Quay lại Lịch bàn tháng"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#004499]" />
              Đăng Ký Cuộc Họp Mới
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đăng ký lịch họp, chọn người tham dự từ danh sách nhân sự cơ quan, cấu hình thời gian và phòng họp
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Grid: Left Basic Info + Right Attendees Picker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: Thông tin cơ bản & Thời gian (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Thông tin cơ bản */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-4 h-4 text-[#004499]" />
              1. Thông Tin Cuộc Họp
            </h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung chi tiết / Tiêu đề cuộc họp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Họp giao ban Lãnh đạo Cục Thống kê tháng..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chương trình / Nội dung làm việc
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Nhập nội dung chi tiết công việc hoặc tài liệu cần chuẩn bị..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Hình thức họp */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Hình thức họp <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setMeetingType('offline')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border font-bold text-[11px] transition-all ${
                      meetingType === 'offline'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Trực tiếp
                  </button>

                  <button
                    type="button"
                    onClick={() => setMeetingType('google_meet')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border font-bold text-[11px] transition-all ${
                      meetingType === 'google_meet'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-sky-600" /> Google Meet
                  </button>

                  <button
                    type="button"
                    onClick={() => setMeetingType('polycom')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border font-bold text-[11px] transition-all ${
                      meetingType === 'polycom'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-200 ring-1 ring-purple-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <MonitorSpeaker className="w-3.5 h-3.5 text-purple-600" /> Polycom
                  </button>

                  <button
                    type="button"
                    onClick={() => setMeetingType('hybrid')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border font-bold text-[11px] transition-all ${
                      meetingType === 'hybrid'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Laptop2 className="w-3.5 h-3.5 text-amber-600" /> Hybrid
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Người chủ trì / Đơn vị tổ chức
                  </label>
                  <input
                    type="text"
                    value={organizer}
                    onChange={e => setOrganizer(e.target.value)}
                    placeholder="VD: Cục trưởng, Phòng TK Tổng hợp..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Địa điểm / Phòng họp
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="VD: Hội trường Tầng 3, Phòng họp số 1..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Đường link Google Meet / Phòng họp trực tuyến */}
              {(meetingType === 'google_meet' || meetingType === 'hybrid' || meetingType === 'polycom' || googleMeetLink) && (
                <div className="p-3 bg-sky-50/80 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-sky-950 dark:text-sky-200 text-xs flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-sky-600" />
                      <span>Đường dẫn Google Meet / Phòng Họp Trực Tuyến</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setGoogleMeetLink('https://meet.google.com/bbn-satc-cxm')}
                      className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline"
                    >
                      Dán link cơ quan: bbn-satc-cxm
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={googleMeetLink}
                      onChange={e => setGoogleMeetLink(e.target.value)}
                      placeholder="https://meet.google.com/bbn-satc-cxm"
                      className="flex-1 px-3 py-2 border border-sky-300 dark:border-sky-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                    {googleMeetLink && (
                      <a
                        href={googleMeetLink.startsWith('http') ? googleMeetLink : `https://${googleMeetLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Vào họp
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-sky-800 dark:text-sky-300">
                    <span>Phòng họp Google Meet chính thức: <strong className="font-mono">https://meet.google.com/bbn-satc-cxm</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ngày giờ & Thời lượng */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <CalendarDays className="w-4 h-4 text-orange-500" />
              2. Thời Gian & Lịch Trình
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thời gian bắt đầu <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thời gian kết thúc <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={repeat}
                onChange={e => setRepeat(e.target.checked)}
                className="w-4 h-4 text-[#004499] rounded border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lặp lại sự kiện hàng tuần
              </span>
            </label>
          </div>

          {/* Tài liệu đính kèm & Nhắc nhở */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Paperclip className="w-4 h-4 text-blue-600" />
              3. Tài Liệu Đính Kèm
            </h3>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <FileText className="w-6 h-6 text-slate-400" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Bấm để chọn tệp tài liệu cuộc họp</div>
              <div className="text-[10.5px] text-slate-500">PDF, DOCX, XLSX, hình ảnh...</div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                    <button onClick={() => handleRemoveAttachment(idx)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: KÉO / CHỌN DANH SÁCH NHÂN SỰ THAM DỰ (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
            
            {/* Attendees Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-[#004499]" />
                <span>Người Tham Dự ({attendees.length})</span>
              </h3>
              
              {attendees.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllAttendees}
                  className="text-[11px] font-bold text-red-600 hover:underline"
                >
                  Xóa tất cả ({attendees.length})
                </button>
              )}
            </div>

            {/* Selected Attendees Badges */}
            {attendees.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Đã chọn ({attendees.length} cán bộ):
                </p>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200/70 dark:border-blue-900/60 max-h-36 overflow-y-auto custom-scrollbar">
                  {attendees.map(name => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      <span>{name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttendee(name)}
                        className="text-slate-400 hover:text-red-600"
                        title="Bỏ chọn"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                Chưa chọn người tham dự (mặc định toàn thể đơn vị). Hãy chọn bên dưới:
              </div>
            )}

            {/* Quick manual add input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={attendeeInput}
                onChange={e => setAttendeeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddAttendee()}
                placeholder="Nhập tên hoặc email..."
                className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 outline-none"
              />
              <button
                type="button"
                onClick={handleAddAttendee}
                className="px-3 py-1.5 bg-[#004499] hover:bg-[#003377] text-white font-bold text-xs rounded-lg flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </div>

            {/* PERSONNEL LIST PICKER (BẢNG KÉO / CHỌN NHÂN SỰ) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-[#004499]" />
                  <span>Danh Sách Nhân Sự ({users.length} người)</span>
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllInFilteredDept}
                  className="text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Chọn tất cả mục này
                </button>
              </div>

              {/* Filter controls */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={personnelSearch}
                    onChange={e => setPersonnelSearch(e.target.value)}
                    placeholder="Tìm theo họ tên, chức vụ..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {personnelSearch && (
                    <button
                      type="button"
                      onClick={() => setPersonnelSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={selectedDeptFilter}
                  onChange={e => setSelectedDeptFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none max-w-[150px]"
                >
                  <option value="ALL">Tất cả phòng ban</option>
                  {departmentsList.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Scrollable list of Personnel */}
              <div className="space-y-1 max-h-[380px] overflow-y-auto custom-scrollbar p-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                {filteredUsers.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">
                    Không tìm thấy nhân sự phù hợp
                  </p>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = attendees.includes(u.fullName);
                    return (
                      <div
                        key={u.id || u.fullName}
                        onClick={() => handleTogglePersonnel(u.fullName)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#004499] text-white border-[#004499] shadow-2xs'
                            : 'bg-white dark:bg-slate-800 hover:bg-blue-50/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isSelected ? 'bg-white text-[#004499]' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
                          }`}>
                            {u.fullName.slice(0, 1)}
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-xs truncate leading-snug">{u.fullName}</p>
                            <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              {u.position || 'Cán bộ'} • {u.department || 'Đơn vị'}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected 
                            ? 'bg-white text-[#004499] border-white' 
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 font-bold stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4 z-20 p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-lg">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 font-bold text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2 font-bold text-xs text-white bg-[#004499] hover:bg-[#003377] shadow-xs rounded-xl transition-colors flex items-center gap-1.5"
        >
          <CalendarDays className="w-4 h-4" />
          Tạo Cuộc Họp & Lưu Lịch
        </button>
      </div>
    </div>
  );
};

export default MeetingRegistration;
