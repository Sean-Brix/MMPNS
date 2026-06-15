import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, User, AlertCircle, LogOut } from 'lucide-react';
import {
  loginWithCredentials,
  getActiveSessionInfo,
  logout,
  type LoginResult,
  type ActiveSessionInfo,
} from '../../../utils/auth';
import { ROLE_LABELS } from '../../../utils/roles';

interface PortalLoginProps {
  portalName: string;
  portalDescription?: string;
  loginFieldLabel?: string;
  onSuccess: (result: LoginResult) => void;
  accentColor?: string;
  allowedRoles?: string[];
}

export const PortalLogin: React.FC<PortalLoginProps> = ({
  portalName,
  portalDescription,
  loginFieldLabel = 'Username',
  onSuccess,
  accentColor = '#185C20',
  allowedRoles,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cross-portal conflict detection
  const [conflictSession, setConflictSession] = useState<ActiveSessionInfo | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    const active = getActiveSessionInfo();
    if (active) {
      setConflictSession(active);
    }
  }, []);

  const performLogin = async (u: string, p: string) => {
    setIsLoading(true);
    setError('');
    const result = await loginWithCredentials(u, p);
    setIsLoading(false);

    if (result.success) {
      if (allowedRoles && result.role && !allowedRoles.includes(result.role)) {
        await logout();
        setError(`This account does not have access to the ${portalName}.`);
      } else {
        onSuccess(result);
      }
    } else {
      setError(result.error || 'Invalid credentials. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // If another session is active, show conflict dialog first
    if (conflictSession) {
      setPendingLogin({ username, password });
      setShowConflictDialog(true);
      return;
    }

    await performLogin(username, password);
  };

  const handleConflictConfirm = async () => {
    setShowConflictDialog(false);
    await logout();
    setConflictSession(null);
    if (pendingLogin) {
      await performLogin(pendingLogin.username, pendingLogin.password);
      setPendingLogin(null);
    }
  };

  const handleConflictCancel = () => {
    setShowConflictDialog(false);
    setPendingLogin(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      {/* Cross-portal conflict dialog */}
      {showConflictDialog && conflictSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Already Signed In</h3>
                <p className="text-xs text-gray-500">Session conflict detected</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              You are currently signed in as{' '}
              <span className="font-semibold text-gray-900">{conflictSession.displayName}</span>{' '}
              <span className="text-gray-500">
                ({ROLE_LABELS[conflictSession.role] || conflictSession.role})
              </span>
              . Signing in here will log you out of that account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConflictCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConflictConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                Continue & Sign Out
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center" style={{ backgroundColor: accentColor }}>
            <div className="w-14 h-14 rounded-2xl bg-[#EDCD1F] mx-auto flex items-center justify-center mb-4">
              <span className="text-[#185C20] font-black text-xl">M</span>
            </div>
            <h1 className="text-xl font-bold text-white">{portalName}</h1>
            {portalDescription && (
              <p className="text-white/70 text-sm mt-1">{portalDescription}</p>
            )}
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <p className="text-sm text-gray-500 text-center mb-6">
              Sign in to access your portal
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {loginFieldLabel}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`Enter your ${loginFieldLabel.toLowerCase()}`}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    disabled={isLoading}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                    disabled={isLoading}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={{ backgroundColor: accentColor }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Maria Montessori Philippine Normal School
        </p>
      </motion.div>
    </div>
  );
};
