const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                              <button
                                onClick={() => setUploadModalType('tasks')}
                                className="flex-1 px-3.5 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 bg-amber-100/50 rounded-lg border border-amber-300 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-3xs"
                                                      {/* CHỌN KHỐI BIỂU MẪU CHÍNH (BIỂU MẪU 01 VS CHẤM ĐIỂM KPI) */}`;

const replacement = `                              <button
                                onClick={() => setUploadModalType('tasks')}
                                className="flex-1 px-3.5 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 bg-amber-100/50 rounded-lg border border-amber-300 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-3xs"
                                title="Tải lên tệp báo cáo công việc tháng"
                              >
                                <FileUp className="w-4 h-4 text-emerald-600" />
                                Tải Lên KPI
                              </button>
                            </div>

                            <button
                              onClick={() => setIsAddingTask(true)}
                              className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs border border-amber-700 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                              Thêm Đầu Việc
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Banner cảnh báo lọc Lịch tháng */}
                      {selectedCalendarDay !== null && (
                        <div className="bg-emerald-50 border-2 border-emerald-400/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left animate-fade-in shadow-3xs mb-6">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800 mt-0.5">
                              <Calendar className="w-5 h-5 shrink-0" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                                Đang lọc theo lịch báo cáo ngày {selectedCalendarDay.toString().padStart(2, '0')}/{(selectedCalendarMonth + 1).toString().padStart(2, '0')}/{selectedCalendarYear}
                              </h4>
                              <p className="text-[11px] text-emerald-900 font-semibold leading-normal mt-0.5">
                                Các bảng biểu mẫu bên dưới đang chỉ hiển thị các đầu việc / báo cáo có thời hạn đúng vào ngày {selectedCalendarDay} tháng {(selectedCalendarMonth + 1).toString().padStart(2, '0')} năm {selectedCalendarYear}.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedCalendarDay(null)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-3xs shrink-0 self-start sm:self-auto"
                          >
                            Hiển thị tất cả đầu việc
                          </button>
                        </div>
                      )}

                      {/* CHỌN KHỐI BIỂU MẪU CHÍNH (BIỂU MẪU 01 VS CHẤM ĐIỂM KPI) */}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
