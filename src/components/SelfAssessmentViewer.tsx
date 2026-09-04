import React, { useState } from 'react';
import { FileText, Search, Trash2, Eye, User as UserIcon, Calendar, FileCode } from 'lucide-react';
import { SelfAssessmentDoc } from '../types';

interface SelfAssessmentViewerProps {
  docs: SelfAssessmentDoc[];
  onDeleteDoc: (id: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const SelfAssessmentViewer: React.FC<SelfAssessmentViewerProps> = ({
  docs = [],
  onDeleteDoc,
  addToast,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<SelfAssessmentDoc | null>(
    (docs || []).length > 0 ? docs[0] : null
  );
  const [searchKey, setSearchKey] = useState('');
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; name: string } | null>(null);

  const filteredDocs = (docs || []).filter(
    (d) =>
      d.fileName.toLowerCase().includes(searchKey.toLowerCase()) ||
      d.userName.toLowerCase().includes(searchKey.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
        setDeleteConfirmDoc({ id, name });
      };
      
      const confirmDelete = () => {
        if (deleteConfirmDoc) {
          onDeleteDoc(deleteConfirmDoc.id);
          if (selectedDoc?.id === deleteConfirmDoc.id) {
            setSelectedDoc(docs.find((d) => d.id !== deleteConfirmDoc.id) || null);
          }
          addToast('info', 'Đã xóa bản tự nhận xét', `Đã xóa file ${deleteConfirmDoc.name}.`);
          setDeleteConfirmDoc(null);
        }
      };

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Danh Sách Bản Tự Nhận Xét Cá Nhân (Tệp Word .docx)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Nội dung tự đánh giá cá nhân trích xuất tự động từ các file Word đã tải lên.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document List (Left 5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Tìm file Word tự nhận xét..."
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                Chưa có bản tự nhận xét Word nào. Bạn có thể tải lên ở tab "Tải lên & Ánh xạ".
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {doc.fileName}
                          </h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <UserIcon className="w-3 h-3 text-indigo-500" />
                            <span>{doc.userName}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id, doc.fileName);
                        }}
                        className="flex items-center justify-center p-1 text-slate-400 rounded shadow-sm hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{doc.uploadDate}</span>
                      <span>{doc.wordCount} từ</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Document Content View (Right 7 Cols) */}
        <div className="lg:col-span-7">
          {selectedDoc ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    {selectedDoc.fileName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>Tác giả: <strong className="text-slate-800 dark:text-slate-200">{selectedDoc.userName}</strong></span>
                    <span>•</span>
                    <span>Ngày tải lên: {selectedDoc.uploadDate}</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {selectedDoc.wordCount} từ
                </span>
              </div>

              {/* Text content preview */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto custom-scrollbar">
                {selectedDoc.extractedContent}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center text-slate-400">
              <Eye className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Chọn một văn bản tự nhận xét ở cột bên trái để đọc chi tiết nội dung.</p>
            </div>
          )}
        </div>
      </div>
    
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xác nhận xóa</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Bạn có chắc chắn muốn xóa văn bản tự nhận xét "<strong>{deleteConfirmDoc.name}</strong>"?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmDoc(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
