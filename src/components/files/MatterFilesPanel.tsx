// src/components/files/MatterFilesPanel.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, ShieldAlert, FolderOpen } from 'lucide-react';
import { DocumentRecord, fetchMatterFiles, getDocumentUrl } from '../../lib/files';
import { clock } from '../../lib/clock';

interface Props {
  projectCodeId: string;
  projectCode: string;
}

export const MatterFilesPanel: React.FC<Props> = ({ projectCodeId, projectCode }) => {
  const [files, setFiles] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMatterFiles(projectCodeId).then((res) => {
      if (active) {
        setFiles(res);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [projectCodeId]);

  const handleDownload = async (doc: DocumentRecord) => {
    const url = await getDocumentUrl(doc);
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Matter Files ({projectCode})
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          Cross-App Shared
        </span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500">Loading matter files...</div>
      ) : files.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No shared documents found for this project code.
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {file.file_name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{file.category}</span>
                    <span>•</span>
                    <span>{clock.formatDisplay(file.uploaded_at)}</span>
                    <span>•</span>
                    <span className="font-mono uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">
                      {file.source_app}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
                {file.zoho_permalink && (
                  <a
                    href={file.zoho_permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                    title="Open in WorkDrive"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>Finance-restricted files are automatically filtered out by system security policy.</span>
      </div>
    </div>
  );
};
