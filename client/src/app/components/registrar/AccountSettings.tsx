import React, { useEffect, useState } from 'react';
import { UserCog, KeyRound, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { getMyAccount, updateAccountProfile, resetAccountPassword } from '../../../utils/apiClient';
import { inputClass, labelClass } from './shared';

interface MyAccount {
  uid: string;
  username: string;
  displayName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  position?: string;
}

export const AccountSettings: React.FC = () => {
  const [account, setAccount] = useState<MyAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', contactNumber: '', position: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revealPassword, setRevealPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getMyAccount()
      .then((res) => {
        const user = res.user as MyAccount;
        setAccount(user);
        setForm({
          firstName: user.firstName ?? '',
          middleName: user.middleName ?? '',
          lastName: user.lastName ?? '',
          email: user.email ?? '',
          contactNumber: user.contactNumber ?? '',
          position: user.position ?? '',
        });
      })
      .catch((err: any) => setLoadError(err?.message || 'Failed to load your account details.'))
      .finally(() => setIsLoading(false));
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || isSaving) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSaveError('First and last name are required.');
      return;
    }
    setIsSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const res = await updateAccountProfile(account.uid, {
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        position: form.position.trim(),
      });
      setAccount((prev) => (prev ? { ...prev, ...res.user } : prev));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save your details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || isChangingPassword) return;
    setPasswordError('');
    setPasswordChanged(false);
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await resetAccountPassword(account.uid, newPassword);
      setPasswordChanged(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change your password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        Loading your account...
      </div>
    );
  }

  if (loadError || !account) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-red-600 font-medium">{loadError || 'Could not load your account.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 lg:px-5 py-3 border-b border-gray-200 flex items-center gap-2">
          <UserCog size={16} className="text-purple-700" />
          <div>
            <h3 className="font-bold text-gray-800">My Account</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Update the details on your own account</p>
          </div>
        </div>
        <form onSubmit={handleSaveDetails} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Username</label>
            <div className="h-[42px] px-3 border border-gray-100 rounded-lg text-sm bg-gray-50 flex items-center font-mono text-gray-400">{account.username}</div>
            <p className="text-[10px] text-gray-400 mt-1">Username cannot be changed.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={labelClass}>First Name *</label>
              <input value={form.firstName} onChange={set('firstName')} className={inputClass} required />
            </div>
            <div className="col-span-1">
              <label className={labelClass}>Middle Name</label>
              <input value={form.middleName} onChange={set('middleName')} className={inputClass} placeholder="(optional)" />
            </div>
            <div className="col-span-1">
              <label className={labelClass}>Last Name *</label>
              <input value={form.lastName} onChange={set('lastName')} className={inputClass} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="email@example.com" />
            </div>
            <div>
              <label className={labelClass}>Contact Number</label>
              <input value={form.contactNumber} onChange={set('contactNumber')} className={inputClass} placeholder="09XX-XXX-XXXX" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Position</label>
            <input value={form.position} onChange={set('position')} className={inputClass} placeholder="e.g. Registrar" />
          </div>
          {saveError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle size={14} /> {saveError}</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={15} /> Saved</span>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 lg:px-5 py-3 border-b border-gray-200 flex items-center gap-2">
          <KeyRound size={16} className="text-purple-700" />
          <div>
            <h3 className="font-bold text-gray-800">Change Password</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Set a new password for your own login</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="p-5 space-y-4 max-w-md">
          <div>
            <label className={labelClass}>New Password *</label>
            <div className="relative">
              <input
                type={revealPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${inputClass} pr-10`}
                placeholder="Minimum 6 characters"
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setRevealPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {revealPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Confirm New Password *</label>
            <input
              type={revealPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle size={14} /> {passwordError}</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-4 py-2.5 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </button>
            {passwordChanged && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={15} /> Password updated</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
