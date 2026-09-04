import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  Award, 
  UserCheck, 
  Search, 
  Shield, 
  Briefcase, 
  ChevronRight, 
  Network
} from 'lucide-react';
import { User, DEPARTMENTS } from '../types';
import * as XLSX from 'xlsx';
import { Upload, Download } from 'lucide-react';

interface OrgChartAndPersonnelProps {
  onUsersUpdate?: (newUsers: User[]) => void;
  users: User[];
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  globalRole?: string;
  currentUser?: User | null;
}

export const OrgChartAndPersonnel: React.FC<OrgChartAndPersonnelProps> = ({
  users = [],
  addToast,
  onUsersUpdate,
  globalRole,
  currentUser
}) => {
  const isStaff = globalRole === 'STAFF';
  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'personnel'>('chart');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  
  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUsersUpdate) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rows || rows.length === 0) {
        throw new Error('Tệp Excel trống.');
      }

      let headerRowIdx = -1;
      let colMap = { fullName: -1, position: -1, department: -1, unit: -1, username: -1, password: -1, role: -1 };
      
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        
        let score = 0;
        let tempColMap = { ...colMap };
        row.forEach((cell: any, cIdx: number) => {
          const val = String(cell || '').toLowerCase().trim();
          if (val === 'họ và tên' || val === 'họ tên' || (val.includes('họ') && val.includes('tên'))) { tempColMap.fullName = cIdx; score++; }
          else if (val.includes('chức vụ') || val.includes('chức danh')) { tempColMap.position = cIdx; score++; }
          else if (val.includes('đơn vị công tác')) { tempColMap.unit = cIdx; score++; }
          else if (val.includes('phòng ban') || val.includes('phòng ban/đơn vị') || val.includes('phòng/đơn vị')) { tempColMap.department = cIdx; score++; }
          else if (val.includes('tên đăng nhập') || val === 'username') { tempColMap.username = cIdx; score++; }
          else if (val.includes('mật khẩu') || val === 'password') { tempColMap.password = cIdx; score++; }
          else if (val.includes('quyền') || val.includes('role')) { tempColMap.role = cIdx; score++; }
        });
        
        if (score > 1) {
          headerRowIdx = i;
          colMap = tempColMap;
          break;
        }
      }

      if (headerRowIdx === -1 || colMap.fullName === -1) {
          throw new Error('Không tìm thấy cột Họ và Tên trong file.');
      }

      const newUsers: User[] = [...users];

      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !Array.isArray(r) || r.length === 0) continue;
        
        const fullName = String(r[colMap.fullName] || '').trim();
        if (!fullName) continue;

        let position = 'Chuyên viên';
        if (colMap.position !== -1 && r[colMap.position]) {
            position = String(r[colMap.position]).trim();
        }

        let department = 'Phòng Hành chính - Tổng hợp';
        if (colMap.department !== -1 && r[colMap.department]) {
            department = String(r[colMap.department]).trim();
        }

        let role: 'ADMIN' | 'PROVINCE_LEADER' | 'DEPT_HEAD' | 'STAFF' = 'STAFF';
        if (colMap.role !== -1 && r[colMap.role]) {
            const roleStr = String(r[colMap.role]).trim().toUpperCase();
            if (roleStr === 'ADMIN' || roleStr === 'PROVINCE_LEADER' || roleStr === 'DEPT_HEAD' || roleStr === 'STAFF') {
                role = roleStr as any;
            }
        } else {
            const posLower = position.toLowerCase();
            const deptLower = department.toLowerCase();
            if (deptLower.includes('lãnh đạo') || posLower.includes('cục trưởng') || posLower.includes('phó cục trưởng') || posLower.includes('ban lãnh đạo')) {
                role = 'PROVINCE_LEADER';
            } else if (posLower.includes('phó') || posLower.includes('pho')) {
                // Phó phòng, Phó trưởng phòng, Phó chi cục trưởng, Chuyên viên -> STAFF
                role = 'STAFF';
            } else if (
                posLower.includes('trưởng') || 
                posLower.includes('chi cục') || 
                posLower.includes('phụ trách') || 
                posLower.includes('q.') || 
                posLower.includes('quyền') ||
                posLower.includes('đội trưởng')
            ) {
                role = 'DEPT_HEAD';
            } else {
                role = 'STAFF';
            }
        }

        const generateUsername = (name: string) => {
          const fallback = 'user' + Date.now().toString().slice(-4) + i;
          if (!name) return fallback;
          const clean = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
          return clean || fallback;
        };

        let workUnit = 'Thống kê tỉnh Hưng Yên';
        if (colMap.unit !== -1 && r[colMap.unit]) {
            workUnit = String(r[colMap.unit]).trim();
        }

        let password = 'Không có';
        if (colMap.password !== -1 && r[colMap.password]) {
            password = String(r[colMap.password]).trim();
        }

        let username = '';
        if (colMap.username !== -1 && r[colMap.username]) {
            username = String(r[colMap.username]).trim();
        }
        if (!username) {
            username = generateUsername(fullName);
        }

        newUsers.push({
            id: 'usr_' + Date.now() + '_' + i,
            fullName,
            department,
            position,
            workUnit,
            password,
            role,
            username,
            createdAt: new Date().toISOString().split('T')[0]
        });
      }

      onUsersUpdate(newUsers);
      addToast('success', 'Tải lên thành công', `Đã thêm ${newUsers.length - users.length} nhân sự.`);
    } catch (err: any) {
      addToast('error', 'Lỗi tải tệp', err.message || 'Không thể đọc tệp Excel.');
    }
  };

  const downloadSampleExcel = () => {
    const wsData = [
      ['BẢNG DANH SÁCH NHÂN SỰ'],
      [],
      ['STT', 'Họ và tên', 'Chức vụ', 'Đơn vị Công tác', 'Phòng ban/đơn vị', 'Tên đăng nhập', 'Mật khẩu'],
      ['1', 'Nguyễn Văn A', 'Chuyên viên', 'Thống kê tỉnh Hưng Yên', 'Phòng Hành chính - Tổng hợp', 'nva@nso.gov.vn', '123654'],
      ['2', 'Trần Thị B', 'Trưởng phòng', 'Thống kê tỉnh Hưng Yên', 'Phòng Nghiệp vụ Thống kê', 'ttb@nso.gov.vn', '123654']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nhan_su");
    XLSX.writeFile(wb, `Mau_danh_sach_nhan_su.xlsx`);
  };

  const filteredUsers = users.filter((u) => {
    if (u.role === 'ADMIN' || (u.username && u.username.toLowerCase() === 'admin')) return false;
    const matchesDept = selectedDeptFilter === 'ALL' || u.department === selectedDeptFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      !q || 
      u.fullName.toLowerCase().includes(q) || 
      u.position.toLowerCase().includes(q) || 
      (u.department && u.department.toLowerCase().includes(q));
    return matchesDept && matchesQuery;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Network className="w-4 h-4 text-sky-600" />
            Sơ Đồ Tổ Chức Lãnh đạo phụ trách & Danh Sách Nhân Sự Thống Kê Tỉnh Hưng Yên
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Sơ đồ tổ chức và các phòng ban, Thống kê đơn vị cơ sở
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('chart')}
            className={`flex items-center justify-center px-4 py-2 text-xs font-bold rounded shadow-sm transition-colors ${
              activeSubTab === 'chart'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Sơ Đồ Tổ Chức
          </button>
          <button
            onClick={() => setActiveSubTab('personnel')}
            className={`flex items-center justify-center px-4 py-2 text-xs font-bold rounded shadow-sm transition-colors ${
              activeSubTab === 'personnel'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Nhân Sự ({users.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'chart' ? (
        /* VISUAL ORG CHART TREE MATCHING USER IMAGE EXACTLY */
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
          <div className="min-w-[1100px] flex flex-col items-center py-6">
            
            {/* Top Level Leader */}
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl shadow-lg border-2 border-amber-300 text-center w-80">
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-200">Trưởng Thống Kê</div>
                <div className="font-extrabold text-sm sm:text-base mt-0.5">Đào Trọng Truyển</div>
              </div>
              <div className="w-0.5 h-10 bg-slate-300 dark:bg-slate-700"></div>
            </div>

            {/* Horizontal Branching Connector */}
            <div className="w-[88%] h-0.5 bg-slate-300 dark:bg-slate-700 relative"></div>

            {/* 5 Main Columns matching image */}
            <div className="grid grid-cols-5 gap-4 w-full pt-6">
              
              {/* Column 1: Phòng Thống Kê Tổng Hợp */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 -mt-6"></div>
                <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 w-full text-center shadow-xs space-y-3">
                  <div className="font-bold text-xs text-sky-700 dark:text-sky-400">Phòng Thống Kê Tổng Hợp</div>
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <div className="bg-sky-50 dark:bg-slate-900 p-2 rounded-lg border border-sky-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Quỳnh Phụ
                    </div>
                    <div className="text-slate-400 text-xs">↓</div>
                    <div className="bg-sky-50 dark:bg-slate-900 p-2 rounded-lg border border-sky-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Hưng Hà
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Phó Trưởng Thống Kê - Phạm Văn Tụ */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 -mt-6"></div>
                <div className="bg-sky-50/80 dark:bg-slate-800 p-3.5 rounded-xl border border-sky-300 dark:border-sky-800 w-full text-center shadow-xs space-y-3">
                  <div>
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Phó Trưởng Thống Kê</div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Phạm Văn Tụ</div>
                  </div>
                  <div className="pt-2 border-t border-sky-200 dark:border-slate-700 text-xs font-bold text-sky-800 dark:text-sky-300">
                    Phòng Thống Kê Nông Nghiệp & Xã Hội
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Hoàng Hoa Thám
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Kiến Xương
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Vũ Thư
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Phó Trưởng Thống Kê - Đào Thị Hiếu */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 -mt-6"></div>
                <div className="bg-sky-50/80 dark:bg-slate-800 p-3.5 rounded-xl border border-sky-300 dark:border-sky-800 w-full text-center shadow-xs space-y-3">
                  <div>
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Phó Trưởng Thống Kê</div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Đào Thị Hiếu</div>
                  </div>
                  <div className="pt-2 border-t border-sky-200 dark:border-slate-700 text-xs font-bold text-sky-800 dark:text-sky-300">
                    Phòng Thống Kê Công Nghiệp & Xây Dựng
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Đông Hưng
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Mỹ Hào
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Yên Mỹ
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Thái Thụy
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 4: Phó Trưởng Thống Kê - Vũ Tuấn Hùng */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 -mt-6"></div>
                <div className="bg-sky-50/80 dark:bg-slate-800 p-3.5 rounded-xl border border-sky-300 dark:border-sky-800 w-full text-center shadow-xs space-y-3">
                  <div>
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Phó Trưởng Thống Kê</div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Vũ Tuấn Hùng</div>
                  </div>
                  <div className="pt-2 border-t border-sky-200 dark:border-slate-700 text-xs font-bold text-sky-800 dark:text-sky-300">
                    Phòng Thống Kê Dịch Vụ & Giá
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Khoái Châu
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Lương Bằng
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Tiền Hải
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 5: Phòng Tổ Chức Hành Chính */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 -mt-6"></div>
                <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 w-full text-center shadow-xs space-y-3">
                  <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Phòng Tổ Chức Hành Chính</div>
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <div className="bg-emerald-50 dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Phố Hiến
                    </div>
                    <div className="text-slate-400 text-xs">↓</div>
                    <div className="bg-emerald-50 dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                      Thống kê cơ sở Như Quỳnh
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* PERSONNEL LIST BY DEPT */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm kiếm cán bộ, chức vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isStaff && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-xs cursor-pointer whitespace-nowrap transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Tải File NS</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleUploadExcel}
                    className="hidden"
                  />
                </label>
              )}
              <button
                onClick={downloadSampleExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg transition-colors border border-slate-300 dark:border-slate-700 whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                <span>Mẫu File</span>
              </button>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                <option value="ALL">Tất cả đơn vị ({users.length})</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full border-collapse text-sm font-sans">
                <thead>
                  <tr className="bg-[#005ba1] text-white font-bold">
                    <th className="px-3 py-2.5 w-12 text-center border-b-2 border-[#004499] border-r border-[#004499]">STT</th>
                    <th className="px-3 py-2.5 min-w-[150px] border-b-2 border-[#004499] border-r border-[#004499]">HỌ VÀ TÊN</th>
                    <th className="px-3 py-2.5 min-w-[120px] border-b-2 border-[#004499] border-r border-[#004499]">CHỨC VỤ</th>
                    <th className="px-3 py-2.5 min-w-[150px] border-b-2 border-[#004499] border-r border-[#004499]">ĐƠN VỊ CÔNG TÁC</th>
                    <th className="px-3 py-2.5 min-w-[180px] border-b-2 border-[#004499] border-r border-[#004499]">PHÒNG BAN/ĐƠN VỊ</th>
                    <th className="px-3 py-2.5 min-w-[120px] border-b-2 border-[#004499] border-r border-[#004499]">TÊN ĐĂNG NHẬP</th>
                    <th className="px-3 py-2.5 min-w-[100px] text-center border-b-2 border-[#004499]">MẬT KHẨU</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        Không tìm thấy nhân sự nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <tr key={u.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors`}>
                        <td className="px-3 py-2 w-12 text-center text-slate-400 font-mono text-sm">{idx + 1}</td>
                        <td className="px-3 py-2 min-w-[150px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-r border-slate-100 dark:border-slate-800">
                          <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 flex items-center justify-center font-black text-[10px]">
                            {u.fullName.charAt(0)}
                          </div>
                          <span>{u.fullName}</span>
                        </td>
                        <td className="px-3 py-2 min-w-[120px] text-slate-700 dark:text-slate-300 font-semibold border-r border-slate-100 dark:border-slate-800">
                          {u.position}
                        </td>
                        <td className="px-3 py-2 min-w-[150px] text-slate-600 dark:text-slate-400 font-medium text-sm border-r border-slate-100 dark:border-slate-800">
                          {u.workUnit || 'Thống kê tỉnh Hưng Yên'}
                        </td>
                        <td className="px-3 py-2 min-w-[180px] text-slate-600 dark:text-slate-400 font-medium border-r border-slate-100 dark:border-slate-800">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px]">
                            {u.department}
                          </span>
                        </td>
                        <td className="px-3 py-2 min-w-[120px] font-mono text-slate-500 text-sm border-r border-slate-100 dark:border-slate-800">
                          {u.username}
                        </td>
                        <td className="px-3 py-2 min-w-[100px] text-center font-mono text-slate-500 text-sm">
                          {u.password || '123654'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
