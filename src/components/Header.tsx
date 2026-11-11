import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { ContinentalClock } from './ContinentalClock';
import { User, UserRole } from '../types';
import {
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Shield,
  ShieldAlert,
  LogOut,
  CheckCircle2,
  LogIn,
  Flame,
  Crown,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { SoundEngine } from '../utils/audio';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onGoogleLogin: () => void;
  onRoleChange?: (role: UserRole) => void;
  isFirebaseUser: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  isSoundOn: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onGoogleLogin,
  onRoleChange,
  isFirebaseUser,
  isDark,
  onToggleTheme,
  isSoundOn,
  onToggleSound,
}) => {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6 transition-colors">
      <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div className="hidden sm:block border-l border-slate-200 dark:border-slate-700 pl-3">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                  Global Futura <span className="text-amber-600 dark:text-amber-500 font-extrabold">ERP</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Live
                </span>
                {isFirebaseUser ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <Flame className="w-3 h-3 text-amber-500" />
                    Firebase Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    Offline / Local
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                500 N Broadway, Jericho, NY • Nature's Best Enterprise
              </p>
            </div>
          </div>

          {/* Quick controls on smaller viewports */}
          <div className="flex xl:hidden items-center gap-2">
            {!isFirebaseUser ? (
              <button
                onClick={() => {
                  SoundEngine.play('pop');
                  onGoogleLogin();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-slate-950" />
                <span>Login</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  SoundEngine.play('thud');
                  onLogout();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={onToggleSound}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title={isSoundOn ? 'Mute audio' : 'Unmute audio'}
            >
              {isSoundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Global Continental Clock */}
        <div className="w-full xl:flex-1 xl:max-w-2xl">
          <ContinentalClock />
        </div>

        {/* USER REQUESTED: PERMANENT FIREBASE LOGIN & LOGOUT OPTIONS */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full xl:w-auto justify-end">
          {/* Dedicated Firebase Login / Logout Group */}
          {!isFirebaseUser ? (
            <button
              onClick={() => {
                SoundEngine.play('pop');
                onGoogleLogin();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-amber-500/70 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 hover:from-amber-100 dark:hover:from-amber-900/50 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 transition-all shadow-sm active:scale-95 cursor-pointer group"
              title="Sign in with your Google account via Firebase Auth"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>🔥 Firebase Login</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 text-xs font-bold border border-emerald-300 dark:border-emerald-800 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px] truncate max-w-[130px] sm:max-w-[180px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={() => {
                  SoundEngine.play('thud');
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs"
                title="Log out of Firebase and switch account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}

          {/* Sound & Theme Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onToggleSound}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isSoundOn ? 'Sound feedback active' : 'Sound feedback muted'}
            >
              {isSoundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span className="hidden md:inline">{isSoundOn ? 'Sound' : 'Muted'}</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span className="hidden md:inline">{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          {/* USER REQUESTED: FIREBASE SUPER ADMIN & ADMIN ACCESS CONTROL (RBAC) */}
          <div className="relative flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                SoundEngine.play('tick');
                setIsRoleMenuOpen(!isRoleMenuOpen);
              }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group text-left"
              title="Click to view or switch Access Control Role (RBAC)"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm text-white ${
                user.role === 'super_admin' || user.isSuperAdmin
                  ? 'bg-gradient-to-br from-amber-500 to-yellow-600 ring-2 ring-amber-400'
                  : user.role === 'admin'
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                  : 'bg-gradient-to-br from-slate-600 to-slate-700'
              }`}>
                {user.role === 'super_admin' || user.isSuperAdmin ? (
                  <Crown className="w-4 h-4 text-white" />
                ) : (
                  user.initials
                )}
              </div>

              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                    {user.name}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    user.role === 'super_admin' || user.isSuperAdmin
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-400'
                      : user.role === 'admin'
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                  }`}>
                    {user.role === 'super_admin' || user.isSuperAdmin ? (
                      <>
                        <Crown className="w-2.5 h-2.5 text-amber-600" />
                        <span>Super Admin</span>
                      </>
                    ) : user.role === 'admin' ? (
                      <>
                        <Shield className="w-2.5 h-2.5 text-blue-600" />
                        <span>Admin</span>
                      </>
                    ) : (
                      <>
                        <span>{user.role}</span>
                      </>
                    )}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[140px]">
                  {user.email}
                </div>
              </div>
            </button>

            {/* Dropdown Menu for Role Switcher */}
            {isRoleMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 p-3 z-50 animate-in fade-in space-y-2">
                <div className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Role-Based Access Control (RBAC)
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    Logged in as: {user.email}
                  </div>
                </div>

                <div className="space-y-1">
                  {/* Super Admin option */}
                  <button
                    onClick={() => {
                      SoundEngine.play('success');
                      if (onRoleChange) onRoleChange('super_admin');
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full p-2 rounded-xl text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                      user.role === 'super_admin'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-amber-500 text-slate-950 mt-0.5">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>👑 Super Admin</span>
                        {user.role === 'super_admin' && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">● Active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        Full unrestricted access: edit cost breakdown waterfalls, live USD/INR exchange rate override, delete records & live inventory cuts.
                      </div>
                    </div>
                  </button>

                  {/* Admin option */}
                  <button
                    onClick={() => {
                      SoundEngine.play('pop');
                      if (onRoleChange) onRoleChange('admin');
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full p-2 rounded-xl text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                      user.role === 'admin'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-blue-600 text-white mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>🛡️ Admin</span>
                        {user.role === 'admin' && (
                          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">● Active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        Operational manager: place orders with verified invoice upload, bill scanning, inventory management & container dispatches.
                      </div>
                    </div>
                  </button>

                  {/* Operator option */}
                  <button
                    onClick={() => {
                      SoundEngine.play('thud');
                      if (onRoleChange) onRoleChange('operator');
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full p-2 rounded-xl text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                      user.role === 'operator'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-emerald-600 text-white mt-0.5">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>📦 Operator</span>
                        {user.role === 'operator' && (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">● Active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        Restricted view: Packaging tracker & inventory view. Confidential costing & margin waterfalls are shielded.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
