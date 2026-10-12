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
      setFilename(`document.${ext}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl border border-white/[0.1] bg-[#0c101a]/95 p-6 shadow-2xl backdrop-blur-2xl ring-1 ring-white/[0.05] animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 p-2 text-teal-400">
              <FilePlus className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Create New File</h3>
              <p className="text-xs text-slate-400">
                Add a new text, markdown, or code document.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
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
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-teal-500/80 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50"
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{error}</p>
            )}

            {/* Quick Extension Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Templates:</span>
              {['md', 'txt', 'json', 'ts', 'py', 'html', 'css'].map((ext) => (
                <button
                  key={ext}
                  type="button"
                  onClick={() => handleQuickExtension(ext)}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300 hover:border-teal-500/40 hover:text-teal-300 hover:bg-white/[0.06] transition-colors font-mono"
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
              placeholder="Write initial content or leave blank..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-teal-500/80 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !filename.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-1.5 text-xs font-medium text-slate-950 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50"
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
