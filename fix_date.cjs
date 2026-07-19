const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update signature
code = code.replace(/const getTaskDeadlineDate = \(taskId: string, timeline: string, task\?: CivilServiceTask\): Date => \{/, `const getTaskDeadlineDate = (taskId: string, timeline: string, task?: CivilServiceTask): Date | null => {`);

// Update fallback
code = code.replace(/return new Date\(2026, 6, 15\); \/\/ Fallback to July 15/, `return null; // Fallback to no deadline`);

// Update line 511 caller
code = code.replace(/const deadlineDate = getTaskDeadlineDate\(task\.id, task\.timeline, task\);\s*if \(deadlineDate\.getFullYear\(\) === yearNum && deadlineDate\.getMonth\(\) === monthNum && deadlineDate\.getDate\(\) === dayNum\) \{/g, `const deadlineDate = getTaskDeadlineDate(task.id, task.timeline, task);
        if (deadlineDate && deadlineDate.getFullYear() === yearNum && deadlineDate.getMonth() === monthNum && deadlineDate.getDate() === dayNum) {`);

// Update line 2471 caller
code = code.replace(/const d = getTaskDeadlineDate\(task\.id, task\.timeline, task\);\s*return d\.getFullYear\(\) === selectedCalendarYear && d\.getMonth\(\) === selectedCalendarMonth && d\.getDate\(\) === selectedCalendarDay;/g, `const d = getTaskDeadlineDate(task.id, task.timeline, task);
                                 if (!d) return false;
                                 return d.getFullYear() === selectedCalendarYear && d.getMonth() === selectedCalendarMonth && d.getDate() === selectedCalendarDay;`);

fs.writeFileSync('src/App.tsx', code);
