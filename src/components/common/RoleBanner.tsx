// src/components/common/RoleBanner.tsx
import React from 'react';
import { getViewAsRole, setViewAsRole, UserProfile } from '../../lib/auth';
import { Eye, X } from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
  onRoleChange: () => void;
}

export const RoleBanner: React.FC<Props> = ({ currentUser, onRoleChange }) => {
  if (currentUser?.role !== 'SUPER_ADMIN') return null;

  const viewAs = getViewAsRole();
  if (!viewAs) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm sticky top-0 z-50 animate-fadeIn">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 shrink-0" />
        <span>
          <strong>Admin Simulation:</strong> Currently viewing interface as{' '}
          <span className="bg-amber-600 px-2 py-0.5 rounded text-white font-bold tracking-wide">
            {viewAs}
          </span>
          {' '}(Row-Level Security still enforces your actual Super Admin login)
        </span>
      </div>
      <button
        onClick={() => {
          setViewAsRole(null);
          onRoleChange();
        }}
        className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded text-xs transition"
        title="Exit role view"
      >
        <X className="w-3.5 h-3.5" />
        <span>Exit View</span>
      </button>
    </div>
  );
};
