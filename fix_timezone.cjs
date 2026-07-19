const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(task && task\.deadlineDate\) \{\s*const parsed = new Date\(task\.deadlineDate\);\s*if \(\!isNaN\(parsed\.getTime\(\)\)\) \{\s*return parsed;\s*\}\s*\}/;

const replacement = `if (task && task.deadlineDate) {
      const parts = task.deadlineDate.split('-');
      if (parts.length >= 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
      const parsed = new Date(task.deadlineDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
