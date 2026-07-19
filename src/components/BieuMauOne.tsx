import { useState } from 'react';
import { CivilServiceTask, Employee, getGeneralCriteriaScores } from '../types';
import { Plus, Trash2, FileUp, Sparkles, Check, Info, Lock, FileText, UserCheck, CheckSquare, PenTool, AlertCircle } from 'lucide-react';

interface BieuMauOneProps {
  tasks: CivilServiceTask[];
  employee?: Employee;
  onUpdateEmployeeFields?: (fields: Partial<Employee>) => void;
  onUpdateTask: (task: CivilServiceTask) => void;
  onAddTask: (task: CivilServiceTask) => void;
  onDeleteTask: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenUploadModal: () => void;
  onApplyTemplate: (templateKey: 'template1' | 'template2' | 'template3') => void;
  isQuarterLocked?: boolean;
  mode?: 'form01' | 'kpi_list';
  onNavigateToGrading?: () => void;
}

export default function BieuMauOne({
  tasks,
  employee,
  onUpdateEmployeeFields,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onOpenAddModal,
  onOpenUploadModal,
  onApplyTemplate,
  isQuarterLocked = false,
  mode,
  onNavigateToGrading
}: BieuMauOneProps) {
  const [subTab, setSubTab] = useState<'form01' | 'kpi_list'>('form01');
  
  const filteredTasks = (tasks || []).filter(task => {
    if (!task || !task.mission) return false;
    const m = task.mission.toLowerCase().trim();
    return !(
      m === 'tổng số' || 
      m === 'tổng cộng' || 
      m === 'tổng' || 
      m === 'total' || 
      m.startsWith('tổng số') || 
      m.startsWith('tổng cộng') ||
      m.includes('tổng số') ||
      m.includes('tổng cộng')
    );
  });
  
  const activeSubTab = mode || subTab;
  
  const scores = employee ? getGeneralCriteriaScores(employee) : {
    diemI1: 0,
    diemI2: 0,
    diemII1: 0,
    diemII2: 0,
    diemII3: 0,
    diemII4: 0,
    diemIII1: 0,
    diemIII2: 0,
    diemIII3: 0,
    diemIII4: 0,
  };
  const totalCriteriaScore = scores.diemI1 + scores.diemI2 + scores.diemII1 + scores.diemII2 + scores.diemII3 + scores.diemII4 + scores.diemIII1 + scores.diemIII2 + scores.diemIII3 + scores.diemIII4;

  const handleScoreChange = (field: string, value: string) => {
    if (isQuarterLocked) return;
    let numVal = parseFloat(value);
    if (isNaN(numVal)) numVal = 0;
    const max = (field === 'diemI1' || field === 'diemI2') ? 5.0 : 2.5;
    numVal = Math.min(max, Math.max(0, numVal));
    if (onUpdateEmployeeFields) {
      onUpdateEmployeeFields({ [field]: numVal });
    }
  };
  
  
  const handleFieldChange = (task: CivilServiceTask, field: keyof CivilServiceTask, value: any) => {
    if (isQuarterLocked) return;
    const updatedTask = {
      ...task,
      [field]: value
    };
    if (field === 'targetQuantity') {
      updatedTask.actualQtyCount = Number(value);
      updatedTask.actualQualityCount = Number(value);
      updatedTask.actualProgressCount = Number(value);
    }
    onUpdateTask(updatedTask);
  };

  const handleAddQuickRow = () => {
    if (isQuarterLocked) return;
    const newId = `quick-task-${Date.now()}`;
    const newTask: CivilServiceTask = {
      id: newId,
      mission: 'Nhiệm vụ công tác mới tự khai',
      reportingLevel: 'Lãnh đạo đơn vị',
      productName: 'Báo cáo / Văn bản',
      targetQuantity: 1,
      timeline: 'Hằng tháng',
      note: 'Nhập liệu trực tiếp',
      maxScore: 100,
      assignedScore: 0,
      actualQtyCount: 1,
      actualQualityCount: 1,
      actualProgressCount: 1,
      taskType: 'Định kỳ'
    };
    onAddTask(newTask);
  };

  const DEFAULT_TEXTS: Record<string, string> = {
    tutuongChinhTri: 'Bản thân luôn có lập trường tư tưởng chính trị vững vàng, kiên định với đường lối đổi mới của Đảng, mục tiêu độc lập dân tộc và chủ nghĩa xã hội. Tuyệt đối chấp hành các chủ trương, đường lối, nghị quyết của Đảng, chính sách pháp luật của Nhà nước. Tích cực tự học tập, nghiên cứu nâng cao trình độ chuyên môn nghiệp vụ.',
    phamChatDaoDuc: 'Bản thân luôn giữ gìn phẩm chất đạo đức cách mạng, lối sống trong sạch, giản dị, lành mạnh. Thực hành tiết kiệm, đấu tranh chống lãng phí, quan liêu, tham nhũng. Luôn giữ mối liên hệ mật thiết với nhân dân và quần chúng tại nơi cư trú, cơ quan.',
    tacPhongLeLoi: 'Tác phong làm việc khoa học, đúng giờ, có tinh thần trách nhiệm cao đối với công việc được phân công. Giải quyết công việc đúng thẩm quyền, quy trình quy định. Có thái độ hòa nhã, tôn trọng và hợp tác tốt với đồng nghiệp.',
    yThucKyLuat: 'Chấp hành nghiêm kỷ luật lao động, quy chế làm việc của cơ quan, đơn vị. Gương mẫu thực hiện nghĩa vụ công dân nơi cư trú. Tham gia đầy đủ, nghiêm túc các buổi sinh hoạt chi bộ định kỳ và đóng đảng phí đúng quy định.',
    hanCheKhuyetDiem: 'Trong quá trình thực hiện nhiệm vụ đôi lúc còn chưa chủ động nghiên cứu đề xuất các giải pháp cải tiến quy trình hành chính mới. Việc tham gia phát biểu đóng góp ý kiến trong một số cuộc họp sinh hoạt chi bộ còn trầm, chưa sôi nổi.',
    bienPhapKhacPhuc: 'Thời gian tới chủ động bố trí sắp xếp thời gian khoa học để tự nghiên cứu sâu hơn về các văn bản quy phạm pháp luật mới. Tích cực tham gia đóng góp ý kiến, thể hiện rõ lập trường quan điểm cá nhân trong sinh hoạt chi bộ.',
    tuNhanXepLoai: 'Hoàn thành tốt nhiệm vụ'
  };

  const getEmpValue = (field: 'tutuongChinhTri' | 'phamChatDaoDuc' | 'tacPhongLeLoi' | 'yThucKyLuat' | 'hanCheKhuyetDiem' | 'bienPhapKhacPhuc' | 'tuNhanXepLoai') => {
    if (!employee) return DEFAULT_TEXTS[field] || '';
    return employee[field] !== undefined ? employee[field]! : (DEFAULT_TEXTS[field] || '');
  };

  const handleEmpFieldChange = (field: string, val: string) => {
    if (isQuarterLocked) return;
    if (onUpdateEmployeeFields) {
      onUpdateEmployeeFields({ [field]: val });
    }
  };

  return (
    <div id="bieu-mau-1-panel" className="space-y-6">
      {/* Sub-tab selection bar */}
      {!mode && (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 max-w-xl gap-1 shadow-3xs">
          <button
            type="button"
            onClick={() => setSubTab('form01')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              subTab === 'form01'
                ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Mẫu 01: Bản Tự Kiểm Điểm
          </button>
          <button
            type="button"
            onClick={() => setSubTab('kpi_list')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              subTab === 'kpi_list'
                ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Phụ lục KPI: Sổ Nhật Ký Đầu Việc ({filteredTasks.length})
          </button>
        </div>
      )}

      {/* Lock Warning Banner */}
      {isQuarterLocked && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-rose-800">
          <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <p className="font-extrabold uppercase tracking-wider text-[10px]">SỔ ĐIỂM ĐÃ ĐƯỢC KHÓA CHỐT</p>
            <p className="text-rose-700 leading-relaxed font-semibold">
              Toàn bộ dữ liệu nhật ký công tác Quý II/2026 đã được phê duyệt và khóa sổ chính thức. Hiện tại, bảng nhập liệu đang ở trạng thái <strong>Chỉ Xem (Read-only)</strong>, mọi hành động thêm mới, sửa đổi hoặc xóa đầu việc đều bị tạm ngưng.
            </p>
          </div>
        </div>
      )}

      {/* Thanh trạng thái Lưu Biểu 01: điểm/dữ liệu chỉ được tính lên hệ thống sau khi bấm Lưu */}
      {!isQuarterLocked && employee && onUpdateEmployeeFields && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          employee.form1Saved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            {employee.form1Saved ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className={`font-extrabold uppercase tracking-wider text-[10px] ${employee.form1Saved ? 'text-emerald-800' : 'text-amber-800'}`}>
                {employee.form1Saved ? 'BIỂU 01 ĐÃ LƯU' : 'BIỂU 01 CHƯA LƯU'}
              </p>
              <p className={`leading-relaxed font-semibold text-xs ${employee.form1Saved ? 'text-emerald-700' : 'text-amber-700'}`}>
                {employee.form1Saved
                  ? `Dữ liệu đã được lưu vào hệ thống${employee.form1SavedDate ? ' lúc ' + employee.form1SavedDate : ''}.`
                  : 'Nhiệm vụ công tác và điểm tự chấm chỉ được tính vào hệ thống sau khi đồng chí bấm "Lưu Biểu 01". Trước khi lưu, điểm mặc định coi như trắng.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateEmployeeFields({ form1Saved: true, form1SavedDate: new Date().toLocaleString('vi-VN') })}
            disabled={!!employee.form1Saved}
            className={`shrink-0 px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
              employee.form1Saved
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs cursor-pointer'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {employee.form1Saved ? 'Đã lưu' : 'Lưu Biểu 01'}
          </button>
        </div>
      )}

      {activeSubTab === 'form01' ? (
        /* STANDARD STATE STYLE FORM 01 SELF-ASSESSMENT WORD-LIKE EDITOR */
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-800">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold uppercase tracking-wider text-[10px]">ĐÂY LÀ "BẢN TỰ KIỂM ĐIỂM, ĐÁNH GIÁ CHẤT LƯỢNG ĐẢNG VIÊN/CÁN BỘ" (MẪU SỐ 01)</p>
              <p className="text-slate-600 leading-relaxed">
                Đồng chí hãy nhập và chỉnh sửa trực tiếp các nhận xét của mình bên dưới theo các tiêu chuẩn quy định của Ban Tổ chức Đảng ủy. Dữ liệu này sẽ được tự động đồng bộ thời gian thực lên hệ thống dữ liệu chung và tích hợp trực tiếp vào <strong>Bản in báo cáo xuất PDF/In ấn chính thức</strong>!
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-6">
            <div className="border-b pb-4 border-slate-100 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">PHẦN I: KẾT QUẢ TỰ ĐÁNH GIÁ CỦA CÁ NHÂN</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Tư tưởng chính trị */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-mono text-[10px]">1</span>
                  Tư tưởng chính trị
                </label>
                <textarea
                  rows={4}
                  disabled={isQuarterLocked}
                  value={getEmpValue('tutuongChinhTri')}
                  onChange={(e) => handleEmpFieldChange('tutuongChinhTri', e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden font-medium text-slate-700 leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                  placeholder="Nhập nội dung tự kiểm điểm tư tưởng chính trị..."
                />
              </div>

              {/* 2. Phẩm chất đạo đức, lối sống */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-mono text-[10px]">2</span>
                  Phẩm chất đạo đức, lối sống
                </label>
                <textarea
                  rows={4}
                  disabled={isQuarterLocked}
                  value={getEmpValue('phamChatDaoDuc')}
                  onChange={(e) => handleEmpFieldChange('phamChatDaoDuc', e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden font-medium text-slate-700 leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                  placeholder="Nhập nội dung tự kiểm điểm đạo đức lối sống..."
                />
              </div>

              {/* 3. Tác phong, lề lối làm việc */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-mono text-[10px]">3</span>
                  Tác phong, lề lối làm việc
                </label>
                <textarea
                  rows={4}
                  disabled={isQuarterLocked}
                  value={getEmpValue('tacPhongLeLoi')}
                  onChange={(e) => handleEmpFieldChange('tacPhongLeLoi', e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden font-medium text-slate-700 leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                  placeholder="Nhập nội dung tự kiểm điểm tác phong lề lối làm việc..."
                />
              </div>

              {/* 4. Ý thức tổ chức kỷ luật */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-mono text-[10px]">4</span>
                  Ý thức tổ chức kỷ luật
                </label>
                <textarea
                  rows={4}
                  disabled={isQuarterLocked}
                  value={getEmpValue('yThucKyLuat')}
                  onChange={(e) => handleEmpFieldChange('yThucKyLuat', e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden font-medium text-slate-700 leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                  placeholder="Nhập nội dung tự kiểm điểm tổ chức kỷ luật..."
                />
              </div>
            </div>

            {/* 10 General Criteria Scores Editor (30 Points) */}
            <div className="border-t pt-6 border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">PHẦN I.1: ĐÁNH GIÁ TIÊU CHÍ CHUNG (TỐI ĐA 30 ĐIỂM)</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Đồng chí hãy chấm điểm cho từng tiêu chí thành phần dưới đây (điểm tối đa 5.0 hoặc 2.5).</p>
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-center shrink-0 shadow-3xs">
                  <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider block">Tổng điểm tiêu chí chung</span>
                  <span className="text-base font-black text-emerald-950 font-mono">
                    {totalCriteriaScore.toFixed(1)} / 30.0
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-4 text-xs text-slate-700">
                {/* Section I */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-800 border-b pb-1 text-[11px] uppercase tracking-wide flex items-center justify-between">
                    <span>I. Phẩm chất chính trị, đạo đức, lối sống, văn hóa công vụ, kỷ luật, kỷ cương</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">Tối đa 10đ</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">1. Chính trị, đạo đức, lối sống, văn hóa công vụ</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 5.0</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        disabled={isQuarterLocked}
                        value={scores.diemI1}
                        onChange={(e) => handleScoreChange('diemI1', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">2. Ý thức tổ chức kỷ luật, kỷ cương</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 5.0</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        disabled={isQuarterLocked}
                        value={scores.diemI2}
                        onChange={(e) => handleScoreChange('diemI2', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Section II */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-extrabold text-slate-800 border-b pb-1 text-[11px] uppercase tracking-wide flex items-center justify-between">
                    <span>II. Năng lực chuyên môn, nghiệp vụ, kết quả nhiệm vụ, tinh thần trách nhiệm, thái độ phục vụ</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">Tối đa 10đ</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">1. Năng lực chuyên môn theo yêu cầu vị trí việc làm</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 2.5</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2.5"
                        disabled={isQuarterLocked}
                        value={scores.diemII1}
                        onChange={(e) => handleScoreChange('diemII1', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">2. Đáp ứng yêu cầu thực thi nhiệm vụ được giao</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 2.5</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2.5"
                        disabled={isQuarterLocked}
                        value={scores.diemII2}
                        onChange={(e) => handleScoreChange('diemII2', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">3. Tinh thần trách nhiệm trong thực thi công vụ</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 2.5</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2.5"
                        disabled={isQuarterLocked}
                        value={scores.diemII3}
                        onChange={(e) => handleScoreChange('diemII3', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">4. Thái độ phục vụ người dân và đồng nghiệp</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 2.5</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2.5"
                        disabled={isQuarterLocked}
                        value={scores.diemII4}
                        onChange={(e) => handleScoreChange('diemII4', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Section III */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-extrabold text-slate-800 border-b pb-1 text-[11px] uppercase tracking-wide flex items-center justify-between">
                    <span>III. Năng lực đổi mới, sáng tạo, dám nghĩ, dám làm, dám chịu trách nhiệm</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">Tối đa 10đ</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">1. Có sản phẩm, giải pháp đột phá, sáng tạo</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 2.5</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2.5"
                        disabled={isQuarterLocked}
                        value={scores.diemIII1}
                        onChange={(e) => handleScoreChange('diemIII1', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">2. Sẵn sàng thực hiện nhiệm vụ chính trị phức tạp</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 2.5</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2.5"
                        disabled={isQuarterLocked}
                        value={scores.diemIII2}
                        onChange={(e) => handleScoreChange('diemIII2', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">3. Tinh thần dám chịu trách nhiệm khắc phục sai sót</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 2.5</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2.5"
                        disabled={isQuarterLocked}
                        value={scores.diemIII3}
                        onChange={(e) => handleScoreChange('diemIII3', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-3xs">
                      <div>
                        <p className="font-bold text-slate-800">4. Chủ động ra quyết định, không né tránh</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Điểm tối đa: 2.5</p>
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="2.5"
                        disabled={isQuarterLocked}
                        value={scores.diemIII4}
                        onChange={(e) => handleScoreChange('diemIII4', e.target.value)}
                        className="w-20 text-center font-mono font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">PHẦN II: HẠN CHẾ, KHUYẾT ĐIỂM & KHẮC PHỤC</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 5. Hạn chế, khuyết điểm & nguyên nhân */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-mono text-[10px]">5</span>
                    Hạn chế, khuyết điểm & nguyên nhân
                  </label>
                  <textarea
                    rows={4}
                    disabled={isQuarterLocked}
                    value={getEmpValue('hanCheKhuyetDiem')}
                    onChange={(e) => handleEmpFieldChange('hanCheKhuyetDiem', e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden font-medium text-slate-700 leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="Nhập khuyết điểm và nguyên nhân của bản thân..."
                  />
                </div>

                {/* 6. Phương hướng, biện pháp khắc phục */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-mono text-[10px]">6</span>
                    Biện pháp khắc phục hạn chế
                  </label>
                  <textarea
                    rows={4}
                    disabled={isQuarterLocked}
                    value={getEmpValue('bienPhapKhacPhuc')}
                    onChange={(e) => handleEmpFieldChange('bienPhapKhacPhuc', e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden font-medium text-slate-700 leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="Nhập phương hướng giải pháp khắc phục..."
                  />
                </div>
              </div>
            </div>

            {/* Self Rating Selection */}
            <div className="border-t pt-6 border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/60 p-4 rounded-2xl">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Tự đề xuất xếp loại chất lượng cán bộ</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Lựa chọn mức độ tự xếp loại dựa trên tổng thể hiệu suất và phẩm chất đạo đức.</p>
              </div>
              <div className="w-full sm:w-auto">
                <select
                  disabled={isQuarterLocked}
                  value={getEmpValue('tuNhanXepLoai')}
                  onChange={(e) => handleEmpFieldChange('tuNhanXepLoai', e.target.value)}
                  className="w-full sm:w-72 bg-white text-xs border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  <option value="Hoàn thành xuất sắc nhiệm vụ">Hoàn thành xuất sắc nhiệm vụ</option>
                  <option value="Hoàn thành tốt nhiệm vụ">Hoàn thành tốt nhiệm vụ</option>
                  <option value="Hoàn thành nhiệm vụ">Hoàn thành nhiệm vụ</option>
                  <option value="Không hoàn thành nhiệm vụ">Không hoàn thành nhiệm vụ</option>
                </select>
              </div>
            </div>
          </div>

          {onNavigateToGrading && (
            <div className="p-6 bg-amber-50 border-2 border-amber-500/35 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-3xs text-left">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-tight">Đồng chí đã tự nhận xét xong biểu mẫu 01?</h4>
                <p className="text-[10px] text-amber-900 font-semibold leading-relaxed">
                  Bản tự kiểm điểm đã được lưu trữ an toàn thời gian thực. Bấm vào nút bên phải để bắt đầu chấm điểm KPI các đầu việc chuyên môn.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToGrading}
                className="w-full sm:w-auto px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2 border border-amber-700 hover:scale-[1.02] duration-150 active:scale-[0.98]"
              >
                Nhập Biểu Chấm Điểm KPI
                <span className="text-sm font-bold">➜</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ORIGINAL DIRECT WORK TABLE (KPI LIST) */
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-800">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold uppercase tracking-wider text-[10px]">Phụ lục: Sổ nhật ký chi tiết & Tự chấm điểm công việc</p>
              <p className="text-slate-600 leading-relaxed">
                Đồng chí có thể click trực tiếp vào bất kỳ ô nào dưới đây để thay đổi: nội dung nhiệm vụ, sản phẩm, mục tiêu số lượng, điểm tự chấm, hoặc thực tế hoàn thành. Hệ thống sẽ tự động cập nhật, tính toán sang <strong>Biểu mẫu 02</strong> và kết xuất KPI tại <strong>Biểu mẫu 03</strong> ngay lập tức!
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px] border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center uppercase tracking-wider text-[10px]">
                    <th className="p-3 border border-slate-200 w-12">TT</th>
                    <th className="p-3 border border-slate-200 text-left min-w-[240px]">Nhiệm vụ tự chấm</th>
                    <th className="p-3 border border-slate-200 text-left w-36">Cấp trình</th>
                    <th className="p-3 border border-slate-200 text-left w-36">Sản phẩm</th>
                    <th className="p-3 border border-slate-200 w-20">Số lượng</th>
                    <th className="p-3 border border-slate-200 w-28">Hạn (Tiến độ)</th>
                    <th className="p-3 border border-slate-200 w-32 text-indigo-900 font-bold bg-indigo-50/20 text-center">Hạn (Ngày)</th>
                    <th className="p-3 border border-slate-200 text-left w-36">Ghi chú</th>
                    <th className="p-3 border border-slate-200 w-24">Điểm tối đa</th>
                    <th className="p-3 border border-slate-200 w-24">Điểm tự chấm (đ)</th>
                    <th className="p-3 border border-slate-200 w-24 bg-indigo-50/40 text-indigo-900 font-bold">Hệ số quy đổi</th>
                    <th className="p-3 border border-slate-200 w-12"></th>
                  </tr>
                  <tr className="bg-slate-50 text-[9px] text-slate-400 font-bold border-b border-slate-200 text-center">
                    <td className="p-1 border border-slate-200">(1)</td>
                    <td className="p-1 border border-slate-200 text-left">(2)</td>
                    <td className="p-1 border border-slate-200 text-left">(3)</td>
                    <td className="p-1 border border-slate-200 text-left">(4)</td>
                    <td className="p-1 border border-slate-200">(5)</td>
                    <td className="p-1 border border-slate-200">(6)</td>
                    <td className="p-1 border border-slate-200 bg-indigo-50/10 font-bold text-indigo-700 text-center">(6b)</td>
                    <td className="p-1 border border-slate-200 text-left">(7)</td>
                    <td className="p-1 border border-slate-200">(8)</td>
                    <td className="p-1 border border-slate-200">(9)</td>
                    <td className="p-1 border border-slate-200 bg-indigo-50/20 font-black text-indigo-700">(10) = (9)/5</td>
                    <td className="p-1 border border-slate-200"></td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTasks.map((task, index) => (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* (1) TT */}
                      <td className="p-2 text-center border border-slate-200 font-mono font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* (2) Nhiệm vụ */}
                      <td className="p-2 border border-slate-200">
                        <textarea
                          rows={2}
                          value={task.mission}
                          disabled={isQuarterLocked}
                          onChange={(e) => handleFieldChange(task, 'mission', e.target.value)}
                          className="w-full text-xs p-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md resize-none font-semibold text-slate-800 leading-normal focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (3) Cấp trình */}
                      <td className="p-2 border border-slate-200">
                        <input
                          type="text"
                          value={task.reportingLevel}
                          placeholder="Cấp trình"
                          disabled={isQuarterLocked}
                          onChange={(e) => handleFieldChange(task, 'reportingLevel', e.target.value)}
                          className="w-full text-xs p-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md font-medium text-slate-600 focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (4) Sản phẩm */}
                      <td className="p-2 border border-slate-200">
                        <input
                          type="text"
                          value={task.productName}
                          placeholder="Sản phẩm"
                          disabled={isQuarterLocked}
                          onChange={(e) => handleFieldChange(task, 'productName', e.target.value)}
                          className="w-full text-xs p-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md font-bold text-slate-700 focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (5) Số lượng */}
                      <td className="p-2 border border-slate-200 text-center">
                        <input
                          type="number"
                          min={0}
                          value={task.targetQuantity}
                          disabled={isQuarterLocked}
                          onChange={(e) => handleFieldChange(task, 'targetQuantity', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 text-center font-mono font-bold text-slate-700 p-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (6) Hạn hoàn thành */}
                      <td className="p-2 border border-slate-200 text-center">
                        <input
                          type="text"
                          value={task.timeline}
                          disabled={isQuarterLocked}
                          onChange={(e) => handleFieldChange(task, 'timeline', e.target.value)}
                          className="w-full text-center text-xs p-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md text-slate-500 font-medium focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (6b) Hạn hoàn thành (Ngày cụ thể) */}
                      <td className="p-2 border border-slate-200 text-center bg-indigo-50/10">
                        <input
                          type="date"
                          value={task.deadlineDate || ''}
                          disabled={isQuarterLocked}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleFieldChange(task, 'deadlineDate', val);
                            if (val) {
                              const parts = val.split('-');
                              if (parts.length === 3) {
                                const [y, m, d] = parts;
                                handleFieldChange(task, 'timeline', `${d}/${m}/${y}`);
                              }
                            }
                          }}
                          className="w-full text-center text-xs p-1 bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-md text-slate-700 font-bold font-mono focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (7) Ghi chú */}
                      <td className="p-2 border border-slate-200">
                        <input
                          type="text"
                          value={task.note || ''}
                          disabled={isQuarterLocked}
                          placeholder="..."
                          onChange={(e) => handleFieldChange(task, 'note', e.target.value)}
                          className="w-full text-xs p-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md text-slate-500 italic focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (8) Điểm tối đa */}
                      <td className="p-2 border border-slate-200 text-center">
                        <input
                          type="number"
                          min={0}
                          value={task.maxScore || 100}
                          disabled={isQuarterLocked}
                          onChange={(e) => handleFieldChange(task, 'maxScore', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 text-center font-mono font-bold text-slate-600 p-1 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (9) Điểm tự chấm */}
                      <td className="p-2 border border-slate-200 text-center">
                        <input
                          type="number"
                          min={0}
                          max={task.maxScore || 500}
                          value={task.assignedScore}
                          disabled={isQuarterLocked}
                          onChange={(e) => handleFieldChange(task, 'assignedScore', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 text-center font-mono font-bold text-indigo-600 p-1 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* (10) Hệ số quy đổi */}
                      <td className="p-2 border border-slate-200 text-center font-mono font-black text-indigo-600 bg-indigo-50/10">
                        {(task.assignedScore / 5).toFixed(1)}
                      </td>

                      {/* Actions (Delete) */}
                      <td className="p-2 border border-slate-200 text-center">
                        <button
                          type="button"
                          disabled={isQuarterLocked}
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title="Xóa đầu việc"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400">
                        Chưa có nhiệm vụ công tác nào được đăng ký. Bấm "Thêm hàng" hoặc áp dụng biểu mẫu mẫu bên dưới để bắt đầu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom row helpers */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                disabled={isQuarterLocked}
                onClick={handleAddQuickRow}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
              >
                <Plus className="w-4 h-4" />
                Thêm hàng trực tiếp (Thêm việc)
              </button>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isQuarterLocked}
                  onClick={onOpenAddModal}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Thêm theo Khung chuẩn
                </button>
                <button
                  type="button"
                  disabled={isQuarterLocked}
                  onClick={onOpenUploadModal}
                  className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 rounded-xl border border-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-50"
                >
                  <FileUp className="w-4 h-4" />
                  Tải tệp Excel tháng
                </button>
              </div>
            </div>
          </div>

          
        </div>
      )}
    </div>
  );
}
