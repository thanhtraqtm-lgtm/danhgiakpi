import { useState, FormEvent } from 'react';
import { CivilServiceTask } from '../types';
import { X, Plus, AlertCircle, FileText } from 'lucide-react';

interface KPIModalProps {
  onClose: () => void;
  onAddTask: (task: CivilServiceTask) => void;
}

export default function KPIModal({ onClose, onAddTask }: KPIModalProps) {
  const [mission, setMission] = useState('');
  const [reportingLevel, setReportingLevel] = useState('Lãnh đạo đơn vị');
  const [productName, setProductName] = useState('Báo cáo');
  const [targetQuantity, setTargetQuantity] = useState<number>(1);
  const [timeline, setTimeline] = useState('Hằng tháng');
  const [note, setNote] = useState('Nhiệm vụ nghiệp vụ');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [assignedScore, setAssignedScore] = useState<number>(0);
  const [taskType, setTaskType] = useState<'Định kỳ' | 'Phát sinh' | 'Đột xuất'>('Định kỳ');
  const [deadlineDate, setDeadlineDate] = useState<string>(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '2026-07-17';
    }
  });
  const [error, setError] = useState('');

  // Handle maxScore changing to auto-align assignedScore defaults
  const handleMaxScoreChange = (score: number) => {
    setMaxScore(score);
    // Align with standard 90% scoring defaults
    if (score === 100) setAssignedScore(90);
    else if (score === 200) setAssignedScore(180);
    else if (score === 400) setAssignedScore(360);
    else setAssignedScore(Math.round(score * 0.9));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!mission.trim()) {
      setError('Vui lòng nhập nội dung nhiệm vụ.');
      return;
    }
    if (!productName.trim()) {
      setError('Vui lòng nhập tên sản phẩm.');
      return;
    }
    if (targetQuantity <= 0) {
      setError('Số lượng mục tiêu phải lớn hơn 0.');
      return;
    }
    if (assignedScore > maxScore) {
      setError('Điểm chấm công việc không được vượt quá điểm tối đa.');
      return;
    }

    const newTask: CivilServiceTask = {
      id: `task-custom-${Date.now()}`,
      mission,
      reportingLevel,
      productName,
      targetQuantity: Number(targetQuantity),
      timeline,
      note,
      maxScore: Number(maxScore),
      assignedScore: Number(assignedScore),
      actualQtyCount: Number(targetQuantity), // Default actuals fully completed
      actualQualityCount: Number(targetQuantity),
      actualProgressCount: Number(targetQuantity),
      taskType,
      deadlineDate: deadlineDate || undefined
    };

    onAddTask(newTask);
    onClose();
  };

  return (
    <div id="kpi-creation-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Thêm Nhiệm Vụ & Sản Phẩm Mới</h3>
              <p className="text-[10px] text-slate-400">Thiết lập mục tiêu quy đổi điểm hành chính theo quy chuẩn mới</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-start gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mission */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nội dung nhiệm vụ <span className="text-red-500">*</span>
            </label>
            <textarea 
              rows={2}
              required
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="VD: Báo cáo định kỳ công tác tháng của Ban chuyên môn..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* Reporting Level & Product Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cấp trình <span className="text-red-500">*</span>
              </label>
              <select
                value={reportingLevel}
                onChange={(e) => setReportingLevel(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              >
                <option value="Lãnh đạo đơn vị">Lãnh đạo đơn vị</option>
                <option value="Bí thư chi bộ">Bí thư chi bộ</option>
                <option value="Đảng ủy Bộ Tài chính">Đảng ủy Bộ Tài chính</option>
                <option value="Ban Thường vụ">Ban Thường vụ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sản phẩm đầu ra <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="VD: Báo cáo, Tờ trình, Nghị quyết..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Phân loại công việc */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Phân loại công việc <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Định kỳ', 'Phát sinh', 'Đột xuất'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTaskType(type)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                    taskType === type
                      ? type === 'Định kỳ'
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold ring-1 ring-blue-100'
                        : type === 'Phát sinh'
                        ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold ring-1 ring-purple-100'
                        : 'bg-rose-50 border-rose-200 text-rose-700 font-bold ring-1 ring-rose-100'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Target Quantity & Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số lượng mục tiêu
              </label>
              <input 
                type="number"
                min="1"
                required
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tiến độ (Mô tả hạn)
              </label>
              <input 
                type="text"
                required
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="VD: Hằng tháng, Hằng quý, 6 tháng..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Ngày hạn hoàn thành cụ thể */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 text-indigo-700">
              Hạn hoàn thành (Ngày cụ thể) <span className="text-red-500">*</span>
            </label>
            <input 
              type="date"
              required
              value={deadlineDate}
              onChange={(e) => {
                const val = e.target.value;
                setDeadlineDate(val);
                if (val) {
                  const parts = val.split('-');
                  if (parts.length === 3) {
                    const [y, m, d] = parts;
                    setTimeline(`${d}/${m}/${y}`);
                  }
                }
              }}
              className="w-full text-xs p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white font-mono font-bold text-indigo-950"
            />
            <p className="text-[10px] text-indigo-600 mt-1">
              Chọn ngày cụ thể để tự động đồng bộ liên kết sang <strong>Lịch tháng báo cáo</strong> (VD: Chọn 08/05/2025 để đồng bộ sang lịch).
            </p>
          </div>

          {/* Scoring Setup */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Khung điểm tối đa (Max Score)
              </label>
              <select
                value={maxScore}
                onChange={(e) => handleMaxScoreChange(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white font-mono"
              >
                <option value={100}>100 điểm</option>
                <option value={200}>200 điểm</option>
                <option value={400}>400 điểm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Điểm tự chấm ban đầu
              </label>
              <input 
                type="number"
                min="1"
                max={maxScore}
                required
                value={assignedScore}
                onChange={(e) => setAssignedScore(Math.min(Number(e.target.value), maxScore))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white font-mono font-bold text-indigo-600"
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-medium bg-indigo-50/50 p-2.5 rounded-lg flex items-center justify-between">
            <span>Hệ số quy đổi dự kiến: <strong>{(assignedScore / 5).toFixed(1)}</strong></span>
            <span>Số lượng quy đổi MT: <strong>{(targetQuantity * (assignedScore / 5)).toFixed(1)}</strong></span>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ghi chú thêm
            </label>
            <input 
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Công việc chuẩn, Nghị quyết..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Xác nhận thêm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
