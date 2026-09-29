function downloadBlob(filename: string, content: Blob) {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function exportFeeRowsToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  downloadBlob(filename, new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
}

export async function exportFeeRowsToExcel(
  filename: string,
  sheetName: string,
  title: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const XLSX = await import('xlsx');
  const sheetRows: (string | number)[][] = [[title], [], headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws['!cols'] = headers.map((header, index) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[index] ?? '').length), header.length);
    return { wch: Math.min(Math.max(longest + 2, 12), 40) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}
