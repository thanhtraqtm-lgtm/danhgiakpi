export const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  if (/^\d+(\.\d+)?$/.test(dateStr)) {
    const num = parseFloat(dateStr);
    if (num > 20000 && num < 60000) { 
       const excelEpoch = new Date(1899, 11, 30); 
       const dateObj = new Date(excelEpoch.getTime() + num * 86400000); 
       const d = String(dateObj.getDate()).padStart(2, '0'); 
       const m = String(dateObj.getMonth() + 1).padStart(2, '0'); 
       const y = dateObj.getFullYear(); 
       return `${d}/${m}/${y}`;
    }
  }
  // Handle YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(dateStr)) {
    const parts = dateStr.split(/[\/-]/);
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  
  // Handle DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(dateStr)) {
    const parts = dateStr.split(/[\/-]/);
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }

  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

export const formatWeekRange = (start: Date) => {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};
