import React, { useState, useEffect } from 'react';
import { Employee, KPIResultSummary, isReadyToSubmitForApproval, isEmployeeOfficiallyApproved } from '../types';
import { FileText, Sparkles, UserCheck, CheckCircle, Award, Shield, Key, RefreshCw, AlertTriangle, AlertCircle, Stamp, CheckCircle2 } from 'lucide-react';

interface BieuMauThreeProps {
  employee: Employee;
  summary: KPIResultSummary;
  currentUser: Employee;
  onUpdateSelfAssessment: (val: string) => void;
  onUpdateDepartmentHeadAssessment: (val: string) => void;
  onUpdateManagerAssessment: (val: string) => void;
  onSignCA: (level: 'self' | 'deptHead' | 'manager', signed: boolean, date: string) => void;
  onOpenPrintView: () => void;
  isQuarterLocked?: boolean;
}

const formatKPIVal = (val: number): string => {
  if (val === 100 || val === 0) return val.toFixed(2);
  const str = val.toFixed(4);
  if (str.endsWith('00')) return val.toFixed(2);
  return str;
};

export default function BieuMauThree({
  employee,
  summary,
  currentUser,
  onUpdateSelfAssessment,
  onUpdateDepartmentHeadAssessment,
  onUpdateManagerAssessment,
  onSignCA,
  onOpenPrintView,
  isQuarterLocked = false
}: BieuMauThreeProps) {
  
  const ratingScore = summary.overallTaskPerformanceScore;
  
  // Interactive signing state
  const [signingLevel, setSigningLevel] = useState<'self' | 'deptHead' | 'manager' | null>(null);
  const [tokenPin, setTokenPin] = useState('12345678');
  const [signingStep, setSigningStep] = useState<number>(0);
  const [signingLogs, setSigningLogs] = useState<string[]>([]);
  const [isSigningProgress, setIsSigningProgress] = useState(false);

  // Classification
  let ratingClass = 'Khá';
  let ratingColor = 'text-amber-600 bg-amber-50 border-amber-200';
  let badgeColor = 'bg-amber-600 text-white';
  let ratingDescription = 'Đồng chí hoàn thành nhiệm vụ với hiệu suất làm việc tốt, đảm bảo đúng tiến trình công việc đề ra.';

  if (ratingScore >= 99.5) {
    ratingClass = 'A. Xuất Sắc';
    ratingColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    badgeColor = 'bg-emerald-600 text-white';
    ratingDescription = 'Đồng chí hoàn thành xuất sắc các mục tiêu đề ra, đạt tỉ lệ quy đổi tối đa ở các chỉ số quan trọng.';
  } else if (ratingScore >= 90) {
    ratingClass = 'B. Tốt';
    ratingColor = 'text-teal-700 bg-teal-50 border-teal-200';
    badgeColor = 'bg-teal-600 text-white';
    ratingDescription = 'Đồng chí hoàn thành tốt các chỉ tiêu công tác quy đổi, được đánh giá cao về tinh thần trách nhiệm.';
  } else if (ratingScore < 80) {
    ratingClass = 'D. Không hoàn thành';
    ratingColor = 'text-red-700 bg-red-50 border-red-200';
    badgeColor = 'bg-red-600 text-white';
    ratingDescription = 'Đồng chí cần nỗ lực đẩy nhanh tiến độ và cải thiện sản phẩm quy đổi để đáp ứng yêu cầu công vụ.';
  }

  // Determine user relationships
  const isSelf = currentUser && currentUser.id === employee.id;

  const DEPT_HEAD_KEYWORDS = ['trưởng', 'bí thư', 'giám đốc', 'chủ tịch', 'hiệu trưởng'];
  const roleLooksLikeDeptHead = (roleText: string) => {
    const r = (roleText || '').toLowerCase();
    return DEPT_HEAD_KEYWORDS.some(k => r.includes(k));
  };

  // Admin hoặc Trưởng khối Ban Lãnh Đạo có quyền như admin -> luôn được phê duyệt thay cấp Trưởng đơn vị
  // (tránh trường hợp không có ai khớp đúng role/phòng ban nên nút "biến mất").
  const isAdminLikeApprover = !!(currentUser && (
    currentUser.isAdmin ||
    (currentUser.orgType === 'Ban Lãnh Đạo' && currentUser.leadershipRole === 'Trưởng')
  ));

  // Check if current user is the department manager for the employee
  const isDeptHeadOfEmployee = !!(currentUser && currentUser.id !== employee.id && (
    isAdminLikeApprover ||
    (roleLooksLikeDeptHead(currentUser.role) && currentUser.department === employee.department)
  ));

  // Check if active employee is a department head themselves
  const employeeIsDeptHead = roleLooksLikeDeptHead(employee.role);

  // Check if current user is higher leader or admin
  const isHigherLeaderOrAdmin = !!(currentUser && isAdminLikeApprover);

  // Signer name calculations
  const getDeptHeadName = () => {
    // Find department head for this employee in the list
    if (employee.department === 'Ban Tổ chức Đảng ủy') return 'Đ/c Nguyễn Văn Hải';
    if (employee.department === 'Văn phòng Tổng hợp') return 'Đ/c Trần Thị Kim Anh';
    return 'Trưởng phòng phụ trách';
  };

  const getLeaderName = () => {
    return employee.orgType === 'Đơn vị cơ sở' ? 'Đ/c Phạm Minh Tuấn' : 'Đ/c Nguyễn Văn Hải';
  };

  // CA signing simulation trigger
  const handleStartSigning = (level: 'self' | 'deptHead' | 'manager') => {
    setSigningLevel(level);
    setTokenPin('12345678');
    setSigningStep(1); // 1 = show PIN input
    setSigningLogs([]);
    setIsSigningProgress(false);
  };

  const handleExecuteSigning = () => {
    setIsSigningProgress(true);
    setSigningStep(2); // 2 = processing
    
    const logs = [
      '🔄 Đang khởi tạo kết nối thiết bị bảo mật Token USB CA...',
      '📡 Đang đọc thông tin chứng thư số cá nhân từ Ban Cơ yếu Chính phủ...',
      '🔐 Đang kiểm tra danh sách thu hồi chứng thư (CRL) thời gian thực...',
      '✍️ Đang áp dụng chữ ký số bảo mật SHA-256 mã hóa gói dữ liệu...',
      '🕒 Đang lấy đóng dấu thời gian chính xác (Timestamp Server)...',
      '✅ Chứng thực số thành công! Bản tự chấm điểm đã được khóa niêm phong bằng CA.'
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setSigningLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          // Complete signing
          const now = new Date();
          const dateStr = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN');
          onSignCA(signingLevel!, true, dateStr);
          setSigningLevel(null);
          setIsSigningProgress(false);
        }, 500);
      }
    }, 450);
  };

  // Check locks and pre-requisites for levels
  // Level 3 (Manager) can only evaluate/sign if Level 2 has signed (or if candidate is dept head themselves, level 1 has signed)
  const isLevel3Blocked = !employeeIsDeptHead && !employee.deptHeadSignedCA;

  // Cán bộ chỉ được "Gửi lên Trưởng đơn vị" (ký Cấp 1) sau khi đã Lưu đầy đủ Biểu 01 và Biểu 02.
  const readyToSubmit = isReadyToSubmitForApproval(employee);
  // Điểm chỉ là "điểm chính thức" của hệ thống khi đã đi hết quy trình gửi + phê duyệt liên cấp.
  const isOfficialScore = isEmployeeOfficiallyApproved(employee);

  return (
    <div id="bieu-mau-3-panel" className="space-y-6">
      {/* KPI Core Results Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Quantity KPI Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">1. KPI Số Lượng</span>
          <div className="my-3">
            <span className="text-2xl font-black text-indigo-600 font-mono">
              {formatKPIVal(summary.qtyKPIPercentage)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, summary.qtyKPIPercentage)}%` }}
            ></div>
          </div>
          <span className="text-[9px] text-slate-400 mt-2 font-medium">Đạt {summary.totalQtyConverted.toFixed(1)} / {summary.totalTargetConverted.toFixed(1)}đ</span>
        </div>

        {/* Quality KPI Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">2. KPI Chất Lượng</span>
          <div className="my-3">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {formatKPIVal(summary.qualityKPIPercentage)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-600 h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, summary.qualityKPIPercentage)}%` }}
            ></div>
          </div>
          <span className="text-[9px] text-slate-400 mt-2 font-medium">Đạt {summary.totalQualityConverted.toFixed(1)} / {summary.totalTargetConverted.toFixed(1)}đ</span>
        </div>

        {/* Progress KPI Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">3. KPI Tiến Độ</span>
          <div className="my-3">
            <span className="text-2xl font-black text-amber-600 font-mono">
              {formatKPIVal(summary.progressKPIPercentage)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-amber-600 h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, summary.progressKPIPercentage)}%` }}
            ></div>
          </div>
          <span className="text-[9px] text-slate-400 mt-2 font-medium">Đạt {summary.totalProgressConverted.toFixed(1)} / {summary.totalTargetConverted.toFixed(1)}đ</span>
        </div>

        {/* Overal rating summary */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-4 rounded-2xl text-white text-center flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block">Hiệu Suất Tổng Thể</span>
          <div className="my-2">
            <span className="text-3xl font-black font-mono">
              {formatKPIVal(ratingScore)}%
            </span>
          </div>
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md self-center ${badgeColor}`}>
            Xếp loại: {ratingClass}
          </span>
          <span className="text-[9px] text-indigo-200 mt-1.5 font-medium">Kết quả tính tự động</span>
        </div>
      </div>

      {/* Main visual scorecard report block */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Biểu mẫu 03: Kết quả liên kết & Báo cáo xếp cấp</h3>
            <p className="text-slate-700 text-xs font-bold mt-1">Đánh giá chung về hiệu suất hoàn thành nhiệm vụ</p>
          </div>
          
          <button
            type="button"
            onClick={onOpenPrintView}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            In Báo Cáo / Xuất file PDF
          </button>
        </div>

        {/* Evaluation status and automated insights */}
        <div className={`p-4 rounded-xl border flex gap-3.5 items-start text-xs ${ratingColor}`}>
          <Award className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <p className="font-extrabold uppercase text-[10px] tracking-wide">
              Xếp loại kết luận tự động: {ratingClass} ({formatKPIVal(ratingScore)}%)
            </p>
            <p className="text-slate-600 leading-relaxed font-medium">
              {ratingDescription} Dữ liệu đã được liên kết thông minh từ chi tiết nhật ký công việc (Biểu mẫu 01) thông qua bảng tính quy đổi (Biểu mẫu 02).
            </p>
          </div>
        </div>

        {/* Official Mẫu 3 Table */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-4 border-indigo-600 pl-2">
            Mẫu Số 03: Bảng Tổng Hợp Kết Quả Đánh Giá KPI Toàn Diện
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse min-w-[600px] border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center uppercase tracking-wide text-[10px]">
                  <th className="p-3 border border-slate-300 w-16">STT</th>
                  <th className="p-3 border border-slate-300 text-left">Nội dung đánh giá hiệu suất (KPI)</th>
                  <th className="p-3 border border-slate-300 w-44 text-center">Tỷ lệ đạt KPI (%)</th>
                  <th className="p-3 border border-slate-300 w-56 text-center bg-indigo-50/40 text-indigo-950">ĐIỂM THỰC HIỆN NHIỆM VỤ</th>
                </tr>
                <tr className="bg-slate-50 text-[9px] text-slate-400 font-bold border-b border-slate-300 text-center">
                  <td className="p-1 border border-slate-300">(1)</td>
                  <td className="p-1 border border-slate-300 text-left">(2)</td>
                  <td className="p-1 border border-slate-300">(3)</td>
                  <td className="p-1 border border-slate-300 bg-indigo-50/20 font-black text-indigo-700">(4) = TBC (3)</td>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr className="hover:bg-slate-50/30">
                  <td className="p-3 text-center border border-slate-200 font-mono font-bold text-slate-400">1</td>
                  <td className="p-3 border border-slate-200 font-semibold text-slate-800">
                    <strong>KPI SỐ LƯỢNG</strong> (Tổng điểm quy đổi thực tế / Tổng mục tiêu quy đổi)
                  </td>
                  <td className="p-3 text-center border border-slate-200 font-mono font-extrabold text-indigo-600 bg-indigo-50/5">
                    {formatKPIVal(summary.qtyKPIPercentage)}%
                  </td>
                  <td className="p-3 text-center border border-slate-200 font-mono text-base font-black text-indigo-700 bg-indigo-50/10 align-middle" rowSpan={3}>
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="text-xl font-black">{formatKPIVal(ratingScore)}%</span>
                      <span className="text-[9px] text-slate-400 font-sans uppercase font-bold tracking-wider">Trung bình cộng 3 tiêu chí</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/30">
                  <td className="p-3 text-center border border-slate-200 font-mono font-bold text-slate-400">2</td>
                  <td className="p-3 border border-slate-200 font-semibold text-slate-800">
                    <strong>KPI CHẤT LƯỢNG</strong> (Đánh giá mức độ hoàn thiện, chuẩn đầu ra)
                  </td>
                  <td className="p-3 text-center border border-slate-200 font-mono font-extrabold text-emerald-600 bg-emerald-50/5">
                    {formatKPIVal(summary.qualityKPIPercentage)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/30">
                  <td className="p-3 text-center border border-slate-200 font-mono font-bold text-slate-400">3</td>
                  <td className="p-3 border border-slate-200 font-semibold text-slate-800">
                    <strong>KPI TIẾN ĐỘ</strong> (Đánh giá tốc độ xử lý và cam kết hoàn thành đúng hạn)
                  </td>
                  <td className="p-3 text-center border border-slate-200 font-mono font-extrabold text-amber-600 bg-amber-50/5">
                    {formatKPIVal(summary.progressKPIPercentage)}%
                  </td>
                </tr>
                <tr className="bg-slate-50 font-extrabold text-slate-800 text-[10px]">
                  <td colSpan={2} className="p-3 text-right border border-slate-200 uppercase tracking-wide text-[9px] text-slate-500">
                    Xếp loại chất lượng đề xuất chính thức:
                  </td>
                  <td colSpan={2} className="p-3 border border-slate-200 text-left bg-slate-50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 text-[9.5px] font-black uppercase rounded-md border ${badgeColor} ${ratingColor}`}>
                        Xếp loại: {ratingClass}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        (Dựa trên điểm hiệu suất tổng thể {ratingScore.toFixed(2)}%)
                      </span>
                      {isOfficialScore ? (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md border bg-emerald-600 text-white border-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Điểm chính thức
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md border bg-slate-200 text-slate-600 border-slate-300">
                          Chưa chính thức (đang chờ gửi/duyệt)
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Multi-tier evaluation forms based on user role */}
        <div className="space-y-6 border-b border-slate-100 pb-6">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-4 border-red-600 pl-2">Quy Trình Nhận Xét, Phê Duyệt Liên Cấp</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* TIER 1: Self assessment */}
            <div className={`p-4 rounded-2xl border transition-all ${isSelf ? 'bg-indigo-50/20 border-indigo-200 shadow-3xs' : 'bg-slate-50/50 border-slate-200/80'}`}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-indigo-500" />
                  Cấp 1: Cán bộ tự nhận xét
                </label>
                {employee.selfSignedCA && (
                  <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded border border-emerald-200">Đã ký CA</span>
                )}
              </div>
              
              <textarea
                rows={4}
                value={employee.selfAssessmentNote || ''}
                disabled={isQuarterLocked || !isSelf || employee.selfSignedCA}
                onChange={(e) => onUpdateSelfAssessment(e.target.value)}
                className={`w-full text-xs p-3 border rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none font-medium text-slate-700 leading-relaxed ${
                  isQuarterLocked || !isSelf || employee.selfSignedCA
                    ? 'bg-slate-100 border-slate-100 cursor-not-allowed placeholder:text-slate-400'
                    : 'bg-white border-slate-200 placeholder:text-slate-400'
                }`}
                placeholder="Cán bộ viết tự nhận xét ưu, khuyết điểm, kết quả nổi bật trong tháng của bản thân tại đây..."
              />

              {!readyToSubmit && isSelf && !employee.selfSignedCA && !isQuarterLocked && (
                <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                  <p className="text-[10px] text-rose-700 font-black uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Chưa thể gửi lên Trưởng đơn vị
                  </p>
                  <p className="text-[9px] text-slate-600 font-medium leading-relaxed">
                    Đồng chí cần <strong>Lưu Biểu 01</strong> và <strong>Lưu Biểu 02</strong> (ở các tab tương ứng) trước khi gửi hồ sơ tự chấm điểm lên Trưởng đơn vị.
                  </p>
                </div>
              )}

              {isSelf && readyToSubmit && !employee.selfSignedCA && !isQuarterLocked && (
                <button
                  type="button"
                  onClick={() => handleStartSigning('self')}
                  className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  Gửi lên Trưởng đơn vị (Ký điện tử CA)
                </button>
              )}
              {!isSelf && (
                <p className="text-[9px] text-slate-400 italic mt-1.5">* Chỉ tài khoản cán bộ {employee.name} mới được tự nhận xét và ký số.</p>
              )}
            </div>

            {/* TIER 2: Department/Unit head assessment */}
            <div className={`p-4 rounded-2xl border transition-all ${
              employeeIsDeptHead 
                ? 'bg-slate-100/50 border-slate-200 border-dashed opacity-60 flex flex-col justify-center text-center' 
                : (isDeptHeadOfEmployee ? 'bg-emerald-50/20 border-emerald-200 shadow-3xs' : 'bg-slate-50/50 border-slate-200/80')
            }`}>
              {employeeIsDeptHead ? (
                <div className="space-y-1 py-4">
                  <p className="text-xs font-extrabold text-slate-500 uppercase">Cấp 2: Nhận xét cấp Phòng</p>
                  <p className="text-[10px] text-slate-400 italic font-medium px-2">Đồng chí là Trưởng đơn vị. Không áp dụng đánh giá cấp phòng ban. Trực tiếp chuyển cấp Lãnh đạo cao hơn.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      Cấp 2: Lãnh đạo đơn vị nhận xét
                    </label>
                    {employee.deptHeadSignedCA && (
                      <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded border border-emerald-200">Đã ký CA</span>
                    )}
                  </div>
                  
                  <textarea
                    rows={4}
                    value={employee.departmentHeadAssessmentNote || ''}
                    disabled={isQuarterLocked || !isDeptHeadOfEmployee || employee.deptHeadSignedCA}
                    onChange={(e) => onUpdateDepartmentHeadAssessment(e.target.value)}
                    className={`w-full text-xs p-3 border rounded-xl focus:outline-hidden focus:border-emerald-500 focus:bg-white resize-none font-medium text-slate-700 leading-relaxed ${
                      isQuarterLocked || !isDeptHeadOfEmployee || employee.deptHeadSignedCA
                        ? 'bg-slate-100 border-slate-100 cursor-not-allowed placeholder:text-slate-400'
                        : 'bg-white border-slate-200 placeholder:text-slate-400'
                    }`}
                    placeholder={
                      isDeptHeadOfEmployee 
                        ? 'Trưởng phòng ban ghi nhận xét kết luận, đánh giá năng lực hằng tháng của cán bộ tại đây...'
                        : `Dành cho Trưởng phòng (${getDeptHeadName()}) ghi nhận xét...`
                    }
                  />

                  {isDeptHeadOfEmployee && !employee.deptHeadSignedCA && !isQuarterLocked && (
                    <button
                      type="button"
                      onClick={() => handleStartSigning('deptHead')}
                      className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Hoàn thành & Gửi phê duyệt (Điểm chính thức)
                    </button>
                  )}
                  {!isDeptHeadOfEmployee && !employeeIsDeptHead && (
                    <p className="text-[9px] text-slate-400 italic mt-1.5">* Chỉ Trưởng phòng ban quản lý trực tiếp ({getDeptHeadName()}) mới được ghi nhận xét và ký số.</p>
                  )}
                </>
              )}
            </div>

            {/* TIER 3: Higher leadership / Chi bộ Bí thư */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isHigherLeaderOrAdmin && !isLevel3Blocked ? 'bg-red-50/10 border-red-200 shadow-3xs' : 'bg-slate-50/50 border-slate-200/80'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Shield className="w-4 h-4 text-red-500" />
                  Cấp 3: Trưởng cao nhất phê duyệt
                </label>
                {employee.managerSignedCA && (
                  <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded border border-emerald-200">Đã ký CA</span>
                )}
              </div>

              {isLevel3Blocked ? (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-1.5">
                  <p className="text-[10px] text-rose-700 font-black uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                    Chưa đủ điều kiện phê duyệt
                  </p>
                  <p className="text-[9px] text-slate-600 font-medium leading-relaxed">
                    Theo quy trình nhà nước, Trưởng phòng Ban phụ trách (<strong>{getDeptHeadName()}</strong>) phải ghi ý kiến nhận xét và <strong>Ký số CA ở Cấp 2 trước</strong>, sau đó cấp Lãnh đạo cao hơn mới được quyền phê duyệt và đóng dấu CA chính thức.
                  </p>
                </div>
              ) : (
                <>
                  <textarea
                    rows={4}
                    value={employee.managerAssessmentNote || ''}
                    disabled={isQuarterLocked || !isHigherLeaderOrAdmin || employee.managerSignedCA}
                    onChange={(e) => onUpdateManagerAssessment(e.target.value)}
                    className={`w-full text-xs p-3 border rounded-xl focus:outline-hidden focus:border-red-500 focus:bg-white resize-none font-medium text-slate-700 leading-relaxed ${
                      isQuarterLocked || !isHigherLeaderOrAdmin || employee.managerSignedCA
                        ? 'bg-slate-100 border-slate-100 cursor-not-allowed placeholder:text-slate-400'
                        : 'bg-white border-slate-200 placeholder:text-slate-400'
                    }`}
                    placeholder={
                      isHigherLeaderOrAdmin
                        ? 'Bí thư Đảng ủy / Lãnh đạo cấp cao ghi nhận xét kết luận và phê duyệt chính thức tại đây...'
                        : 'Dành cho Lãnh đạo cấp cao (Đảng bộ) rà soát, kết luận xếp loại...'
                    }
                  />

                  {isHigherLeaderOrAdmin && !employee.managerSignedCA && !isQuarterLocked && (
                    <button
                      type="button"
                      onClick={() => handleStartSigning('manager')}
                      className="mt-2 w-full py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Ký điện tử CA Lãnh đạo
                    </button>
                  )}
                  {!isHigherLeaderOrAdmin && (
                    <p className="text-[9px] text-slate-400 italic mt-1.5">* Quyền hạn phê duyệt tối cao thuộc về Bí thư chi đoàn hoặc Lãnh đạo cấp cao Đảng ủy.</p>
                  )}
                </>
              )}
            </div>

          </div>
        </div>

        {/* State-style Signatures block */}
        <div className="pt-4">
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">XÁC THỰC CHỮ KÝ SỐ CHỨNG THƯ CA CHUYÊN DỤNG CHÍNH PHỦ</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 text-center text-xs gap-6">
            
            {/* Column 1: Employee signature */}
            <div className="space-y-2 border border-slate-100 p-4 bg-slate-50/30 rounded-2xl flex flex-col justify-between h-48">
              <div>
                <p className="font-extrabold uppercase text-slate-700">Người Tự Chấm</p>
                <p className="text-[10px] text-slate-400 italic">(Ký điện tử cá nhân)</p>
              </div>
              
              <div className="flex items-center justify-center py-2">
                {employee.selfSignedCA ? (
                  <div className="border-2 border-red-600 rounded-lg p-2 bg-red-50/20 max-w-[240px] text-left relative overflow-hidden font-mono shadow-3xs select-none">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 rotate-12 text-red-600 text-[9px] font-black pointer-events-none">
                      CHỨNG THƯ CA
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-red-100 rounded text-red-600 shrink-0">
                        <Stamp className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-red-700 uppercase tracking-wide leading-none">CHỮ KÝ SỐ CA</p>
                        <p className="text-[8px] text-red-600 font-extrabold truncate w-[130px]">Ký bởi: {employee.name}</p>
                        <p className="text-[8px] text-red-500 leading-none">Ngày: {employee.selfSignedCADate}</p>
                        <p className="text-[7px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                          CHỨNG THƯ HỢP LỆ
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Cán bộ chưa thực hiện ký số</span>
                )}
              </div>
              
              <p className="font-bold text-slate-800 leading-none">{employee.name}</p>
            </div>

            {/* Column 2: Department Head signature */}
            <div className="space-y-2 border border-slate-100 p-4 bg-slate-50/30 rounded-2xl flex flex-col justify-between h-48">
              <div>
                <p className="font-extrabold uppercase text-slate-700">Trưởng Phòng / Đơn Vị</p>
                <p className="text-[10px] text-slate-400 italic">(Ký điện tử cấp quản lý)</p>
              </div>
              
              <div className="flex items-center justify-center py-2">
                {employeeIsDeptHead ? (
                  <div className="text-[10px] text-slate-400 font-semibold italic border border-dashed border-slate-200 bg-slate-100/50 px-3 py-2 rounded-xl">
                    Cán bộ là Trưởng phòng<br/>(Bỏ qua cấp quản lý)
                  </div>
                ) : employee.deptHeadSignedCA ? (
                  <div className="border-2 border-red-600 rounded-lg p-2 bg-red-50/20 max-w-[240px] text-left relative overflow-hidden font-mono shadow-3xs select-none">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 rotate-12 text-red-600 text-[9px] font-black pointer-events-none">
                      CHỨNG THƯ CA
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-red-100 rounded text-red-600 shrink-0">
                        <Stamp className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-red-700 uppercase tracking-wide leading-none">CHỮ KÝ SỐ CA</p>
                        <p className="text-[8px] text-red-600 font-extrabold truncate w-[130px]">Ký bởi: {getDeptHeadName()}</p>
                        <p className="text-[8px] text-red-500 leading-none">Ngày: {employee.deptHeadSignedCADate}</p>
                        <p className="text-[7px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                          CHỨNG THƯ HỢP LỆ
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Chưa thực hiện ký số cấp phòng</span>
                )}
              </div>
              
              <p className="font-bold text-slate-800 leading-none">
                {employeeIsDeptHead ? 'Không áp dụng' : getDeptHeadName()}
              </p>
            </div>

            {/* Column 3: Higher leader signature */}
            <div className="space-y-2 border border-slate-100 p-4 bg-slate-50/30 rounded-2xl flex flex-col justify-between h-48">
              <div>
                <p className="font-extrabold uppercase text-slate-700">Bí Thư / Lãnh Đạo Cấp Cao</p>
                <p className="text-[10px] text-slate-400 italic">(Đóng dấu & Phê duyệt điện tử)</p>
              </div>
              
              <div className="flex items-center justify-center py-2">
                {employee.managerSignedCA ? (
                  <div className="border-2 border-red-600 rounded-lg p-2 bg-red-50/20 max-w-[240px] text-left relative overflow-hidden font-mono shadow-3xs select-none">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 rotate-12 text-red-600 text-[9px] font-black pointer-events-none">
                      CHỨNG THƯ CA
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-red-100 rounded text-red-600 shrink-0">
                        <Stamp className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-red-700 uppercase tracking-wide leading-none">CHỮ KÝ PHÊ DUYỆT</p>
                        <p className="text-[8px] text-red-600 font-extrabold truncate w-[130px]">Ký bởi: {getLeaderName()}</p>
                        <p className="text-[8px] text-red-500 leading-none">Ngày: {employee.managerSignedCADate}</p>
                        <p className="text-[7px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                          CHỨNG THƯ HỢP LỆ
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Đang chờ phê duyệt & ký số Đảng ủy</span>
                )}
              </div>
              
              <p className="font-bold text-slate-800 leading-none">
                {getLeaderName()}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* DETAILED SIMULATED CA SIGNING MODAL DIALOG */}
      {signingLevel && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <Key className="w-6 h-6 shrink-0 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">XÁC THỰC CHỮ KÝ SỐ CA CHUYÊN DỤNG</h3>
                <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Cổng chứng thư số Ban cơ yếu Chính phủ</p>
              </div>
            </div>

            {signingStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Hệ thống yêu cầu xác nhận mã PIN bảo mật của thiết bị <strong>USB Token CA chuyên dụng</strong> để ký điện tử đóng dấu bản tự đánh giá KPI của cán bộ <strong>{employee.name}</strong>.
                </p>
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mã PIN Token CA (8 ký tự)</label>
                  <input
                    type="password"
                    value={tokenPin}
                    onChange={(e) => setTokenPin(e.target.value)}
                    className="w-full text-center text-sm p-3 font-mono border rounded-xl tracking-widest bg-slate-50 border-slate-200 focus:outline-hidden focus:border-red-500 focus:bg-white"
                    placeholder="••••••••"
                  />
                  <p className="text-[9px] text-slate-400 italic font-medium">* Mã PIN thử nghiệm mặc định đã điền sẵn là <strong>12345678</strong></p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSigningLevel(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSigning}
                    className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Xác nhận & Ký số
                  </button>
                </div>
              </div>
            )}

            {signingStep === 2 && (
              <div className="space-y-4 py-2">
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                  <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wide">ĐANG MÃ HÓA KÝ SỐ HỒ SƠ...</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hệ thống đang giao tiếp với khóa bảo mật</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl font-mono text-[9px] text-emerald-400 space-y-1.5 max-h-40 overflow-y-auto">
                  {signingLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <span className="shrink-0 text-slate-500">{`>`}</span>
                      <p className="leading-relaxed font-semibold">{log}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
