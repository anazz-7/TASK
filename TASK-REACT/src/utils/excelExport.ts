import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1'): void {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    console.error('Failed to export Excel file:', err);
  }
}
