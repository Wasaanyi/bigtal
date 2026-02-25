import { dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface ExportColumn {
  key: string;
  header: string;
}

/**
 * Converts an array of objects to CSV format
 */
function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[]
): string {
  // Header row
  const header = columns.map((col) => `"${col.header}"`).join(',');

  // Data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (typeof value === 'number') {
          return value.toString();
        }
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Shows save dialog and exports data to CSV
 */
export async function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  defaultFileName: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export to CSV',
      defaultPath: defaultFileName,
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (canceled || !filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    const csv = convertToCSV(data, columns);

    // Ensure file has .csv extension
    const finalPath = filePath.endsWith('.csv') ? filePath : `${filePath}.csv`;

    fs.writeFileSync(finalPath, csv, 'utf8');

    return { success: true, filePath: finalPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export const exportService = {
  exportToCSV,
};
