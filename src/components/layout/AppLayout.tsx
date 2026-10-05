// src/components/layout/AppLayout.tsx
import React, { useState, useSyncExternalStore } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Send,
  BookOpen,
  Layers,
  DollarSign,
  Briefcase,
  CheckSquare,
  FileSpreadsheet,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  User,
  Shield,
  Sun,
  Moon,
  Home,
  Share2,
  LogOut,
} from 'lucide-react';
import {
  getStoredUser,
  setStoredUser,
  getViewAsRole,
  setViewAsRole,
  signOutUser,
  SEEDED_TEST_USERS,
  UserProfile,
  Role,
} from '../../lib/auth';
import { RoleBanner } from '../common/RoleBanner';
import { mockStore } from '../../lib/mockData';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getStoredUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const notifications = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getNotifications()
  );
  const unreadNotifications = notifications.filter((n) => !n.read_at);

  const handleSwitchUser = (user: UserProfile) => {
    setStoredUser(user);
    setCurrentUser(user);
    setUserMenuOpen(false);
  };

  const handleSignOut = () => {
    signOutUser();
    setUserMenuOpen(false);
    navigate('/login');
  };

  const handleRoleViewChange = (role: Role | '') => {
    setViewAsRole(role ? (role as Role) : null);
    setCurrentUser({ ...getStoredUser()! });
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const effectiveRole = getViewAsRole() || currentUser?.role || 'OFFICE_EXEC';
  const canViewCashBook =
    effectiveRole === 'OFFICE_EXEC' ||
    effectiveRole === 'SUPER_ADMIN' ||
    effectiveRole === 'FINANCE';

  const navItems = [
    { label: 'Home Overview', path: '/', icon: Home },
    { label: 'Dispatches Register', path: '/dispatches', icon: Send },
    { label: 'Batch Dispatch', path: '/batch', icon: Layers },
    { label: 'Address Book', path: '/address-book', icon: BookOpen },
    { label: 'Matter Timeline', path: '/timeline', icon: Share2 },
    ...(canViewCashBook ? [{ label: 'Petty Cash Book', path: '/petty-cash', icon: DollarSign }] : []),
    { label: 'Document & DSC Custody', path: '/custody', icon: Briefcase },
    { label: 'Errands & Requests', path: '/errands', icon: CheckSquare },
    { label: 'Spreadsheet Importers', path: '/importers', icon: FileSpreadsheet },
    { label: 'Admin › Integrations', path: '/admin/integrations', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${isDarkMode ? 'dark' : ''}`}>
      {/* Super Admin Role Simulation Banner */}
      <RoleBanner currentUser={currentUser} onRoleChange={() => setCurrentUser({ ...getStoredUser()! })} />

      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
              LX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base tracking-tight">
                  Lextria Office Executive
                </span>
                <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider border border-amber-300 dark:border-amber-800">
                  TEST DATA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Indian IP & Legal Ops Platform</p>
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-6">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Global search (matter, client, alias)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* SUPER_ADMIN View As Role Switcher */}
          {currentUser?.role === 'SUPER_ADMIN' && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">View As:</span>
              <select
                value={getViewAsRole() || ''}
                onChange={(e) => handleRoleViewChange(e.target.value as Role)}
                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-teal-700 dark:text-teal-300"
              >
                <option value="">SUPER_ADMIN (Default)</option>
                <option value="OFFICE_EXEC">OFFICE_EXEC</option>
                <option value="FINANCE">FINANCE</option>
                <option value="DEPT_ADMIN">DEPT_ADMIN</option>
                <option value="ASSOCIATE">ASSOCIATE (Staff)</option>
              </select>
            </div>
          )}

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle Light / Dark"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-teal-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Notifications ({unreadNotifications.length} unread)
                  </h4>
                  <span className="text-[10px] text-teal-600"><code>core.notifications</code></span>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => mockStore.markNotificationRead(n.id)}
                      className={`p-2 rounded-lg text-xs cursor-pointer transition ${
                        !n.read_at
                          ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800'
                          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {n.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
            >
              <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-300 dark:border-teal-800">
                {currentUser?.display_name.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {currentUser?.display_name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{currentUser?.role}</div>
              </div>
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-3 space-y-2">
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {currentUser?.display_name}
                  </div>
                  <div className="text-[11px] text-slate-500">{currentUser?.email}</div>
                  <div className="text-[10px] font-mono text-teal-600 mt-0.5">
                    Role: {currentUser?.role} • Dept: {currentUser?.department}
                  </div>
                </div>

                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-1">
                  Switch Test Account (Fast Role Testing):
                </div>

                <div className="space-y-1">
                  {SEEDED_TEST_USERS.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSwitchUser(user)}
                      className={`w-full text-left p-1.5 rounded-md text-xs transition flex items-center justify-between ${
                        user.id === currentUser?.id
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{user.display_name}</span>
                      <span className="text-[10px] font-mono opacity-70 shrink-0 ml-1">
                        {user.role}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left p-1.5 rounded-md text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out (Switch to Login)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col justify-between shrink-0 p-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>Multi-App Schema Isolation</span>
            </div>
            <p>
              Operating in <code>office</code> &amp; <code>core</code>. Schema <code>public</code> is
              strictly read/write locked.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 bg-white dark:bg-slate-900 h-full p-4 flex flex-col justify-between z-10 shadow-2xl">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="text-[11px] text-slate-400">
                Lextria Office Exec • Mobile Nav
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
