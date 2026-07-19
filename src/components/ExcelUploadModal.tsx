import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, AlertTriangle, FileSpreadsheet, Download, CheckCircle, Shield } from 'lucide-react';
import { CivilServiceTask, Employee } from '../types';

interface ExcelUploadModalProps {
  type: 'users' | 'tasks';
  onClose: () => void;
  onSuccessUsers?: (users: Employee[]) => void;
  onSuccessTasks?: (tasks: CivilServiceTask[]) => void;
  onSuccessMultiTasks?: (tasksByEmployeeId: Record<string, CivilServiceTask[]>) => void;
  currentEmployeeName?: string;
  isLeaderOrAdmin?: boolean;
  employees?: Employee[];
  currentUser?: Employee | null;
}

export default function ExcelUploadModal({
  type,
  onClose,
  onSuccessUsers,
  onSuccessTasks,
  onSuccessMultiTasks,
  currentEmployeeName,
  isLeaderOrAdmin = false,
  employees = [],
  currentUser = null
}: ExcelUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedCount, setParsedCount] = useState<number>(0);
  const [importForAll, setImportForAll] = useState<boolean>(isLeaderOrAdmin);
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expected column definitions
  const expectedUserHeaders = [
    'STT',
    'Họ và tên',
    'Chức vụ',
    'Đơn vị Công tác',
    'Phòng ban/đơn vị',
    'Tên đăng nhập',
    'Mật khẩu'
  ];

  const expectedTrackingHeaders = [
    'STT', 
    'Tên công việc', 
    'Loại công việc', 
    'Người/ đơn vị chủ trì', 
    'Đơn vị phối hợp', 
    'Ngày giao việc', 
    'Hạn hoàn thành', 
    'Tình trạng', 
    'Lý do trễ hạn'
  ];

  const expectedImageTaskHeaders = [
    'TT',
    'Nhiệm vụ',
    'Cấp trình',
    'Sản phẩm',
    'Số lượng',
    'Tiến độ',
    'Ghi chú',
    'Điểm tối đa',
    'Điểm chấm công việc',
    'Hệ số quy đổi'
  ];

  // Helper to normalize strings for comparison (lowercase, trim)
  const normalizeHeader = (h: any) => String(h || '').trim().toLowerCase();

  // Helper to normalize Vietnamese string for robust name comparison
  const cleanString = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]/g, ' ') // replace special chars with spaces
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .trim();
  };

  // Dynamic Template Downloader
  const downloadTemplate = (layout?: 'image-based' | 'tracking') => {
    const wb = XLSX.utils.book_new();
    let wsData: any[] = [];
    let fileName = '';

    if (type === 'users') {
      const userHeadersWithOrgType = [...expectedUserHeaders, 'Loại hình'];
      wsData = [
        userHeadersWithOrgType,
        [1, 'Nguyễn Văn A', 'Trưởng phòng', 'CTNE', 'Phòng Kế hoạch Tài chính', 'nvanhhye@nso.nov.vn', '123654', 'Phòng ban'],
        [2, 'Nguyễn Văn B', 'Nhân viên', 'CTNE', 'Đơn vị cơ sở Chi bộ 1', 'nvbinhhye@nso.nov.vn', '123456', 'Đơn vị cơ sở'],
        [3, 'Nguyễn Văn C', 'Trưởng CS', 'CTNE', 'Đơn vị cơ sở Chi bộ 2', 'nvcanhhye@nso.nov.vn', '123654', 'Đơn vị cơ sở']
      ];
      fileName = 'Mau_Danh_Sach_Can_Bo.xlsx';
    } else {
      if (layout === 'image-based') {
        wsData = [
          expectedImageTaskHeaders,
          [1, 'Báo cáo …', 'Lãnh đạo đơn vị', 'Báo cáo', 3, 'Hằng tháng', 'Công việc chuẩn', 100, 90, { t: 'n', f: 'I2/5', v: 18 }],
          [2, 'Báo cáo', 'Lãnh đạo đơn vị', 'Báo cáo', 1, '6 tháng', '', 100, 90, { t: 'n', f: 'I3/5', v: 18 }],
          [3, 'Tờ trình', 'Lãnh đạo đơn vị', 'Tờ trình/Quyết định', 20, 'Theo yêu cầu cấp có thẩm quyền', '', 100, 90, { t: 'n', f: 'I4/5', v: 18 }],
          [4, 'Tờ trình', 'Lãnh đạo đơn vị', 'Tờ trình', 50, 'Theo yêu cầu cấp có thẩm quyền', '', 100, 90, { t: 'n', f: 'I5/5', v: 18 }],
          [5, 'Báo cáo', 'Lãnh đạo đơn vị', 'Báo cáo', 1, 'Năm', '', 200, 180, { t: 'n', f: 'I6/5', v: 36 }],
          [6, 'Tờ trình/Công văn', 'Lãnh đạo đơn vị', 'Tờ trình/Công văn', 1, 'Theo yêu cầu cấp có thẩm quyền', '', 200, 180, { t: 'n', f: 'I7/5', v: 36 }],
          [7, 'Báo cáo', 'Lãnh đạo đơn vị', 'Báo cáo', 1, 'Năm', '', 200, 180, { t: 'n', f: 'I8/5', v: 36 }],
          [8, 'Tờ trình/Danh mục sản phẩm', 'Lãnh đạo đơn vị', 'Tờ trình/Danh mục sản phẩm', 1, 'Theo yêu cầu cấp có thẩm quyền', '', 400, 360, { t: 'n', f: 'I9/5', v: 72 }],
          [9, 'Tờ trình/Công văn', 'Lãnh đạo đơn vị', 'Tờ trình/Công văn', 1, 'Hằng Quý', '', 400, 360, { t: 'n', f: 'I10/5', v: 72 }],
          [10, 'Tờ trình/Công văn', 'Bí thư chi bộ', 'Tờ trình/Công văn', 1, 'Hằng Quý', '', 400, 360, { t: 'n', f: 'I11/5', v: 72 }]
        ];
        fileName = 'Mau_10_Cot_Ca_Nhan_Tu_Cham_KPI.xlsx';
      } else if (layout === 'tracking') {
        wsData = [
          expectedTrackingHeaders,
          [
            1,
            'Tổ chức, triển khai điều tra giá tiêu dùng kỳ 1 tháng 7 năm 2026',
            'Phát sinh',
            'Phạm Xuân Trường',
            '',
            '01/07/2026',
            '01/07/2026',
            'Hoàn thành trễ hạn',
            ''
          ],
          [
            2,
            'Kiểm tra, thanh toán kinh phí tự chủ, điều tra, Tổng điều tra cho các TKCS',
            'Phát sinh',
            'Hoàng Mai Hạnh',
            'Đào Thị Thanh Thảo',
            '06/05/2026',
            '01/07/2026',
            'Hoàn thành',
            ''
          ]
        ];
        fileName = 'Mau_Bang_Theo_Doi_Cong_Viec.xlsx';
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    if (type === 'tasks') {
      const colWidths = new Array(wsData[0].length).fill({ wch: 16 });
      colWidths[1] = { wch: 45 };
      ws['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Cong_Viec');
    XLSX.writeFile(wb, fileName);
  };

  // Process the uploaded file
  const handleFile = (file: File) => {
    setError(null);
    setValidationErrors([]);
    setSuccessMsg(null);
    setUnmatchedNames([]);

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Helper to score a row for headers
        const getRowHeaderScore = (row: any[], t: 'users' | 'tasks'): number => {
          if (!row || !Array.isArray(row)) return 0;
          const cells = row.map(cell => cleanString(String(cell || '')));
          
          const userKeywords = [
            'ho va ten', 'ho ten', 'ten can bo', 'chuc vu', 'chuc danh',
            'don vi cong tac', 'phong ban', 'don vi', 'ten dang nhap', 'tai khoan', 'mat khau'
          ];

          const taskKeywords = [
            'nhiem vu', 'ten cong viec', 'cong viec', 'noi dung',
            'loai cong viec', 'chu tri', 'nguoi thuc hien', 'phoi hop',
            'ngay giao', 'han han thanh', 'tinh trang', 'trang thai',
            'ly do tre han', 'ghi chu', 'cap trinh', 'san pham',
            'diem toi da', 'khung diem', 'diem cham', 'diem tu cham'
          ];

          const targetKeywords = t === 'users' ? userKeywords : taskKeywords;
          let score = 0;
          for (const cell of cells) {
            if (!cell) continue;
            for (const kw of targetKeywords) {
              const cleanKw = cleanString(kw);
              if (cell === cleanKw || cell.includes(cleanKw)) {
                score++;
              }
            }
          }
          return score;
        };

        // Find the best sheet and header row index
        let bestSheetName = workbook.SheetNames[0];
        let bestHeaderIdx = 0;
        let maxSheetScore = -1;

        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
          if (!rows || rows.length === 0) continue;

          const limit = Math.min(rows.length, 15);
          for (let r = 0; r < limit; r++) {
            const score = getRowHeaderScore(rows[r], type);
            if (score > maxSheetScore) {
              maxSheetScore = score;
              bestSheetName = sheetName;
              bestHeaderIdx = r;
            }
          }
        }

        const worksheet = workbook.Sheets[bestSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (rawRows.length === 0) {
          setError('Tệp excel trống hoặc không có dữ liệu.');
          return;
        }

        const headerRowIdx = maxSheetScore >= 2 ? bestHeaderIdx : 0;
        const headers = rawRows[headerRowIdx] as string[];
        const errors: string[] = [];

        if (type === 'users') {
          // Check columns match for users
          const missing = expectedUserHeaders.filter(
            exp => !headers.some(h => cleanString(String(h || '')) === cleanString(exp))
          );
          
          if (missing.length > 0) {
            setError(`Sai mẫu biểu quy định! Các cột sau đây bị thiếu hoặc lệch: ${missing.join(', ')}`);
            return;
          }

          // Map raw data rows to Employee list
          const mappedUsers: Employee[] = [];
          const headerIndices = expectedUserHeaders.reduce((acc, colName) => {
            acc[colName] = headers.findIndex(h => cleanString(String(h || '')) === cleanString(colName));
            return acc;
          }, {} as Record<string, number>);

          // Optional column: cho phép khai báo trực tiếp "Phòng ban" hay "Đơn vị cơ sở"
          const idxOrgType = headers.findIndex(h => {
            const n = cleanString(String(h || ''));
            return n === 'loai hinh' || n === 'khoi' || n === 'phan loai' || n.includes('loai hinh');
          });

          // Parse rows starting from headerRowIdx + 1
          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0 || !row[headerIndices['Họ và tên']]) continue;

            const name = String(row[headerIndices['Họ và tên']] || '').trim();
            const role = String(row[headerIndices['Chức vụ']] || 'Nhân viên').trim();
            const department = String(row[headerIndices['Phòng ban/đơn vị']] || row[headerIndices['Đơn vị Công tác']] || 'CTNE').trim();
            const username = String(row[headerIndices['Tên đăng nhập']] || '').trim();
            const password = String(row[headerIndices['Mật khẩu']] || '123456').trim();

            if (!username) {
              errors.push(`Dòng ${i + 1}: Thiếu "Tên đăng nhập".`);
              continue;
            }

            // Detect orgType classification
            let orgType: 'Ban Lãnh Đạo' | 'Lãnh đạo' | 'Phòng ban' | 'Đơn vị cơ sở';
            const roleLower = role.toLowerCase();
            const deptLower = department.toLowerCase();
            const explicitOrgTypeRaw = idxOrgType !== -1 ? String(row[idxOrgType] || '').trim().toLowerCase() : '';

            const looksLikePhongBanName =
              deptLower.startsWith('phòng ') || deptLower.startsWith('ban ') ||
              deptLower.startsWith('văn phòng') || deptLower.startsWith('thanh tra') ||
              deptLower.startsWith('chi cục') || deptLower.includes('phòng ban');

            const looksLikeDonViCoSoName =
              roleLower.includes('trưởng cs') || roleLower.includes('cơ sở') ||
              deptLower.includes('tkcsdh') || deptLower.includes('chi bộ') ||
              deptLower.includes('cơ sở') || deptLower.includes('đơn vị');

            // Ưu tiên hàng đầu: cột "Phòng ban/Đơn vị" có tên là "Lãnh đạo" (hoặc chứa "lãnh đạo",
            // ví dụ "Ban Lãnh Đạo", "Lãnh đạo đơn vị"...) => luôn xếp vào nhóm Ban Lãnh Đạo riêng,
            // bất kể chức vụ ghi gì.
            const isLeadershipDept = deptLower.includes('lãnh đạo');

            if (isLeadershipDept || roleLower.includes('lãnh đạo') || roleLower.includes('giám đốc') || roleLower.includes('thường vụ') || roleLower.includes('bí thư đảng ủy') || roleLower.includes('phó giám đốc')) {
              orgType = 'Ban Lãnh Đạo';
            } else if (explicitOrgTypeRaw.includes('cơ sở') || explicitOrgTypeRaw.includes('don vi')) {
              orgType = 'Đơn vị cơ sở';
            } else if (explicitOrgTypeRaw.includes('phòng') || explicitOrgTypeRaw.includes('phong ban')) {
              orgType = 'Phòng ban';
            } else if (looksLikeDonViCoSoName) {
              orgType = 'Đơn vị cơ sở';
            } else if (looksLikePhongBanName) {
              orgType = 'Phòng ban';
            } else {
              orgType = 'Đơn vị cơ sở';
            }

            // Xác định Trưởng / Phó dựa trên chức vụ, để phân quyền:
            // - Trưởng của Ban Lãnh Đạo: quyền như admin (quản trị dữ liệu)
            // - Phó của Ban Lãnh Đạo, và Trưởng/Phó của Phòng ban - Đơn vị cơ sở: chỉ được xem
            let leadershipRole: 'Trưởng' | 'Phó' | undefined;
            if (roleLower.includes('phó')) {
              leadershipRole = 'Phó';
            } else if (roleLower.includes('trưởng') || roleLower.includes('giám đốc') || roleLower.includes('bí thư')) {
              leadershipRole = 'Trưởng';
            }

            const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '_');
            mappedUsers.push({
              id: `emp-${cleanUsername}`,
              name,
              role,
              department,
              avatar: `https://images.unsplash.com/photo-${1500000000000 + i * 10000}?w=150&auto=format&fit=crop&q=80`,
              evaluationPeriod: 'Hằng tháng',
              username,
              password,
              isAdmin: false,
              orgType,
              leadershipRole,
              tasks: []
            });
          }

          if (errors.length > 0) {
            setValidationErrors(errors);
            setError('Lệch mẫu biểu dữ liệu dòng! Vui lòng sửa lại tệp Excel.');
            return;
          }

          if (mappedUsers.length === 0) {
            setError('Không tìm thấy cán bộ nào hợp lệ để nhập vào hệ thống.');
            return;
          }

          setParsedCount(mappedUsers.length);
          setSuccessMsg(`Đã xác thực thành công ${mappedUsers.length} cán bộ theo đúng mẫu biểu quy chuẩn.`);
          if (onSuccessUsers) {
            setTimeout(() => {
              onSuccessUsers(mappedUsers);
            }, 1000);
          }

        } else {
          // Find column indices using a highly robust diacritic-insensitive matcher
          const getIndex = (possibleNames: string[], excludeKeywords: string[] = []) => {
            return headers.findIndex(h => {
              const normH = cleanString(String(h || ''));
              if (excludeKeywords.some(ex => normH.includes(cleanString(ex)))) {
                return false;
              }
              return possibleNames.some(name => {
                const normName = cleanString(name);
                if (normName.length <= 4) {
                  return normH === normName;
                }
                return normH === normName || normH.includes(normName);
              });
            });
          };

          const idxMission = getIndex(
            ['tên công việc', 'nhiệm vụ', 'nội dung nhiệm vụ', 'nội dung công việc', 'công việc'],
            ['loại', 'ngày', 'hạn', 'người', 'đơn vị', 'chủ trì', 'phối hợp', 'tình trạng']
          );
          const idxLevel = getIndex(['cấp trình', 'cấp phê duyệt']);
          const idxProduct = getIndex(['sản phẩm đầu ra', 'sản phẩm', 'sản phẩm đầu']);
          const idxQuantity = getIndex(['số lượng mục tiêu', 'số lượng', 'mục tiêu']);
          const idxTimeline = getIndex(['tiến độ', 'thời gian', 'thời hạn', 'tiến độ thực hiện']);
          const idxMaxScore = getIndex(['khung điểm tối đa', 'khung điểm', 'điểm tối đa']);
          const idxOwner = getIndex(
            ['người/ đơn vị chủ trì', 'người chủ trì', 'đơn vị chủ trì', 'chủ trì', 'người thực hiện', 'tên cán bộ'],
            ['phối hợp']
          );
          const idxStatus = getIndex(['tình trạng', 'trạng thái']);

          const idxAssignedScore = getIndex(['điểm tự chấm', 'điểm chấm công việc', 'điểm chấm cv', 'điểm tự', 'điểm chấm']);
          const idxNote = getIndex(['ghi chú', 'nhận xét', 'lý do trễ hạn']);
          const idxDeadlineDate = getIndex(['hạn hoàn thành', 'hoàn thành', 'hạn ngày', 'ngày hoàn thành', 'ngày hạn', 'hạn']);

          // Only for 13-column (full-kpi)
          const idxActualQty = getIndex(['thực tế số lượng', 'thực tế qty']);
          const idxActualQuality = getIndex(['thực tế chất lượng']);
          const idxActualProgress = getIndex(['thực tế tiến độ']);
          const idxTaskType = getIndex(['loại công việc', 'loại']);

          const isTrackingLayout = idxMaxScore === -1 && idxProduct === -1;
          const isImageBased = !isTrackingLayout;

          if (idxMission === -1) {
            setError('Không tìm thấy cột "Nội dung nhiệm vụ" hoặc "Nhiệm vụ" hoặc "Tên công việc" trong tệp tin Excel.');
            return;
          }

          const mappedTasks: CivilServiceTask[] = [];
          const tasksByEmployeeId: Record<string, CivilServiceTask[]> = {};
          const localUnmatched: string[] = [];

          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0 || !row[idxMission]) continue;

            const mission = String(row[idxMission] || '').trim();
            const missionLower = mission.toLowerCase();

            if (
              missionLower === 'tổng số' || 
              missionLower === 'tổng cộng' || 
              missionLower === 'tổng' || 
              missionLower === 'total' ||
              missionLower.startsWith('tổng số') ||
              missionLower.startsWith('tổng cộng') ||
              missionLower.includes('tổng số') ||
              missionLower.includes('tổng cộng')
            ) {
              continue; // Skip the total row of Excel sheet
            }

            // Also check if STT column has "tổng" or "total"
            const idxSTT = getIndex(['stt', 'tt']);
            if (idxSTT !== -1 && row[idxSTT] !== undefined) {
              const sttVal = String(row[idxSTT]).trim().toLowerCase();
              if (
                sttVal.includes('tổng') || 
                sttVal.includes('tong') || 
                sttVal === 'tổng số' || 
                sttVal === 'tổng cộng'
              ) {
                continue; // Skip total row
              }
            }

            // Determine employee mapping
            let targetEmployeeId = '';
            let ownerVal = '';
            if (idxOwner !== -1 && row[idxOwner]) {
              ownerVal = String(row[idxOwner]).trim();
              const cleanOwner = cleanString(ownerVal);
              
              if (importForAll) {
                // Find matching employee in same unit / department
                const candidateEmployees = (!currentUser?.isAdmin && currentUser?.department)
                  ? (employees || []).filter(emp => emp.department === currentUser.department)
                  : (employees || []);

                let matchedEmp = candidateEmployees.find(emp => cleanString(emp.name) === cleanOwner);
                if (!matchedEmp) {
                  matchedEmp = candidateEmployees.find(emp => {
                    const cleanEmpName = cleanString(emp.name);
                    return cleanEmpName.includes(cleanOwner) || cleanOwner.includes(cleanEmpName);
                  });
                }
                if (!matchedEmp) {
                  matchedEmp = candidateEmployees.find(emp => {
                    const cleanEmpName = cleanString(emp.name);
                    const empWords = cleanEmpName.split(' ');
                    const ownerWords = cleanOwner.split(' ');
                    const lastWordEmp = empWords[empWords.length - 1];
                    const lastWordOwner = ownerWords[ownerWords.length - 1];
                    return lastWordEmp === lastWordOwner && lastWordEmp.length > 1;
                  });
                }

                if (matchedEmp) {
                  targetEmployeeId = matchedEmp.id;
                } else {
                  targetEmployeeId = 'unmatched';
                  if (!localUnmatched.includes(ownerVal)) {
                    localUnmatched.push(ownerVal);
                  }
                }
              } else {
                // Single employee mode - check if owner matches current employee
                if (currentEmployeeName) {
                  const currentLower = currentEmployeeName.toLowerCase().trim();
                  const ownerLower = ownerVal.toLowerCase().trim();
                  if (ownerLower && ownerLower !== currentLower && !ownerLower.includes(currentLower)) {
                    continue; // Skip because it belongs to someone else
                  }
                }
              }
            } else if (importForAll) {
              // If there's no owner in this row, assign to the currently logged in user as fallback
              targetEmployeeId = currentUser?.id || 'unmatched';
            }

            const reportingLevel = idxLevel !== -1 ? String(row[idxLevel] || 'Lãnh đạo đơn vị').trim() : 'Lãnh đạo đơn vị';
            const productName = idxProduct !== -1 ? String(row[idxProduct] || 'Báo cáo').trim() : 'Báo cáo';
            
            let targetQuantity = 1;
            if (idxQuantity !== -1) {
              const val = Number(row[idxQuantity]);
              if (!isNaN(val) && val > 0) targetQuantity = val;
            }

            let rawTimeline = idxTimeline !== -1 ? String(row[idxTimeline] || '').trim() : '';
            
            // Extract deadlineDate from Excel cell
            let deadlineDate: string | undefined = undefined;
            if (idxDeadlineDate !== -1 && row[idxDeadlineDate] !== undefined) {
              const rawVal = row[idxDeadlineDate];
              if (rawVal !== null && rawVal !== '') {
                if (typeof rawVal === 'number') {
                  const dateObj = new Date(Math.round((rawVal - 25569) * 86400 * 1000));
                  if (!isNaN(dateObj.getTime())) {
                    const y = dateObj.getFullYear();
                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const d = String(dateObj.getDate()).padStart(2, '0');
                    deadlineDate = `${y}-${m}-${d}`;
                  }
                } else {
                  const strVal = String(rawVal).trim();
                  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/;
                  const match = strVal.match(dateRegex);
                  if (match) {
                    const d = match[1];
                    const m = match[2];
                    const y = match[3];
                    deadlineDate = `${y}-${m}-${d}`;
                  } else {
                    const parsed = new Date(strVal);
                    if (!isNaN(parsed.getTime())) {
                      const y = parsed.getFullYear();
                      const m = String(parsed.getMonth() + 1).padStart(2, '0');
                      const d = String(parsed.getDate()).padStart(2, '0');
                      deadlineDate = `${y}-${m}-${d}`;
                    }
                  }
                }
              }
            }

            // Sync timeline text if deadline is selected and timeline is missing/basic
            let timeline = rawTimeline;
            if (deadlineDate && (!timeline || timeline === 'Hằng tháng' || timeline === 'Hàng tháng' || timeline === 'Theo yêu cầu' || timeline === '')) {
              const parts = deadlineDate.split('-');
              if (parts.length === 3) {
                timeline = `${parts[2]}/${parts[1]}/${parts[0]}`;
              }
            } else if (!timeline) {
              timeline = 'Hằng tháng';
            }
            
            let maxScore = 100;
            if (idxMaxScore !== -1) {
              const val = Number(row[idxMaxScore]);
              if ([100, 200, 400].includes(val)) maxScore = val;
            }

            let assignedScore = Math.floor(maxScore * 0.9); // default 90%
            if (idxAssignedScore !== -1) {
              const val = Number(row[idxAssignedScore]);
              if (!isNaN(val) && val > 0 && val <= maxScore) assignedScore = val;
            }

            const note = idxNote !== -1 ? String(row[idxNote] || '').trim() : '';

            // Layout-specific defaults or parsing
            let actualQtyCount = targetQuantity;
            let actualQualityCount = targetQuantity;
            let actualProgressCount = targetQuantity;
            
            if (idxStatus !== -1) {
              const statusStr = String(row[idxStatus] || '').toLowerCase().trim();
              if (statusStr.includes('trễ') || statusStr.includes('chậm') || statusStr.includes('quá hạn')) {
                 actualQtyCount = targetQuantity;
                 actualQualityCount = targetQuantity;
                 actualProgressCount = targetQuantity * 0.25;
                 assignedScore = maxScore * 0.75;
              } else if (statusStr.includes('chưa') || statusStr.includes('đang thực hiện') || statusStr.includes('chưa hoàn thành')) {
                 actualQtyCount = 0;
                 actualQualityCount = 0;
                 actualProgressCount = 0;
                 assignedScore = 0;
              } else if (statusStr.includes('hoàn thành')) {
                 actualQtyCount = targetQuantity;
                 actualQualityCount = targetQuantity;
                 actualProgressCount = targetQuantity;
                 assignedScore = maxScore;
              }
            }

            let taskType: 'Định kỳ' | 'Phát sinh' | 'Đột xuất' = 'Định kỳ';

            if (!isImageBased) {
              if (idxActualQty !== -1 && row[idxActualQty] !== undefined) actualQtyCount = Number(row[idxActualQty]);
              if (idxActualQuality !== -1 && row[idxActualQuality] !== undefined) actualQualityCount = Number(row[idxActualQuality]);
              if (idxActualProgress !== -1 && row[idxActualProgress] !== undefined) actualProgressCount = Number(row[idxActualProgress]);
              if (idxTaskType !== -1) {
                const typeVal = String(row[idxTaskType] || 'Định kỳ').trim();
                if (['Định kỳ', 'Phát sinh', 'Đột xuất'].includes(typeVal)) {
                  taskType = typeVal as 'Định kỳ' | 'Phát sinh' | 'Đột xuất';
                } else if (typeVal.toLowerCase().includes('phát sinh')) {
                  taskType = 'Phát sinh';
                } else {
                  taskType = 'Định kỳ';
                }
              }
            }

            const newTask: CivilServiceTask = {
              id: `task-excel-${Date.now()}-${i}`,
              mission,
              reportingLevel,
              productName,
              targetQuantity,
              timeline,
              maxScore,
              assignedScore,
              actualQtyCount,
              actualQualityCount,
              actualProgressCount,
              taskType,
              note,
              deadlineDate: deadlineDate || undefined
            };

            if (importForAll) {
              if (targetEmployeeId !== 'unmatched') {
                if (!tasksByEmployeeId[targetEmployeeId]) {
                  tasksByEmployeeId[targetEmployeeId] = [];
                }
                tasksByEmployeeId[targetEmployeeId].push(newTask);
              }
            } else {
              mappedTasks.push(newTask);
            }
          }

          // --- BEGIN MULTI-SHEET MERGING FOR ACTUAL VALUES ---
          try {
            let actualsSheetName = '';
            for (const name of workbook.SheetNames) {
              if (name === bestSheetName) continue;
              const testWs = workbook.Sheets[name];
              const testRows = XLSX.utils.sheet_to_json<any[]>(testWs, { header: 1 });
              if (!testRows || testRows.length === 0) continue;

              // Scan first few rows to find if it has at least 2 "Thực tế hoàn thành" columns
              const scanLimit = Math.min(testRows.length, 12);
              for (let r = 0; r < scanLimit; r++) {
                const row = testRows[r];
                if (!row || !Array.isArray(row)) continue;
                const cleanCells = row.map(cell => cleanString(String(cell || '')));
                const countActuals = cleanCells.filter(c => c === 'thuc te hoan thanh' || c === 'thuc te' || c === 'hoan thanh').length;
                if (countActuals >= 2) {
                  actualsSheetName = name;
                  break;
                }
              }
              if (actualsSheetName) break;
            }

            if (actualsSheetName) {
              const actualsWs = workbook.Sheets[actualsSheetName];
              const actualsRows = XLSX.utils.sheet_to_json<any[]>(actualsWs, { header: 1 });
              
              // Find header row of actuals sheet
              let actualsHeaderRowIdx = 0;
              let actualsMaxScore = -1;
              const scanLimit = Math.min(actualsRows.length, 15);
              for (let r = 0; r < scanLimit; r++) {
                const row = actualsRows[r];
                if (!row) continue;
                const cleanCells = row.map(cell => cleanString(String(cell || '')));
                const score = cleanCells.filter(c => c === 'thuc te hoan thanh' || c === 'thuc te' || c === 'hoan thanh' || c === 'quy doi' || c === 'he so quy doi').length;
                if (score > actualsMaxScore) {
                  actualsMaxScore = score;
                  actualsHeaderRowIdx = r;
                }
              }

              const actualsHeaders = actualsRows[actualsHeaderRowIdx] as string[];
              const cleanActualsHeaders = actualsHeaders.map(h => cleanString(String(h || '')));
              const actualCompletedIndices = cleanActualsHeaders.reduce((acc, h, idx) => {
                if (h === 'thuc te hoan thanh' || h === 'thuc te' || h === 'hoan thanh') {
                  acc.push(idx);
                }
                return acc;
              }, [] as number[]);

              const idxMissionActuals = cleanActualsHeaders.findIndex(h =>
                ['nhiem vu', 'ten cong viec', 'cong viec', 'noi dung nhiem vu'].some(k => h === k || h.includes(k))
              );

              if (actualCompletedIndices.length >= 2) {
                // We'll collect all valid task rows from actuals sheet
                const actualRowsData: { mission: string, actualQty: number, actualQuality: number, actualProgress: number }[] = [];
                for (let i = actualsHeaderRowIdx + 1; i < actualsRows.length; i++) {
                  const row = actualsRows[i];
                  if (!row || row.length === 0) continue;

                  const missionText = idxMissionActuals !== -1 ? String(row[idxMissionActuals] || '').trim() : '';
                  const missionLower = missionText.toLowerCase();

                  // Skip total rows
                  if (
                    !missionText ||
                    missionLower === 'tổng số' || 
                    missionLower === 'tổng cộng' || 
                    missionLower === 'tổng' || 
                    missionLower === 'total' ||
                    missionLower.startsWith('tổng số') ||
                    missionLower.startsWith('tổng cộng') ||
                    missionLower.includes('tổng số') ||
                    missionLower.includes('tổng cộng')
                  ) {
                    continue;
                  }

                  // Skip STT total as well
                  const idxSTT = cleanActualsHeaders.findIndex(h => h === 'stt' || h === 'tt');
                  if (idxSTT !== -1 && row[idxSTT] !== undefined) {
                    const sttVal = String(row[idxSTT]).trim().toLowerCase();
                    if (sttVal.includes('tổng') || sttVal.includes('tong') || sttVal === 'tổng số' || sttVal === 'tổng cộng') {
                      continue;
                    }
                  }

                  const actualQty = Number(row[actualCompletedIndices[0]]);
                  const actualQuality = Number(row[actualCompletedIndices[1]]);
                  const actualProgress = Number(row[actualCompletedIndices[2] !== undefined ? actualCompletedIndices[2] : actualCompletedIndices[1]]);

                  actualRowsData.push({
                    mission: missionText,
                    actualQty: isNaN(actualQty) ? 1 : actualQty,
                    actualQuality: isNaN(actualQuality) ? 1 : actualQuality,
                    actualProgress: isNaN(actualProgress) ? 1 : actualProgress
                  });
                }

                // Match with parsed tasks
                // If single employee mode (mappedTasks contains everything)
                if (!importForAll && mappedTasks.length > 0) {
                  for (let k = 0; k < mappedTasks.length; k++) {
                    const task = mappedTasks[k];
                    // Try to find matching actuals row by name first, otherwise fallback to same index
                    let matchedActual = actualRowsData.find(a => cleanString(a.mission) === cleanString(task.mission));
                    if (!matchedActual) {
                      // Fallback to sequential index
                      matchedActual = actualRowsData[k];
                    }
                    if (matchedActual) {
                      task.actualQtyCount = matchedActual.actualQty;
                      task.actualQualityCount = matchedActual.actualQuality;
                      task.actualProgressCount = matchedActual.actualProgress;
                    }
                  }
                } else if (importForAll) {
                  // For multi-employee, we can map using the mission names matching across all employees' tasks
                  Object.values(tasksByEmployeeId).forEach(empTasks => {
                    empTasks.forEach(task => {
                      const matchedActual = actualRowsData.find(a => cleanString(a.mission) === cleanString(task.mission));
                      if (matchedActual) {
                        task.actualQtyCount = matchedActual.actualQty;
                        task.actualQualityCount = matchedActual.actualQuality;
                        task.actualProgressCount = matchedActual.actualProgress;
                      }
                    });
                  });
                }
              }
            }
          } catch (err) {
            console.warn('Could not merge multi-sheet actual performance values', err);
          }
          // --- END MULTI-SHEET MERGING FOR ACTUAL VALUES ---

          setUnmatchedNames(localUnmatched);

          if (errors.length > 0) {
            setValidationErrors(errors);
            setError('Lỗi xác thực dữ liệu dòng! Vui lòng kiểm tra lại dữ liệu.');
            return;
          }

          if (importForAll) {
            const count = Object.values(tasksByEmployeeId).reduce((acc, list) => acc + list.length, 0);
            if (count === 0) {
              setError('Không tìm thấy dòng nhiệm vụ nào so khớp thành công với danh sách tài khoản cán bộ.');
              return;
            }

            setParsedCount(count);
            let msg = `Đã xác thực và phân bổ thành công ${count} nhiệm vụ cho ${Object.keys(tasksByEmployeeId).length} cán bộ.`;
            if (localUnmatched.length > 0) {
              msg += ` Cảnh báo: Có ${localUnmatched.length} tên người chủ trì trong Excel không khớp với tài khoản cán bộ nào: ${localUnmatched.join(', ')}.`;
            }
            setSuccessMsg(msg);

            if (onSuccessMultiTasks) {
              setTimeout(() => {
                onSuccessMultiTasks(tasksByEmployeeId);
              }, 1500);
            }
          } else {
            if (mappedTasks.length === 0) {
              setError('Không tìm thấy dòng nhiệm vụ nào hợp lệ trong tệp Excel.');
              return;
            }

            setParsedCount(mappedTasks.length);
            const layoutName = isTrackingLayout ? 'Bảng theo dõi (9 cột)' : 'Bản mẫu ảnh (10 cột)';
            setSuccessMsg(`Đã xác thực và tính toán thành công ${mappedTasks.length} nhiệm vụ theo chuẩn định dạng: ${layoutName}.`);
            if (onSuccessTasks) {
              setTimeout(() => {
                onSuccessTasks(mappedTasks);
              }, 1500);
            }
          }
        }

      } catch (err: any) {
        setError(`Có lỗi xảy ra khi phân tích tệp tin Excel: ${err.message || err}`);
      }
    };

    fileReader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div id="excel-upload-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {type === 'users' 
                  ? 'Tải Lên Danh Sách Cán Bộ từ Excel' 
                  : importForAll 
                  ? 'Nhập Danh Sách Công Việc Toàn Bộ Đơn Vị' 
                  : `Nhập Báo Cáo Công Việc - ${currentEmployeeName}`}
              </h3>
              <p className="text-[10px] text-slate-400">Hỗ trợ tự động phân tích và kiểm tra biểu mẫu theo tiêu chuẩn hành chính</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {/* Instructions and Headers Table */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3 text-xs">
            <h4 className="font-bold text-slate-700 flex items-center gap-1">
              <Shield className="w-4 h-4 text-indigo-600" />
              Yêu cầu định dạng tệp Excel (.xlsx, .xls) / CSV:
            </h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Hệ thống tự động nhận diện và phân tích cấu trúc cột của bạn. Bạn có thể sử dụng mẫu báo cáo chuẩn hoặc bảng tính chi tiết.
            </p>
            
            {type === 'users' ? (
              <div className="pt-1 space-y-2">
                <div>
                  <span className="font-bold text-slate-600 block text-[10px] uppercase tracking-wider mb-1">Cấu trúc cột cán bộ:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {expectedUserHeaders.map((h, i) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[10px] font-medium">
                        {h}
                      </span>
                    ))}
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                      Loại hình (tùy chọn)
                    </span>
                  </div>
                </div>
                <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-200/60 text-[10px] text-indigo-800 leading-relaxed">
                  <strong>Khuyến nghị:</strong> nên thêm cột <strong>"Loại hình"</strong> với giá trị <strong>"Phòng ban"</strong> hoặc <strong>"Đơn vị cơ sở"</strong> cho từng dòng để hệ thống phân loại chính xác 100%.
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Admin or Leader Multi-Employee Upload toggle */}
                {isLeaderOrAdmin && (
                  <div className="bg-indigo-50 border border-indigo-200/60 p-3 rounded-lg space-y-2 text-indigo-900">
                    <label className="flex items-center gap-2 font-bold text-xs cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={importForAll} 
                        onChange={(e) => setImportForAll(e.target.checked)}
                        className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Nhập dữ liệu cho TOÀN BỘ mọi người trong đơn vị</span>
                    </label>
                    <p className="text-[10px] text-indigo-800/80 leading-relaxed pl-6">
                      Bật tùy chọn này để hệ thống đọc cột <strong>"Người chủ trì" / "Người thực hiện"</strong> và tự động so khớp tên để phân bổ đúng công việc về cho từng cán bộ trong đơn vị.
                    </p>
                  </div>
                )}

                <div className="border-l-2 border-indigo-500 pl-2.5">
                  <span className="font-bold text-indigo-800 block text-[10px] uppercase tracking-wider mb-1">Cấu trúc Bản mẫu ảnh (10 Cột - Khuyên dùng):</span>
                  <div className="flex flex-wrap gap-1">
                    {expectedImageTaskHeaders.map((h, i) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[9px] font-medium">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-l-2 border-teal-500 pl-2.5">
                  <span className="font-bold text-teal-800 block text-[10px] uppercase tracking-wider mb-1">Cấu trúc Bảng Theo dõi công việc (9 Cột):</span>
                  <p className="text-[10px] text-teal-700 mb-1 leading-snug">
                    {importForAll 
                      ? 'Hệ thống tự so khớp cột Người chủ trì để sắp xếp công việc. Nếu trễ hạn, tự giảm 25% điểm.' 
                      : `Hệ thống sẽ lọc công việc theo Người chủ trì là "${currentEmployeeName}". Trễ hạn tự giảm 25% điểm.`}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {expectedTrackingHeaders.map((h, i) => (
                      <span key={i} className="bg-teal-50 border border-teal-200 text-teal-800 px-1.5 py-0.5 rounded font-mono text-[9px]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {type === 'tasks' && (
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200/50 mt-2 text-[10px] text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Ràng buộc điểm số & phân bổ:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Điểm chấm không vượt quá khung điểm tối đa (100, 200, hoặc 400).</li>
                {importForAll && <li>Nếu cột người chủ trì trống, hệ thống sẽ gán công việc cho người dùng hiện tại làm phương án dự phòng.</li>}
              </ul>
            </div>
          )}

          {/* Unmatched names warnings */}
          {unmatchedNames.length > 0 && (
            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1.5 animate-fade-in">
              <p className="font-bold text-[10px] flex items-center gap-1 text-amber-800 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Không tìm thấy tài khoản cán bộ cho các tên sau ({unmatchedNames.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {unmatchedNames.map((name, idx) => (
                  <span key={idx} className="bg-white border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold">
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-amber-700 italic">Gợi ý: Hãy kiểm tra xem tên cán bộ trong Excel có trùng với họ tên thật đã đăng ký trong hệ thống hay chưa.</p>
            </div>
          )}

          {/* Template Download Option */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row justify-end gap-2">
            {type === 'users' ? (
              <button
                type="button"
                onClick={() => downloadTemplate()}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 py-1.5 px-3 rounded-lg cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Tải về tệp mẫu cán bộ (.xlsx)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => downloadTemplate('image-based')}
                  className="text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải mẫu Ảnh 10 cột (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => downloadTemplate('tracking')}
                  className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải mẫu Bảng theo dõi (9 cột) (.xlsx)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        <div className="px-6 space-y-3">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs space-y-2 text-red-700 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">Lỗi biểu mẫu tải lên!</p>
                  <p>{error}</p>
                </div>
              </div>
              
              {validationErrors.length > 0 && (
                <div className="bg-white/80 border border-red-100 p-2.5 rounded-lg max-h-[120px] overflow-y-auto font-mono text-[10px] text-red-600 space-y-1 mt-1">
                  {validationErrors.map((err, idx) => (
                    <p key={idx}>• {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs flex items-start gap-2.5 text-emerald-800 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900">Xác thực thành công!</p>
                <p>{successMsg}</p>
                <p className="text-[10px] text-emerald-600 font-medium mt-1">Đang hoàn thành đồng bộ dữ liệu...</p>
              </div>
            </div>
          )}
        </div>

        {/* Drag & Drop Dropzone */}
        <div className="p-6">
          {!successMsg && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50/40 scale-[0.99]' 
                  : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleChange}
              />
              <div className="p-3 bg-slate-50 text-slate-400 group-hover:text-indigo-500 rounded-full mb-3 shadow-2xs border border-slate-100">
                <Upload className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-xs font-bold text-slate-700 text-center">
                Kéo thả tệp Excel hoặc CSV của bạn vào đây
              </p>
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                Hoặc nhấp chuột để duyệt tìm tệp trong máy tính
              </p>
              <p className="text-[9px] font-medium text-indigo-500 mt-3 font-mono">
                Hỗ trợ .XLSX, .XLS, .CSV tối đa 10MB
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end space-x-2 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
}
