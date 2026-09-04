import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Download, 
  Upload, 
  Trash, 
  Building2, 
  X,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Lock,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { User, Department, DEPARTMENTS } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import * as XLSX from 'xlsx';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onImportUsers?: (data: any[]) => void;
  onClearUsers?: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  globalRole?: string;
  currentUser?: User | null;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onAddUser,
  onDeleteUser,
  onUpdateUser,
  onImportUsers,
  onClearUsers,
  addToast,
  globalRole = 'ADMIN',
  currentUser
}) => {
  // Helper to distinguish System Admin from provincial staff
  const isUserAdmin = (u: User) => u.role === 'ADMIN' || (u.username && u.username.toLowerCase() === 'admin');
  const staffUsers = (users || []).filter((u) => !isUserAdmin(u));
  const adminUsers = (users || []).filter((u) => isUserAdmin(u));

  const isCurrentAdmin = (currentUser && (currentUser.role === 'ADMIN' || currentUser.username?.toLowerCase() === 'admin')) || globalRole === 'ADMIN';
  const canManage = isCurrentAdmin || globalRole === 'PROVINCE_LEADER';
  const isStaff = !canManage;

  const [searchKey, setSearchKey] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  
  // Regular Staff Add/Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState<Department | string>('Phòng Thống kê Tổng hợp');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [birthYear, setBirthYear] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [workUnit, setWorkUnit] = useState('Thống kê tỉnh Hưng Yên');
  const [jobDescription, setJobDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'PROVINCE_LEADER' | 'DEPT_HEAD' | 'STAFF'>('STAFF');

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{id: string, name: string} | null>(null);
  const [showClearConfirmUser, setShowClearConfirmUser] = useState(false);

  // Dedicated Admin Accounts Management State (ONLY accessible by Admin)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [editingAdminUser, setEditingAdminUser] = useState<User | null>(null);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [showAdminPassMap, setShowAdminPassMap] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      'STT', 'Họ và tên', 'Năm sinh', 'Ngày vào ngành', 'Chức vụ', 
      'Đơn vị công tác', 'Phòng ban', 'Mô tả công việc được giao',
      'Số điện thoại', 'Địa chỉ email', 'Tên đăng nhập', 'Mật khẩu'
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const colWidths = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_nhan_su");
    XLSX.writeFile(wb, `Mau_Danh_sach_nhan_su.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcelFile(file, 'users');
      if (onImportUsers) {
        onImportUsers(parsed.allRows);
      } else {
        addToast('warning', 'Chưa hỗ trợ', 'Tính năng tải lên chưa được liên kết.');
      }
    } catch (err: any) {
      addToast('error', 'Lỗi tải file', err.message || 'Có lỗi xảy ra');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportExcel = () => {
    const wsData: (string | number)[][] = [
      [
        'STT', 'Họ và tên', 'Năm sinh', 'Ngày vào ngành', 'Chức vụ', 
        'Đơn vị công tác', 'Phòng ban', 'Mô tả công việc được giao',
        'Số điện thoại', 'Địa chỉ email', 'Tên đăng nhập', 'Mật khẩu'
      ]
    ];
    filteredUsers.forEach((u, idx) => {
      wsData.push([
        idx + 1,
        u.fullName,
        u.birthYear || '',
        u.joinDate || '',
        u.position,
        u.workUnit || '',
        u.department,
        u.jobDescription || '',
        u.phone || '',
        u.email || '',
        u.username,
        u.password || ''
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
      { wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, 
      { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 25 }, 
      { wch: 20 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_nhan_su");
    XLSX.writeFile(wb, `Danh_sach_nhan_su_${new Date().getTime()}.xlsx`);
    addToast('success', 'Xuất Excel thành công', 'File đã được tải xuống.');
  };

  const handleClearData = () => setShowClearConfirmUser(true);
  const confirmClearData = () => {
    if (onClearUsers) onClearUsers();
    setShowClearConfirmUser(false);
  };
  const cancelClearData = () => setShowClearConfirmUser(false);

  const departments = DEPARTMENTS;

  const resetForm = () => {
    setFullName('');
    setBirthYear('');
    setJoinDate('');
    setPosition('');
    setWorkUnit('Thống kê tỉnh Hưng Yên');
    setDepartment('Phòng Thống kê Tổng hợp');
    setJobDescription('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPassword('123456');
    setRole('STAFF');
    setEditingUser(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setBirthYear(user.birthYear || '');
    setJoinDate(user.joinDate || '');
    setPosition(user.position);
    setWorkUnit(user.workUnit || '');
    setDepartment(user.department);
    setJobDescription(user.jobDescription || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setUsername(user.username);
    setPassword(user.password || '123456');

    // Rule: Phó phòng không được gán quyền Trưởng phòng mà để là Chuyên viên
    const normPos = (user.position || '').toLowerCase().trim();
    if (normPos.includes('phó phòng') || normPos.includes('phó trưởng phòng') || normPos.includes('phó chi cục')) {
      setRole('STAFF');
    } else {
      const initialRole = user.role === 'ADMIN' ? 'STAFF' : (user.role || (user.department === 'Lãnh đạo' ? 'PROVINCE_LEADER' : 'STAFF'));
      setRole(initialRole as any);
    }
    setShowAddModal(true);
  };

  const handlePositionChange = (val: string) => {
    setPosition(val);
    const norm = val.toLowerCase().trim();
    if (norm.includes('phó') && !norm.includes('cục trưởng')) {
      setRole('STAFF');
    } else if (norm.includes('cục trưởng')) {
      setRole('PROVINCE_LEADER');
    } else if (
      norm.includes('trưởng') || 
      norm.includes('chi cục') || 
      norm.includes('phụ trách') || 
      norm.includes('q.') || 
      norm.includes('quyền') ||
      norm.includes('đội trưởng')
    ) {
      setRole('DEPT_HEAD');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      addToast('warning', 'Thiếu thông tin!', 'Vui lòng nhập Họ tên và Tên đăng nhập.');
      return;
    }
    
    // Rule: Phó phòng không được gán Trưởng phòng mà để là Chuyên viên (STAFF)
    // Q. Trưởng Thống kê cơ sở / Trưởng phòng -> DEPT_HEAD
    let assignedRole = role;
    const normPos = position.toLowerCase().trim();
    if (normPos.includes('phó') && !normPos.includes('cục trưởng')) {
      assignedRole = 'STAFF';
    } else if (
      (normPos.includes('trưởng') || 
       normPos.includes('chi cục') || 
       normPos.includes('phụ trách') || 
       normPos.includes('q.') || 
       normPos.includes('quyền') ||
       normPos.includes('đội trưởng')) && 
      assignedRole !== 'PROVINCE_LEADER'
    ) {
      assignedRole = 'DEPT_HEAD';
    }

    const userData = {
      fullName,
      birthYear,
      joinDate,
      position,
      workUnit,
      department,
      jobDescription,
      phone,
      email,
      username,
      password,
      role: assignedRole,
    };

    if (editingUser) {
      onUpdateUser(editingUser.id, userData);
      addToast('success', 'Cập nhật thành công!', `Đã cập nhật thông tin tài khoản ${fullName}.`);
    } else {
      onAddUser(userData);
      addToast('success', 'Thêm User thành công!', `Đã tạo tài khoản cho ${fullName}.`);
    }
    setShowAddModal(false);
  };

  // Dedicated Admin Account Management Handlers (ONLY accessible by Admin)
  const handleOpenAddAdmin = () => {
    setEditingAdminUser(null);
    setAdminFullName('');
    setAdminUsername('');
    setAdminPassword('');
    setAdminPhone('');
    setAdminEmail('');
    setShowAddAdminForm(true);
  };

  const handleOpenEditAdmin = (admin: User) => {
    setEditingAdminUser(admin);
    setAdminFullName(admin.fullName || '');
    setAdminUsername(admin.username || '');
    setAdminPassword(admin.password || '123456');
    setAdminPhone(admin.phone || '');
    setAdminEmail(admin.email || '');
    setShowAddAdminForm(true);
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminFullName.trim() || !adminPassword.trim()) {
      addToast('warning', 'Thiếu thông tin!', 'Vui lòng điền đầy đủ Họ tên, Tên đăng nhập và Mật khẩu.');
      return;
    }

    const lower = adminUsername.trim().toLowerCase();
    const duplicate = users.find(u => (u.username || '').toLowerCase() === lower && u.id !== editingAdminUser?.id);
    if (duplicate) {
      addToast('error', 'Trùng tên đăng nhập', 'Tên đăng nhập này đã được sử dụng bởi tài khoản khác.');
      return;
    }

    if (editingAdminUser) {
      onUpdateUser(editingAdminUser.id, {
        fullName: adminFullName.trim(),
        username: adminUsername.trim(),
        password: adminPassword.trim(),
        phone: adminPhone.trim(),
        email: adminEmail.trim(),
        role: 'ADMIN',
      });
      addToast('success', 'Thành công', `Đã cập nhật thông tin Quản trị viên ${adminUsername}.`);
    } else {
      onAddUser({
        fullName: adminFullName.trim(),
        username: adminUsername.trim(),
        password: adminPassword.trim(),
        phone: adminPhone.trim(),
        email: adminEmail.trim(),
        role: 'ADMIN',
        department: 'Lãnh đạo',
        position: 'Quản trị hệ thống',
        workUnit: 'Thống kê tỉnh Hưng Yên',
      });
      addToast('success', 'Thành công', `Đã tạo tài khoản Quản trị viên ${adminUsername}.`);
    }

    setShowAddAdminForm(false);
    setEditingAdminUser(null);
  };

  const handleDeleteAdmin = (admin: User) => {
    if (adminUsers.length <= 1) {
      addToast('error', 'Không thể xóa', 'Hệ thống phải duy trì ít nhất 1 tài khoản Quản trị viên để quản trị.');
      return;
    }
    if (currentUser?.id === admin.id) {
      addToast('warning', 'Cảnh báo', 'Bạn đang đăng nhập bằng tài khoản này, không thể tự xóa.');
      return;
    }
    onDeleteUser(admin.id);
    addToast('success', 'Đã xóa', `Đã xóa tài khoản Quản trị viên ${admin.username}.`);
  };

  const toggleShowPass = (id: string) => {
    setShowAdminPassMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const confirmDeleteRow = () => {
    if (deleteConfirmUser) {
      onDeleteUser(deleteConfirmUser.id);
      setDeleteConfirmUser(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmUser({ id, name });
  };

  // Only display non-admin staff in the regular personnel list
  const filteredUsers = staffUsers.filter((u) => {
    const matchesDept = filterDepartment === 'ALL' || u.department === filterDepartment;
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchKey.toLowerCase()) ||
      u.position.toLowerCase().includes(searchKey.toLowerCase()) ||
      u.username.toLowerCase().includes(searchKey.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-4 animate-in fade-in-50">
      {/* Top Toolbar Card matching screenshot */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          <Users className="w-5 h-5 text-sky-700 dark:text-sky-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            DANH SÁCH NHÂN SỰ
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Tìm nhân sự..."
              className="px-3 py-1.5 pr-8 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">Tất cả phòng ban</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#198754] hover:bg-[#157347] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Tải xuống danh sách Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải xuống</span>
          </button>

          {!isStaff && (
            <>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fd7e14] hover:bg-[#e36a09] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                title="Tải lên file Excel"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải lên</span>
              </button>

              <button
                onClick={handleClearData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#dc3545] hover:bg-[#bb2d3b] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                title="Xóa toàn bộ dữ liệu"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>Xóa tất cả</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#6610f2] hover:bg-[#5b0ed9] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                title="Thêm nhân sự mới"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Thêm mới</span>
              </button>
            </>
          )}

          {/* Dedicated Admin Accounts Button - ONLY visible to Admin */}
          {isCurrentAdmin && (
            <button
              onClick={() => {
                setShowAddAdminForm(false);
                setEditingAdminUser(null);
                setShowAdminModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-lg text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
              title="Quản trị tài khoản Admin (Chỉ Quản trị viên mới có quyền)"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Tài khoản Admin ({adminUsers.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table with Green Header and Clean Government Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#2d6e3e] text-white font-bold text-xs tracking-wide">
                <th className="px-3 py-3 w-10 text-center whitespace-nowrap border-r border-white/20">STT</th>
                <th className="px-3 py-3 min-w-[170px] text-center whitespace-nowrap border-r border-white/20">Họ và tên</th>
                <th className="px-3 py-3 min-w-[90px] text-center whitespace-nowrap border-r border-white/20">Năm Sinh</th>
                <th className="px-3 py-3 min-w-[120px] text-center whitespace-nowrap border-r border-white/20">Ngày Vào Ngành</th>
                <th className="px-3 py-3 min-w-[160px] text-center whitespace-nowrap border-r border-white/20">Chức vụ</th>
                <th className="px-3 py-3 min-w-[170px] text-center whitespace-nowrap border-r border-white/20">Đơn vị Công tác</th>
                <th className="px-3 py-3 min-w-[180px] text-center whitespace-nowrap border-r border-white/20">PHÒNG BAN/ĐƠN VỊ</th>
                <th className="px-3 py-3 min-w-[200px] text-center border-r border-white/20">Mô Tả Công Việc</th>
                <th className="px-3 py-3 min-w-[110px] text-center whitespace-nowrap border-r border-white/20">Điện Thoại</th>
                <th className="px-3 py-3 min-w-[170px] text-center whitespace-nowrap border-r border-white/20">Email</th>
                <th className="px-3 py-3 min-w-[160px] text-center whitespace-nowrap border-r border-white/20">Tên Đăng Nhập</th>
                <th className="px-3 py-3 min-w-[90px] text-center whitespace-nowrap border-r border-white/20">Mật khẩu</th>
                <th className="px-3 py-3 w-20 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-700 font-normal">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    Chưa có người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isSelf = currentUser && (u.id === currentUser.id || u.username === currentUser.username);
                  return (
                    <tr 
                      key={u.id} 
                      className={`transition-colors border-b border-slate-300 dark:border-slate-700 ${
                        isSelf 
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' 
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.birthYear || ''}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.joinDate || ''}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.position || ''}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.workUnit || 'Thống kê tỉnh Hưng yên'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.department}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700">
                        {u.jobDescription || ''}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.phone || ''}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.email || ''}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.username}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                        {u.password || '123456'}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {(!isStaff || isSelf) && (
                            <button 
                              onClick={() => handleOpenEdit(u)} 
                              className="text-sky-600 hover:text-sky-800 transition-colors p-1" 
                              title={isSelf ? "Sửa thông tin cá nhân của bạn" : "Sửa thông tin"}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {!isStaff && (
                            <button 
                              onClick={() => handleDelete(u.id, u.fullName)} 
                              className="text-rose-600 hover:text-rose-800 transition-colors p-1" 
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {isStaff && !isSelf && (
                            <span className="text-slate-300 dark:text-slate-600 text-xs font-mono">-</span>
                          )}
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                {editingUser ? 'Sửa Thông Tin Nhân Sự' : 'Thêm Nhân Sự Mới'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Họ và Tên (*)</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Năm sinh</label>
                  <input type="text" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày vào ngành</label>
                  <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chức vụ</label>
                  <input 
                    type="text" 
                    value={position} 
                    onChange={(e) => handlePositionChange(e.target.value)} 
                    placeholder="Ví dụ: Cục trưởng, Trưởng phòng, Phó phòng, Chuyên viên..." 
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Đơn vị công tác</label>
                  <input type="text" value={workUnit} onChange={(e) => setWorkUnit(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng ban</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value as Department)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phân quyền vai trò hệ thống (*)</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as any)} 
                    className="w-full p-2.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-bold"
                  >
                    <option value="PROVINCE_LEADER">🏛️ Lãnh đạo Cục (Cục trưởng, Phó Cục trưởng)</option>
                    <option value="DEPT_HEAD">🏢 Trưởng phòng / Chi cục trưởng (Phê duyệt cấp 1)</option>
                    <option value="STAFF">👤 Chuyên viên (Bao gồm Phó phòng, Thống kê viên - Tự đánh giá)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1 italic">* Lưu ý: Phó phòng không gán quyền Trưởng phòng mà để vai trò là Chuyên viên.</p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả công việc được giao</label>
                  <input type="text" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Tóm tắt nhiệm vụ chính" className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số điện thoại</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Địa chỉ Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username (*)</label>
                  <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu</label>
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors">
                  {editingUser ? 'Lưu thay đổi' : 'Thêm Nhân Sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClearConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xác nhận xóa dữ liệu</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Bạn có chắc chắn muốn xóa toàn bộ danh sách tài khoản? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={cancelClearData} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={confirmClearData} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors">Xóa Tất Cả</button>
            </div>
          </div>
        </div>
      )}
      
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xác nhận xóa người dùng</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Bạn có muốn xóa tài khoản <strong>{deleteConfirmUser.name}</strong> không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmUser(null)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={confirmDeleteRow} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors">Xóa Người Dùng</button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED ADMIN ACCOUNTS MODAL - STRICTLY FOR LOGGED-IN ADMINS */}
      {showAdminModal && isCurrentAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-amber-500/40 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                    QUẢN TRỊ TÀI KHOẢN ADMIN HỆ THỐNG
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Bảo mật cao
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chỉ Quản trị viên mới có quyền tạo và quản lý tài khoản Admin. Không hiển thị trong danh sách nhân sự.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setShowAddAdminForm(false);
                  setEditingAdminUser(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Security info banner */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Phân tách tài khoản Admin độc lập:</p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Tài khoản Admin đã được đưa ra khỏi danh sách nhân sự của đơn vị để tránh nhầm lẫn khi chấm điểm KPI và bảo mật thông tin phân quyền.
                    Chỉ có tài khoản Admin hiện tại mới có quyền tạo thêm tài khoản Admin mới hoặc chỉnh sửa mật khẩu.
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Danh sách tài khoản Admin ({adminUsers.length})</span>
                </div>
                {!showAddAdminForm && (
                  <button
                    onClick={handleOpenAddAdmin}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tạo Admin mới</span>
                  </button>
                )}
              </div>

              {/* Embedded Admin Add/Edit Form */}
              {showAddAdminForm && (
                <form onSubmit={handleSaveAdmin} className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                      {editingAdminUser ? 'Chỉnh sửa Quản trị viên' : 'Thêm Quản trị viên mới'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddAdminForm(false);
                        setEditingAdminUser(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      Đóng form
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Họ và tên Quản trị viên (*)
                      </label>
                      <input
                        type="text"
                        required
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        placeholder="Ví dụ: Quản trị viên hệ thống"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tên đăng nhập (Username) (*)
                      </label>
                      <input
                        type="text"
                        required
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="Ví dụ: admin, admin2"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mật khẩu đăng nhập (*)
                      </label>
                      <input
                        type="text"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Nhập mật khẩu an toàn..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Số điện thoại liên hệ
                      </label>
                      <input
                        type="text"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="0988xxxxxx"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-slate-500 italic">
                      * Vai trò tự động gán là ADMIN tối cao, có toàn quyền quản trị ứng dụng.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddAdminForm(false);
                          setEditingAdminUser(null);
                        }}
                        className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs text-white bg-amber-600 hover:bg-amber-700 rounded-lg font-bold shadow-xs transition-colors"
                      >
                        {editingAdminUser ? 'Lưu cập nhật' : 'Xác nhận tạo Admin'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Admin Users Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Tên đăng nhập</th>
                      <th className="py-2.5 px-3">Mật khẩu</th>
                      <th className="py-2.5 px-3">Liên hệ</th>
                      <th className="py-2.5 px-3 text-center">Quyền hạn</th>
                      <th className="py-2.5 px-3 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {adminUsers.map((admin, idx) => {
                      const isShowingPass = !!showAdminPassMap[admin.id];
                      const isCurrent = currentUser?.id === admin.id;
                      return (
                        <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {admin.fullName}
                            {isCurrent && (
                              <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                Đang đăng nhập
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {admin.username}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300">
                                {isShowingPass ? (admin.password || '123456') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleShowPass(admin.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                title={isShowingPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                              >
                                {isShowingPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            {admin.phone || admin.email || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Shield className="w-3 h-3 text-amber-500" />
                              ADMIN TỐI CAO
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditAdmin(admin)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                title="Chỉnh sửa thông tin / mật khẩu"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAdmin(admin)}
                                disabled={adminUsers.length <= 1 || isCurrent}
                                className={`p-1.5 rounded-md transition-colors ${
                                  adminUsers.length <= 1 || isCurrent
                                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                    : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                                }`}
                                title={
                                  adminUsers.length <= 1
                                    ? 'Cần duy trì ít nhất 1 tài khoản Admin'
                                    : isCurrent
                                    ? 'Không thể xóa tài khoản đang đăng nhập'
                                    : 'Xóa tài khoản Admin này'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setShowAddAdminForm(false);
                  setEditingAdminUser(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
