const fs = require('fs');
let code = fs.readFileSync('src/components/ExcelUploadModal.tsx', 'utf8');

// Replace `} else if (layout === 'full-kpi') {` with `} else {`
code = code.replace(/\} else if \(layout === 'full-kpi'\) \{/, `} else {`);

// Remove `const hasFullKPI = ...; const isImageBased = !hasFullKPI;` and just define `const isImageBased = true;` or let's remove references to `isImageBased` if possible, but for now:
code = code.replace(/const hasFullKPI = [^\n]+;\n\s*const isImageBased = !hasFullKPI;/, `const isImageBased = true;`);

// Remove the `isImageBased` ternary for layoutName
code = code.replace(/const layoutName = isImageBased \? 'Bản Mẫu Ảnh \(10 cột\)' : 'Bản Đầy đủ KPI \(13 cột\)';/, `const layoutName = 'Bản mẫu (10 cột)';`);

fs.writeFileSync('src/components/ExcelUploadModal.tsx', code);
