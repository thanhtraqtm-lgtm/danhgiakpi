const fs = require('fs');
let code = fs.readFileSync('src/components/ExcelUploadModal.tsx', 'utf8');

// 1. Remove expectedTaskHeaders
code = code.replace(/const expectedTaskHeaders = \[[^\]]+\];\s*/, '');

// 2. Remove else if (layout === 'full-kpi') { ... }
code = code.replace(/\} else if \(layout === 'full-kpi'\) \{[\s\S]*?(?=\} else if \(layout === 'tracking'\) \{)/, '} ');

// 3. Update downloadTemplate type signature
code = code.replace(/layout\?: 'image-based' \| 'full-kpi' \| 'tracking'/, `layout?: 'image-based' | 'tracking'`);

// 4. Remove UI description for 13 columns
code = code.replace(/<div className="border-l-2 border-slate-450 pl-2\.5">\s*<span className="font-bold text-slate-650 block text-\[10px\] uppercase tracking-wider mb-1">Cấu trúc Bản đầy đủ KPI \(13 Cột\):<\/span>\s*<div className="flex flex-wrap gap-1">\s*\{expectedTaskHeaders\.map\(\(h, i\) => \(\s*<span key=\{i\} className="bg-slate-100 border border-slate-200 text-slate-650 px-1\.5 py-0\.5 rounded font-mono text-\[9px\]">\s*\{h\}\s*<\/span>\s*\)\)\}\s*<\/div>\s*<\/div>\s*/, '');

// 5. Remove button for downloading 13 columns
code = code.replace(/<button\s*type="button"\s*onClick=\{\(\) => downloadTemplate\('full-kpi'\)\}[\s\S]*?Tải mẫu Đầy đủ 13 cột \(\.xlsx\)[\s\S]*?<\/button>\s*/, '');

fs.writeFileSync('src/components/ExcelUploadModal.tsx', code);
