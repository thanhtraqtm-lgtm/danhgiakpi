import React, { useState, useRef } from 'react';
import { Plus, Save, Trash2, List, FileText, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseExcelFile } from '../utils/excelParser';

interface FormColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
}

interface CustomForm {
  id: string;
  name: string;
  columns: FormColumn[];
  createdAt: string;
}

export const FormBuilderSection: React.FC<{ onDataUploaded?: (formName: string, data: any[]) => void }> = ({ onDataUploaded }) => {
  const [forms, setForms] = useState<CustomForm[]>(() => {
    const saved = localStorage.getItem('kpi_admin_forms_v1');
    return saved ? JSON.parse(saved) : [];
  });
  
  React.useEffect(() => {
    localStorage.setItem('kpi_admin_forms_v1', JSON.stringify(forms));
  }, [forms]);
  const [formName, setFormName] = useState('');
  const [columns, setColumns] = useState<FormColumn[]>([]);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<'text' | 'number' | 'date' | 'select'>('text');

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    setColumns([
      ...columns,
      { id: Date.now().toString(), name: newColName.trim(), type: newColType }
    ]);
    setNewColName('');
  };

  const handleRemoveColumn = (id: string) => {
    setColumns(columns.filter(c => c.id !== id));
  };

  const handleSaveForm = () => {
    if (!formName.trim() || columns.length === 0) return;
    const newForm: CustomForm = {
      id: Date.now().toString(),
      name: formName.trim(),
      columns,
      createdAt: new Date().toISOString()
    };
    setForms([...forms, newForm]);
    setFormName('');
    setColumns([]);
  };

  
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const handleTriggerUpload = (formId: string) => {
    setSelectedFormId(formId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFormId) return;

    const form = forms.find(f => f.id === selectedFormId);
    if (!form) return;

    try {
      const parsed = await parseExcelFile(file, 'template');
      const data = parsed.allRows;
      if (onDataUploaded) onDataUploaded(form.name, data as any[]);
      else alert(`Đã tải lên thành công ${data.length} dòng dữ liệu cho biểu mẫu ${form.name}`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đọc file Excel');
    }

    e.target.value = '';
    setSelectedFormId(null);
  };

const handleDeleteForm = (id: string) => {
    setForms(forms.filter(f => f.id !== id));
  };

  const handleDownloadTemplate = (form: CustomForm) => {
    // Create header row
    const headers = form.columns.map(col => col.name);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    // Set some column widths
    const colWidths = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    // Safe filename
    const safeName = form.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(wb, `Mau_${safeName}.xlsx`);
  };


  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-indigo-500" />
          Tạo Biểu Mẫu / Danh Sách Mới
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên Biểu Mẫu / Danh Sách
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="VD: Danh sách công việc dự án..."
              className="w-full md:w-1/2 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Thêm Cột Dữ Liệu
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                placeholder="Tên cột (VD: Ngày hoàn thành)"
                className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
              <select
                value={newColType}
                onChange={(e) => setNewColType(e.target.value as any)}
                className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm w-full sm:w-40"
              >
                <option value="text">Văn bản</option>
                <option value="number">Số</option>
                <option value="date">Ngày tháng</option>
                <option value="select">Lựa chọn</option>
              </select>
              <button
                onClick={handleAddColumn}
                disabled={!newColName.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm Cột
              </button>
            </div>
          </div>

          {columns.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                Cấu Trúc Biểu Mẫu Hiện Tại:
              </h3>
              <div className="flex flex-wrap gap-2">
                {columns.map(col => (
                  <div key={col.id} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-sm border border-indigo-100 dark:border-indigo-800">
                    <span className="font-semibold">{col.name}</span>
                    <span className="text-xs opacity-70 bg-indigo-100 dark:bg-indigo-800 px-1.5 rounded">
                      {col.type}
                    </span>
                    <button onClick={() => handleRemoveColumn(col.id)} className="ml-1 text-indigo-400 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSaveForm}
              disabled={!formName.trim() || columns.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Save className="w-4 h-4" />
              Lưu Biểu Mẫu
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
      {forms.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <List className="w-5 h-5 text-emerald-500" />
            Danh Sách Biểu Mẫu Đã Lưu
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {forms.map(form => (
              <div key={form.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">{form.name}</h3>
                  
                  <button onClick={() => handleDeleteForm(form.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Xóa biểu mẫu">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(form.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDownloadTemplate(form)} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/50 px-2 py-1 rounded transition-colors font-medium" title="Tải mẫu">
                      <Download className="w-3.5 h-3.5" />
                      Tải mẫu
                    </button>
                    <button onClick={() => handleTriggerUpload(form.id)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50 px-2 py-1 rounded transition-colors font-medium" title="Tải dữ liệu lên">
                      <Upload className="w-3.5 h-3.5" />
                      Tải lên
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {form.columns.map(col => (
                    <div key={col.id} className="text-xs flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-700 last:border-0">
                      <span className="text-slate-700 dark:text-slate-300">{col.name}</span>
                      <span className="text-slate-400">{col.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
