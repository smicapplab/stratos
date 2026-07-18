/**
 * Dynamically imports SheetJS (xlsx) and exports a JSON array of rows to a downloaded Excel file.
 */
export async function exportToExcel(filename: string, rows: Record<string, unknown>[]): Promise<void> {
	if (rows.length === 0) return;

	const XLSX = await import('xlsx');
	const worksheet = XLSX.utils.json_to_sheet(rows);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

	XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
