import { Employee } from '../types';
import { calculateKPIResultSummary } from '../initialData';
import { CheckCircle2, Clock, AlertTriangle, FileText, Award } from 'lucide-react';

interface ApprovePageProps {
  pendingEmployees: Employee[];
  onSelectEmployee: (id: string) => void;
  currentUser: Employee | null;
}

export default function ApprovePage({ pendingEmployees, onSelectEmployee, currentUser }: ApprovePageProps) {
  if (pendingEmployees.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-3">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase">Không có hồ sơ chờ duyệt</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">Tất cả cán bộ {currentUser?.department ? `thuộc ${currentUser.department}` : ''} đã được phê duyệt hoặc chưa gửi yêu cầu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
        <div>
          <p className="text-xs font-black uppercase text-amber-900">Có {pendingEmployees.length} hồ sơ chờ phê duyệt</p>
          <p className="text-[11px] text-amber-800">Bấm vào tên cán bộ để xem chi tiết Biểu 01-02-03 và ký duyệt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingEmployees.map(emp => {
          const summary = calculateKPIResultSummary(emp.tasks);
          return (
            <div key={emp.id} onClick={() => onSelectEmployee(emp.id)} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-amber-300 hover:shadow-md cursor-pointer transition-all group">
              <div className="flex items-start gap-3">
                <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover border" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-700">{emp.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{emp.role} • {emp.department}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-full">{summary.overallTaskPerformanceScore.toFixed(1)}% KPI</span>
                    <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1"><Clock className="w-3 h-3" /> CHỜ DUYỆT</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {emp.tasks.length} đầu việc</span>
                <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {emp.form1SavedDate || 'Vừa gửi'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
