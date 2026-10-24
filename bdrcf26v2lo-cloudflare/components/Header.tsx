
import React, { useState } from 'react';
import { User, Role, Shift, AppView } from '../types';
import NotificationBell from './NotificationBell';
import NotificationSettingsModal from './modals/NotificationSettingsModal';
import DataDisplaySettingsModal from './modals/DataDisplaySettingsModal';
import PWAInstallButton from './ui/PWAInstallButton';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  currentShift: Shift;
  onShiftChange: (shift: Shift) => void;
  handOverCount: number;
  updateUser: (userId: string, updates: Partial<User>) => void;
  onMessageAdmin: () => void;
  onSwitchRole: (role: Role) => void;
  unreadAdminMessages?: number;
  onOpenQRModal?: () => void;
  onLockTerminal?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, currentView, setCurrentView, currentShift, onShiftChange, handOverCount, updateUser, onMessageAdmin, onSwitchRole, unreadAdminMessages = 0, onOpenQRModal, onLockTerminal }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataSettingsOpen, setIsDataSettingsOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app-theme') || 'dark';
    if (saved === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    return saved as 'light' | 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app-theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  };

  const isReporter = user.role === Role.REPORTER;
  const isCoordinator = user.role === Role.COORDINATOR;
  const isForeman = user.role === Role.FOREMAN || user.role === Role.OPS_FOREMAN;
  const isScheduler = user.role === Role.SCHEDULER || user.role === Role.MECH_SUPERVISOR || user.role === Role.ELEC_SUPERVISOR || user.role === Role.TECH_SUPERVISOR || user.role === Role.INST_SUPERVISOR;
  const isAdmin = user.role === Role.ADMIN;
  const isGuest = user.role === Role.GUEST;
  
  const hasShiftManagement = isScheduler || isAdmin || isForeman || isReporter;
  const canViewReports = hasShiftManagement || isCoordinator || isReporter || isGuest;
  const canViewHandOver = isCoordinator || isScheduler || isAdmin || isForeman || isGuest;

  const canSwitchShift = (isAdmin || isScheduler || isReporter) && !isGuest;

  const availableRoles = React.useMemo(() => {
    if (user.roles && user.roles.length > 1) return user.roles;
    if (isAdmin) return Object.values(Role).filter(r => r !== Role.GUEST);
    if ([Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.FOREMAN].includes(user.role)) {
      return [Role.ELEC_SUPERVISOR, Role.MECH_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.FOREMAN, Role.SCHEDULER, Role.REPORTER];
    }
    return user.roles || [];
  }, [user.roles, user.role, isAdmin]);

  let headerBg = 'bg-gray-800';
  let headingText = 'text-white';
  let subText = 'text-gray-400';

  return (
    <header className={`${headerBg} shadow-md p-2 flex justify-between items-center print:hidden`}>
      <div className="flex items-center gap-3">
        <img 
          src="https://res.cloudinary.com/dcgkov1em/image/upload/v1791118593/bdrlogosnobg_txnuak.png" 
          alt="BDR Logo" 
          className="h-10 w-auto object-contain drop-shadow-sm shrink-0"
        />
        <div className="flex flex-col">
          <h1 className={`text-xl font-bold leading-tight ${headingText}`}>
            {isGuest ? 'Public Viewing Mode' : (isAdmin ? 'Admin Dashboard' : 'Breakdown Dashboard')}
          </h1>
          <div className="flex items-center gap-2">
            <p className={`text-[10px] ${subText}`}>
              {isGuest ? 'Viewing as Guest (Read-Only)' : `Logged in as ${user.name} (${user.role}${user.workGroup ? ` - ${user.workGroup}` : ''}${user.shift ? ` - Shift ${user.shift}` : ''})`}
            </p>
            {availableRoles.length > 0 && (
                <div className="relative">
                    <button 
                        onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1
                            bg-blue-900/40 border-blue-700 text-blue-300 hover:bg-blue-900/60`}
                    >
                        SWITCH ROLE
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-2.5 w-2.5 transition-transform ${isRoleMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {isRoleMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsRoleMenuOpen(false)}></div>
                            <div className="absolute left-0 mt-1 w-40 bg-gray-900 border border-gray-700 rounded-md shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <div className="py-1">
                                    <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 mb-1">Select Role</div>
                                    {availableRoles.map(r => (
                                        <button
                                            key={r}
                                            onClick={() => {
                                                onSwitchRole(r);
                                                setIsRoleMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between
                                                ${user.role === r ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                                        >
                                            {r}
                                            {user.role === r && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex space-x-2">
          {(isScheduler || isAdmin) ? (
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors bg-gray-700 rounded-full"
              title="Notification Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          ) : (
            <button 
              className="hidden"
              style={{ display: 'none' }}
              disabled
              aria-hidden="true"
            >
              Placeholder
            </button>
          )}
          <button 
            onClick={() => setIsDataSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors bg-gray-700 rounded-full"
            title="Data Display Settings"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
             </svg>
          </button>

          {onOpenQRModal && (
            <button 
              onClick={onOpenQRModal}
              className="p-2 text-blue-400 hover:text-white transition-colors bg-gray-700 hover:bg-blue-600 rounded-full"
              title="Equipment QR Codes & Field Portal Links"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
          )}

          {/* Light/Dark mode toggle button */}
          <button 
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-white transition-colors bg-gray-700 rounded-full flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              /* Sun icon for light mode transition */
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-3.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 17a5 5 0 100-10 5 5 0 000 10z" />
              </svg>
            ) : (
              /* Moon icon for dark mode transition */
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <PWAInstallButton />
        </div>
        <div className="flex items-center bg-gray-700/50 rounded-lg p-0.5">
            {(true) && (
              <>
                  <button 
                      onClick={() => setCurrentView('dashboard')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                      Dashboard
                  </button>
                  <button 
                      onClick={() => setCurrentView('tickets')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentView === 'tickets' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                      Job Tickets 🔒
                  </button>
                  <button 
                      onClick={() => setCurrentView('meeting')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentView === 'meeting' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                      Meeting Overview 📊
                  </button>
                  <button 
                      onClick={() => setCurrentView('kanban')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentView === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                      Kanban Board 📋
                  </button>
                  <button 
                      onClick={() => setCurrentView('gallery')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentView === 'gallery' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                      Gallery 🖼️
                  </button>
                  {!isAdmin && (
                    <button 
                        onClick={() => setCurrentView('summary')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentView === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                        Summary
                    </button>
                  )}
              </>
            )}
             {canViewReports && (
                <div className="flex space-x-1 border-l border-gray-600 pl-1 ml-1">
                  <button 
                      onClick={() => setCurrentView('history')}
                      className={`px-4 py-1 text-sm font-medium rounded-md transition-colors ${currentView === 'history' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                      History
                  </button>
                </div>
            )}
             {canViewHandOver && (
                <button 
                    onClick={() => setCurrentView('handover')}
                    className={`relative px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentView === 'handover' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                    Hand Over
                    {handOverCount > 0 && (
                         <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 w-4 text-[10px] font-bold leading-none text-red-100 bg-red-600 rounded-full">{handOverCount}</span>
                    )}
                </button>
            )}
            <button 
                onClick={() => setCurrentView('about')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentView === 'about' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                About
            </button>
            {hasShiftManagement && (
              <div className={`flex items-center space-x-1 ${!isAdmin ? 'ml-2 border-l border-gray-600 pl-2' : ''}`}>
                  <span className="text-xs font-bold text-gray-400 mr-1">SHIFT</span>
                  {(Object.values(Shift)).map((shift) => (
                      <button
                          key={shift}
                          onClick={() => canSwitchShift && onShiftChange(shift)}
                          disabled={!canSwitchShift}
                          className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-md transition-colors 
                            ${currentShift === shift ? 'bg-blue-600 text-white' : 'text-gray-300 bg-gray-900/50 hover:bg-gray-600'}
                            ${!canSwitchShift ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                          {shift}
                      </button>
                  ))}
              </div>
            )}
        </div>
        {!isGuest && <NotificationBell user={user} />}
        {!isGuest && (
            <button 
                onClick={onMessageAdmin}
                className="relative bg-gray-700 hover:bg-gray-600 text-purple-300 hover:text-purple-200 font-bold py-1 px-2 text-[10px] rounded transition duration-200 flex items-center border border-purple-500/30"
                title="Message Admin"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                MSG
                {unreadAdminMessages > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-full ring-2 ring-gray-800">
                    {unreadAdminMessages}
                    </span>
                )}
            </button>
        )}
        {!isGuest && onLockTerminal && (
          <button
            onClick={onLockTerminal}
            className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 font-bold py-1.5 px-2.5 text-xs rounded-md transition duration-200 flex items-center gap-1.5 shadow"
            title="Lock Terminal (Requires Windows Hello or PIN to resume)"
          >
            <span>🔒</span>
            <span className="hidden sm:inline">Lock</span>
          </button>
        )}
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 text-xs rounded-md transition duration-300"
        >
          {isGuest ? 'Sign In / Register' : 'Logout'}
        </button>
      </div>

      <NotificationSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onUpdateUser={updateUser}
      />
      <DataDisplaySettingsModal 
        isOpen={isDataSettingsOpen}
        onClose={() => setIsDataSettingsOpen(false)}
        user={user}
        onUpdateUser={updateUser}
      />
    </header>
  );
};

export default Header;
