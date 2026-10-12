import React, { useState, useRef, useEffect } from 'react';
import { FilePlus, X, Check, Loader2 } from 'lucide-react';

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (name: string, content: string) => Promise<void>;
}

export const CreateFileModal: React.FC<CreateFileModalProps> = ({
  isOpen,
  onClose,
  onCreateFile,
}) => {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFilename('');
      setContent('');
      setError(null);
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = filename.trim();
    if (!cleanName) {
      setError('Please provide a file name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateFile(cleanName, content);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickExtension = (ext: string) => {
    if (!filename) {
      setFilename(`new_file.${ext}`);
    } else {
      const parts = filename.split('.');
      if (parts.length > 1) {
        parts[parts.length - 1] = ext;
        setFilename(parts.join('.'));
      } else {
        setFilename(`${filename}.${ext}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400">
              <FilePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Create New File</h3>
              <p className="text-xs text-slate-400">
                Add a new text, markdown, or code document to this folder.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              File Name
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. notes.md, data.json, script.py"
              value={filename}
              onChange={(e) => {
                setFilename(e.target.value);
                if (error) setError(null);
              }}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors disabled:opacity-50"
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{error}</p>
            )}

            {/* Quick Extension Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-500 mr-1">Presets:</span>
              {['txt', 'md', 'json', 'js', 'py', 'html', 'css'].map((ext) => (
                <button
                  key={ext}
                  type="button"
                  onClick={() => handleQuickExtension(ext)}
                  className="rounded-md border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300 hover:border-teal-500 hover:text-teal-300 transition-colors"
                >
                  .{ext}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Initial Content (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Write initial text or leave blank..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors disabled:opacity-50 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !filename.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Create File</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
