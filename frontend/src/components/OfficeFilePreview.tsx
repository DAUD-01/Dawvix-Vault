import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { FileItem } from '../types';
import { driveService } from '../services/api';

export type OfficeFileKind = 'word' | 'spreadsheet' | 'presentation';

export const getOfficeFileKind = (
  fileName: string,
  mimeType: string,
): OfficeFileKind | null => {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  const mime = mimeType.toLowerCase();

  if (extension === 'docx' || mime.includes('wordprocessingml.document')) {
    return 'word';
  }
  if (
    ['xls', 'xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm', 'ods'].includes(extension) ||
    mime.includes('spreadsheetml.sheet') ||
    mime.includes('ms-excel')
  ) {
    return 'spreadsheet';
  }
  if (
    ['pptx', 'pptm', 'ppsx', 'ppsm'].includes(extension) ||
    mime.includes('presentationml.presentation') ||
    mime.includes('presentationml.slideshow')
  ) {
    return 'presentation';
  }
  return null;
};

interface SpreadsheetData {
  name: string;
  rows: unknown[][];
  totalRows: number;
  totalColumns: number;
  startRow: number;
  startColumn: number;
}

interface OfficeFilePreviewProps {
  file: FileItem;
  kind: OfficeFileKind;
}

const MAX_SPREADSHEET_ROWS = 250;
const MAX_SPREADSHEET_COLUMNS = 50;

const getColumnName = (index: number): string => {
  let column = index + 1;
  let name = '';
  while (column > 0) {
    column -= 1;
    name = String.fromCharCode(65 + (column % 26)) + name;
    column = Math.floor(column / 26);
  }
  return name;
};

export const OfficeFilePreview: React.FC<OfficeFilePreviewProps> = ({ file, kind }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SpreadsheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    let pptxViewer: { destroy: () => void } | undefined;

    setIsLoading(true);
    setError(null);
    setSheets([]);
    setActiveSheet(0);

    const loadPreview = async () => {
      try {
        const blob = await driveService.getFileBlob(file.driveId, controller.signal);
        if (!isActive) return;

        if (kind === 'word') {
          const { renderAsync } = await import('docx-preview');
          if (!isActive || !previewRef.current) return;
          await renderAsync(blob, previewRef.current, previewRef.current, {
            className: 'vault-docx',
            useBase64URL: true,
            breakPages: true,
          });
        } else if (kind === 'presentation') {
          const { PptxViewer, RECOMMENDED_ZIP_LIMITS } = await import('@aiden0z/pptx-renderer');
          if (!isActive || !previewRef.current) return;
          pptxViewer = await PptxViewer.open(await blob.arrayBuffer(), previewRef.current, {
            zipLimits: RECOMMENDED_ZIP_LIMITS,
            lazySlides: true,
            lazyMedia: true,
            renderMode: 'list',
            listOptions: { windowed: true, initialSlides: 4, batchSize: 4, showSlideLabels: true },
          });
          if (!isActive) pptxViewer.destroy();
        } else {
          const XLSX = await import('xlsx');
          if (!isActive) return;
          const workbook = XLSX.read(await blob.arrayBuffer(), { type: 'array', cellDates: true });
          const parsedSheets = workbook.SheetNames.map((name) => {
            const worksheet = workbook.Sheets[name];
            const range = worksheet?.['!ref']
              ? XLSX.utils.decode_range(worksheet['!ref'])
              : null;
            if (!range) {
              return {
                name,
                rows: [],
                totalRows: 0,
                totalColumns: 0,
                startRow: 0,
                startColumn: 0,
              };
            }

            const startRow = range.s.r;
            const startColumn = range.s.c;
            const totalRows = range.e.r - range.s.r + 1;
            const totalColumns = range.e.c - range.s.c + 1;
            range.e.r = Math.min(range.e.r, range.s.r + MAX_SPREADSHEET_ROWS - 1);
            range.e.c = Math.min(range.e.c, range.s.c + MAX_SPREADSHEET_COLUMNS - 1);
            return {
              name,
              rows: XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
                header: 1,
                raw: false,
                defval: '',
                range,
              }),
              totalRows,
              totalColumns,
              startRow,
              startColumn,
            };
          });
          if (isActive) setSheets(parsedSheets);
        }
      } catch (previewError) {
        if (isActive && !controller.signal.aborted) {
          setError(
            previewError instanceof Error
              ? previewError.message
              : 'The file could not be rendered in the browser.',
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadPreview();
    return () => {
      isActive = false;
      controller.abort();
      pptxViewer?.destroy();
      previewRef.current?.replaceChildren();
    };
  }, [file.driveId, kind, retryKey]);

  const selectedSheet = sheets[activeSheet];

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-slate-950">
      {kind === 'spreadsheet' && sheets.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-900 px-4 py-2">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => setActiveSheet(index)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                activeSheet === index
                  ? 'bg-teal-500/20 text-teal-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div
        ref={previewRef}
        className={`min-h-0 flex-1 overflow-auto ${
          kind === 'word' ? 'office-word-preview bg-slate-900 p-4 sm:p-8' : ''
        }`}
      >
        {kind === 'spreadsheet' && !isLoading && !error && selectedSheet && (
          <div className="h-full overflow-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-200">
              <thead className="sticky top-0 z-10 bg-slate-800 text-slate-300">
                <tr>
                  <th className="sticky left-0 border border-slate-700 bg-slate-800 px-3 py-2 text-right font-mono font-medium">
                    #
                  </th>
                  {Array.from(
                    { length: Math.min(selectedSheet.totalColumns, MAX_SPREADSHEET_COLUMNS) },
                    (_, index) => (
                      <th
                        key={index}
                        className="min-w-28 border border-slate-700 px-3 py-2 font-mono font-medium"
                      >
                        {getColumnName(selectedSheet.startColumn + index)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {selectedSheet.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="odd:bg-slate-900 even:bg-slate-900/60">
                    <th className="sticky left-0 border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono font-normal text-slate-500">
                      {selectedSheet.startRow + rowIndex + 1}
                    </th>
                    {Array.from(
                      { length: Math.min(selectedSheet.totalColumns, MAX_SPREADSHEET_COLUMNS) },
                      (_, columnIndex) => (
                        <td
                          key={columnIndex}
                          className="max-w-80 border border-slate-800 px-3 py-2 align-top"
                        >
                          {String(row[columnIndex] ?? '')}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {(selectedSheet.totalRows > MAX_SPREADSHEET_ROWS ||
              selectedSheet.totalColumns > MAX_SPREADSHEET_COLUMNS) && (
              <p className="p-3 text-center text-xs text-slate-500">
                Preview limited to {Math.min(selectedSheet.totalRows, MAX_SPREADSHEET_ROWS)} rows
                and {Math.min(selectedSheet.totalColumns, MAX_SPREADSHEET_COLUMNS)} columns.
              </p>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          <span className="text-sm">Preparing preview...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center">
          <p className="text-sm font-medium text-slate-200">Could not preview this file</p>
          <p className="max-w-lg break-words text-xs text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}
      {kind === 'spreadsheet' && !isLoading && !error && sheets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          This workbook has no visible worksheets.
        </div>
      )}

      <style>{`
        .office-word-preview .docx-wrapper {
          background: #0f172a !important;
          padding: 1.5rem 0;
        }
        .office-word-preview .docx-wrapper > section.docx {
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgb(0 0 0 / 35%);
        }
      `}</style>
    </div>
  );
};
