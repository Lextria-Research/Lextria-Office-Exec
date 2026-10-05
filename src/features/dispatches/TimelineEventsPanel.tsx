// src/features/dispatches/TimelineEventsPanel.tsx
import React, { useSyncExternalStore } from 'react';
import { mockStore } from '../../lib/mockData';
import { clock } from '../../lib/clock';
import { Send, CheckCircle2, RotateCcw, Clock, Share2, ShieldCheck } from 'lucide-react';

export const TimelineEventsPanel: React.FC = () => {
  const events = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.events
  );
  const projectCodes = mockStore.getProjectCodes();

  const getEventIcon = (code?: string | null) => {
    switch (code) {
      case 'DISPATCH_BOOKED':
        return <Send className="w-3.5 h-3.5 text-teal-600" />;
      case 'DISPATCH_DELIVERED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
      case 'DISPATCH_RETURNED':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Cross-App Matter Timeline Events (<code>core.matter_events</code>)
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          {events.length} Events Logged
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Booking, delivery and return events written directly to the shared <code>core</code> schema.
        Litigator and Finance apps consume these on their matter timelines.
      </p>

      <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {events.map((ev) => {
          const project = projectCodes.find((p) => p.id === ev.project_code_id);

          return (
            <div key={ev.id} className="relative pl-7 text-xs space-y-1">
              {/* Timeline marker icon */}
              <div className="absolute left-1.5 top-0.5 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-2xs">
                {getEventIcon(ev.event_code)}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded text-[11px]">
                    {project?.code || 'OFFICE'}
                  </span>
                  <span>{ev.title}</span>
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {clock.formatDisplay(ev.occurred_at)}
                </span>
              </div>

              {ev.detail && <div className="text-slate-600 dark:text-slate-400">{ev.detail}</div>}

              {/* Client safe label notice */}
              {ev.client_label && (
                <div className="text-[11px] text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30 p-1.5 rounded flex items-center gap-1 border border-teal-100 dark:border-teal-900/50">
                  <ShieldCheck className="w-3 h-3 text-teal-600 shrink-0" />
                  <span>
                    <strong>Client Portal Label:</strong> &quot;{ev.client_label}&quot; (sanitized,
                    no recipient addresses)
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-500">No events recorded yet.</div>
        )}
      </div>
    </div>
  );
};
