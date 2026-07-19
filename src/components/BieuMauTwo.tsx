import React from 'react';
import { CivilServiceTask, Employee } from '../types';
import { getConvertedFactor, calculateKPIResultSummary } from '../initialData';
import { Info, Calculator, Sparkles, CheckCircle2, Check, AlertCircle } from 'lucide-react';

interface BieuMauTwoProps {
  tasks: CivilServiceTask[];
  employee?: Employee;
  onUpdateEmployeeFields?: (fields: Partial<Employee>) => void;
  onUpdateTask?: (task: CivilServiceTask) => void;
  isQuarterLocked?: boolean;
}

export default function BieuMauTwo({
  tasks,
  employee,
  onUpdateEmployeeFields,
  onUpdateTask,
  isQuarterLocked = false
}: BieuMauTwoProps) {
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

  const summary = calculateKPIResultSummary(filteredTasks);

  const handleFieldChange = (task: CivilServiceTask, field: 'actualQtyCount' | 'actualQualityCount' | 'actualProgressCount', value: number) => {
    if (isQuarterLocked || !onUpdateTask) return;
    const updatedTask = {
      ...task,
      [field]: value
    };
    onUpdateTask(updatedTask);
  };

  return (
    <div id="bieu-mau-2-panel" className="space-y-6">
      {/* Thanh trạng thái Lưu Biểu 02 */}
      {!isQuarterLocked && employee && onUpdateEmployeeFields && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          employee.form2Saved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            {employee.form2Saved ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className={`font-extrabold uppercase tracking-wider text-[10px] ${employee.form2Saved ? 'text-emerald-800' : 'text-amber-800'}`}>
                {employee.form2Saved ? 'BIỂU 02 ĐÃ LƯU' : 'BIỂU 02 CHƯA LƯU'}
              </p>
              <p className={`leading-relaxed font-semibold text-xs ${employee.form2Saved ? 'text-emerald-700' : 'text-amber-700'}`}>
                {employee.form2Saved
                  ? `Kết quả quy đổi KPI đã được lưu vào hệ thống${employee.form2SavedDate ? ' lúc ' + employee.form2SavedDate : ''}.`
                  : 'Kết quả triển khai thực tế chỉ được tính vào hệ thống sau khi đồng chí bấm "Lưu Biểu 02".'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateEmployeeFields({ form2Saved: true, form2SavedDate: new Date().toLocaleString('vi-VN') })}
            disabled={!!employee.form2Saved}
            className={`shrink-0 px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
              employee.form2Saved
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs cursor-pointer'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {employee.form2Saved ? 'Đã lưu' : 'Lưu Biểu 02'}
          </button>
        </div>
      )}

      {/* Dynamic Header Block */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Calculator className="w-6 h-6 shrink-0" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Biểu mẫu 02: Bảng quy đổi chỉ số kpi chi tiết</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Hệ thống liên kết tự động và quy đổi điểm số dựa trên kết quả triển khai công tác thực tế</p>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-100 px-4 py-2 rounded-xl text-[10px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Tính toán tự động 100%
        </div>
      </div>

      {/* Top informational helper alert */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-emerald-800">
        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold uppercase tracking-wider text-[10px]">Hướng dẫn nhập liệu & Quy đổi</p>
          <p className="text-slate-600 leading-relaxed font-medium">
            Đồng chí hãy nhập <strong>kết quả triển khai thực tế</strong> trực tiếp vào các ô thuộc cột <strong>(7), (9), (11)</strong> dưới đây. Điểm quy đổi tương ứng tại cột <strong>(8), (10), (12)</strong> sẽ tự động tính bằng cách nhân với hệ số quy đổi <strong>(5)</strong>. Kết quả tổng hợp cuối cùng sẽ tự động liên kết sang <strong>Biểu mẫu 03</strong>!
          </p>
        </div>
      </div>

      {/* THE 12-COLUMN TABLE EXACTLY AS SHOWN IN THE IMAGE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="text-center space-y-1.5">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            MẪU SỐ 02: BẢNG CHI TIẾT QUY ĐỔI HIỆU SUẤT VÀ TÍNH ĐIỂM KPI
          </h3>
          <p className="text-[11px] text-slate-500 italic font-medium">
            (Đầy đủ 12 cột quy chuẩn theo đúng biểu mẫu thiết kế của đơn vị)
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-[11px] border-collapse min-w-[1100px] border border-slate-200">
            <thead>
              {/* Header Row 1 */}
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center uppercase tracking-wide text-[9.5px]">
                <th className="p-3 border border-slate-200 w-12" rowSpan={2}>TT</th>
                <th className="p-3 border border-slate-200 text-left min-w-[280px]" rowSpan={2}>NHIỆM VỤ THỰC HIỆN</th>
                <th className="p-3 border border-slate-200 text-left w-36" rowSpan={2}>Sản phẩm</th>
                <th className="p-3 border border-slate-200 w-16" rowSpan={2}>Số lượng</th>
                <th className="p-3 border border-slate-200 w-20" rowSpan={2}>Hệ số quy đổi</th>
                <th className="p-3 border border-slate-200 w-24 bg-slate-50" rowSpan={2}>Số lượng quy đổi</th>
                <th className="p-2 border border-slate-200 bg-indigo-50/50" colSpan={2}>KPI SỐ LƯỢNG</th>
                <th className="p-2 border border-slate-200 bg-emerald-50/50" colSpan={2}>KPI CHẤT LƯỢNG</th>
                <th className="p-2 border border-slate-200 bg-amber-50/50" colSpan={2}>KPI TIẾN ĐỘ</th>
              </tr>
              {/* Header Row 2 */}
              <tr className="bg-slate-50 text-[9px] text-slate-500 border-b border-slate-300 text-center uppercase tracking-wider">
                <th className="p-1 border border-slate-300 bg-indigo-50/20 w-16">Thực tế</th>
                <th className="p-1 border border-slate-300 bg-indigo-50/20 font-bold text-indigo-700 w-20">Quy đổi</th>
                <th className="p-1 border border-slate-300 bg-emerald-50/20 w-16">Thực tế</th>
                <th className="p-1 border border-slate-300 bg-emerald-50/20 font-bold text-emerald-700 w-20">Quy đổi</th>
                <th className="p-1 border border-slate-300 bg-amber-50/20 w-16">Thực tế</th>
                <th className="p-1 border border-slate-300 bg-amber-50/20 font-bold text-amber-700 w-20">Quy đổi</th>
              </tr>
              {/* Formula and Index Row */}
              <tr className="bg-slate-100 text-[9px] text-slate-400 font-bold border-b border-slate-300 text-center">
                <td className="p-1 border border-slate-300 font-mono font-bold text-slate-400">(1)</td>
                <td className="p-1 border border-slate-300 text-left">(2)</td>
                <td className="p-1 border border-slate-300 text-left">(3)</td>
                <td className="p-1 border border-slate-300">(4)</td>
                <td className="p-1 border border-slate-300">(5)</td>
                <td className="p-1 border border-slate-300 bg-slate-50">(6) = (4)x(5)</td>
                <td className="p-1 border border-slate-300 bg-indigo-50/10">(7)</td>
                <td className="p-1 border border-slate-300 bg-indigo-50/10 font-bold text-indigo-700">(8) = (7)x(5)</td>
                <td className="p-1 border border-slate-300 bg-emerald-50/10">(9)</td>
                <td className="p-1 border border-slate-300 bg-emerald-50/10 font-bold text-emerald-700">(10) = (9)x(5)</td>
                <td className="p-1 border border-slate-300 bg-amber-50/10">(11)</td>
                <td className="p-1 border border-slate-300 bg-amber-50/10 font-bold text-amber-700">(12) = (11)x(5)</td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTasks.map((task, index) => {
                const factor = getConvertedFactor(task);
                const targetConverted = task.targetQuantity * factor;
                const qtyConverted = task.actualQtyCount * factor;
                const qualConverted = task.actualQualityCount * factor;
                const progConverted = task.actualProgressCount * factor;

                return (
                  <tr key={task.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* (1) TT */}
                    <td className="p-2 text-center border border-slate-200 font-mono text-slate-400 font-bold">
                      {index + 1}
                    </td>

                    {/* (2) Nhiệm vụ */}
                    <td className="p-2 border border-slate-200 text-slate-800 font-semibold leading-relaxed">
                      {task.mission}
                    </td>

                    {/* (3) Sản phẩm */}
                    <td className="p-2 border border-slate-200 text-slate-700 font-bold">
                      {task.productName}
                    </td>

                    {/* (4) Số lượng */}
                    <td className="p-2 text-center border border-slate-200 font-mono font-bold text-slate-800">
                      {task.targetQuantity}
                    </td>

                    {/* (5) Hệ số quy đổi */}
                    <td className="p-2 text-center border border-slate-200 font-mono font-bold text-slate-600">
                      {factor.toFixed(1)}
                    </td>

                    {/* (6) Số lượng quy đổi */}
                    <td className="p-2 text-center border border-slate-200 font-mono font-extrabold text-slate-800 bg-slate-50">
                      {targetConverted.toFixed(1)}
                    </td>

                    {/* (7) KPI Số lượng - Thực tế */}
                    <td className="p-1.5 border border-slate-200 text-center bg-indigo-50/10">
                      <input
                        type="number"
                        min={0}
                        disabled={isQuarterLocked || !onUpdateTask}
                        value={task.actualQtyCount}
                        onChange={(e) => handleFieldChange(task, 'actualQtyCount', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-14 text-center font-mono font-extrabold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-md focus:outline-hidden disabled:opacity-80 disabled:bg-slate-100 disabled:cursor-not-allowed py-1"
                      />
                    </td>

                    {/* (8) KPI Số lượng - Quy đổi */}
                    <td className="p-2 text-center border border-slate-200 bg-indigo-50/20 font-mono font-extrabold text-indigo-700">
                      {qtyConverted.toFixed(1)}
                    </td>

                    {/* (9) KPI Chất lượng - Thực tế */}
                    <td className="p-1.5 border border-slate-200 text-center bg-emerald-50/10">
                      <input
                        type="number"
                        min={0}
                        disabled={isQuarterLocked || !onUpdateTask}
                        value={task.actualQualityCount}
                        onChange={(e) => handleFieldChange(task, 'actualQualityCount', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-14 text-center font-mono font-extrabold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 rounded-md focus:outline-hidden disabled:opacity-80 disabled:bg-slate-100 disabled:cursor-not-allowed py-1"
                      />
                    </td>

                    {/* (10) KPI Chất lượng - Quy đổi */}
                    <td className="p-2 text-center border border-slate-200 bg-emerald-50/20 font-mono font-extrabold text-emerald-700">
                      {qualConverted.toFixed(1)}
                    </td>

                    {/* (11) KPI Tiến độ - Thực tế */}
                    <td className="p-1.5 border border-slate-200 text-center bg-amber-50/10">
                      <input
                        type="number"
                        min={0}
                        disabled={isQuarterLocked || !onUpdateTask}
                        value={task.actualProgressCount}
                        onChange={(e) => handleFieldChange(task, 'actualProgressCount', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-14 text-center font-mono font-extrabold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 rounded-md focus:outline-hidden disabled:opacity-80 disabled:bg-slate-100 disabled:cursor-not-allowed py-1"
                      />
                    </td>

                    {/* (12) KPI Tiến độ - Quy đổi */}
                    <td className="p-2 text-center border border-slate-200 bg-amber-50/20 font-mono font-extrabold text-amber-700">
                      {progConverted.toFixed(1)}
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    Chưa có dữ liệu. Vui lòng kê khai đầu việc tại Biểu mẫu 01.
                  </td>
                </tr>
              )}

              {/* Total Row */}
              {filteredTasks.length > 0 && (
                <tr className="bg-indigo-50/30 font-black border-t-2 border-slate-300 text-[10px] uppercase text-slate-800">
                  <td colSpan={3} className="p-3 text-right border border-slate-200 font-extrabold text-slate-500">
                    TỔNG CỘNG:
                  </td>
                  
                  {/* (4) Target Quantity Sum */}
                  <td className="p-3 text-center border border-slate-200 font-mono text-slate-900 text-xs font-black">
                    {summary.totalTargetQty}
                  </td>
                  
                  {/* (5) Factor Blank */}
                  <td className="p-3 border border-slate-200 bg-slate-50/50"></td>

                  {/* (6) Target Converted Sum */}
                  <td className="p-3 text-center border border-slate-200 font-mono text-slate-900 text-xs font-black bg-slate-100">
                    {summary.totalTargetConverted.toFixed(1)}
                  </td>

                  {/* (7) Actual Qty Sum */}
                  <td className="p-3 text-center border border-slate-200 font-mono text-slate-700 bg-indigo-50/5">
                    {summary.totalQtyActual}
                  </td>

                  {/* (8) Converted Qty Sum */}
                  <td className="p-3 text-center border border-slate-200 font-mono text-indigo-700 text-xs font-black bg-indigo-100/40">
                    {summary.totalQtyConverted.toFixed(1)}
                  </td>

                  {/* (9) Actual Quality Sum */}
                  <td className="p-3 text-center border border-slate-200 font-mono text-slate-700 bg-emerald-50/5">
                    {summary.totalQualityActual}
                  </td>

                  {/* (10) Converted Quality Sum */}
                  <td className="p-3 text-center border border-slate-200 font-mono text-emerald-700 text-xs font-black bg-emerald-100/40">
                    {summary.totalQualityConverted.toFixed(1)}
                  </td>

                  {/* (11) Actual Progress Sum */}
                  <td className="p-3 text-center border border-slate-200 font-mono text-slate-700 bg-amber-50/5">
                    {summary.totalProgressActual}
                  </td>

                  {/* (12) Converted Progress Sum */}
                  <td className="p-3 text-center border border-slate-200 font-mono text-amber-700 text-xs font-black bg-amber-100/40">
                    {summary.totalProgressConverted.toFixed(1)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Math formula visualizer */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tóm tắt thuật toán tổng hợp</p>
          <div className="flex flex-wrap items-center gap-1 text-slate-600 font-medium text-xs">
            <span>Tỷ lệ Đạt KPI = </span>
            <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm font-mono text-[10.5px]">Tổng Quy Đổi Thực Tế</span>
            <span>/</span>
            <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm font-mono text-[10.5px]">Tổng Quy Đổi Mục Tiêu</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 shrink-0 text-center">
          <div className="bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/50 min-w-28">
            <span className="text-[9px] text-indigo-600 font-extrabold uppercase">Tỷ lệ Số Lượng</span>
            <p className="font-mono text-sm font-black text-indigo-700 mt-0.5">{summary.qtyKPIPercentage.toFixed(2)}%</p>
          </div>
          <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/50 min-w-28">
            <span className="text-[9px] text-emerald-600 font-extrabold uppercase">Tỷ lệ Chất Lượng</span>
            <p className="font-mono text-sm font-black text-emerald-700 mt-0.5">{summary.qualityKPIPercentage.toFixed(2)}%</p>
          </div>
          <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/50 min-w-28">
            <span className="text-[9px] text-amber-600 font-extrabold uppercase">Tỷ lệ Tiến Độ</span>
            <p className="font-mono text-sm font-black text-amber-700 mt-0.5">{summary.progressKPIPercentage.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
