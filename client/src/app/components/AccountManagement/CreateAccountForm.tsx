import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createAccount } from '../../../utils/apiClient';
import type { UserRole } from '../../../utils/auth';

interface CreateAccountFormProps {
  callerRole: 'registrar' | 'admin' | 'superadmin';
  onCreated: (user: any) => void;
  onCancel: () => void;
}

const CREATABLE_ROLES_BY_CALLER: Record<string, { value: UserRole; label: string }[]> = {
  registrar: [
    { value: 'teacher',   label: 'Teacher' },
    { value: 'student',   label: 'Student' },
    { value: 'principal', label: 'Principal' },
    { value: 'librarian', label: 'Librarian' },
    { value: 'admin',     label: 'System Admin' },
  ],
  admin: [
    { value: 'teacher',   label: 'Teacher' },
    { value: 'student',   label: 'Student' },
    { value: 'principal', label: 'Principal' },
    { value: 'librarian', label: 'Librarian' },
    { value: 'registrar', label: 'Registrar' },
  ],
  superadmin: [
    { value: 'teacher',    label: 'Teacher' },
    { value: 'student',    label: 'Student' },
    { value: 'principal',  label: 'Principal' },
    { value: 'librarian',  label: 'Librarian' },
    { value: 'registrar',  label: 'Registrar' },
    { value: 'admin',      label: 'System Admin' },
    { value: 'superadmin', label: 'Superadmin' },
  ],
};

const DEPARTMENTS = ['Kindergarten', 'Elementary', 'JHS'];

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/30 focus:border-[#185C20] transition-all';
const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

export const CreateAccountForm: React.FC<CreateAccountFormProps> = ({
  callerRole,
  onCreated,
  onCancel,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({
    firstName: '', middleName: '', lastName: '', extension: '',
    email: '', username: '', password: '', contactNumber: '',
    department: '', noOfSiblings: '', monthlyFamilyIncome: '', province: '', lrn: '',
  });

  const roles = CREATABLE_ROLES_BY_CALLER[callerRole] || [];

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const payload: Record<string, any> = { role: selectedRole };

      if (selectedRole !== 'student') {
        payload.username = form.username.trim();
        payload.password = form.password;
      } else {
        payload.password = form.password;
      }

      if (['teacher', 'principal', 'librarian', 'registrar', 'admin'].includes(selectedRole)) {
        payload.firstName = form.firstName.trim();
        if (form.middleName.trim()) payload.middleName = form.middleName.trim();
        payload.lastName = form.lastName.trim();
        payload.email = form.email.trim();
        payload.contactNumber = form.contactNumber.trim();
        if (selectedRole === 'teacher') payload.department = form.department;
      }

      if (selectedRole === 'student') {
        payload.firstName = form.firstName.trim();
        if (form.middleName.trim()) payload.middleName = form.middleName.trim();
        payload.lastName = form.lastName.trim();
        if (form.extension.trim()) payload.extension = form.extension.trim();
        payload.lrn = form.lrn.trim();
        payload.noOfSiblings = Number(form.noOfSiblings) || 0;
        payload.monthlyFamilyIncome = Number(form.monthlyFamilyIncome) || 0;
        payload.province = form.province.trim();
      }

      if (selectedRole === 'superadmin') {
        payload.email = form.email.trim();
        payload.contactNumber = form.contactNumber.trim();
      }

      const res = await createAccount(payload);
      setSuccess(res.user);
      onCreated(res.user);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Account Created</p>
          <p className="text-sm text-gray-500 mt-1">{success.displayName} has been added to the system.</p>
          {success.role === 'student' && success.studentCode && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
              <p className="text-xs font-medium text-amber-800 mb-1">Student Login Code</p>
              <p className="font-mono text-base font-bold text-amber-900 tracking-widest">{success.studentCode}</p>
              <p className="text-xs text-amber-700 mt-1">Give this code to the student. It is their login identifier.</p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
            Close
          </button>
          <button
            onClick={() => { setSuccess(null); setForm({ firstName: '', middleName: '', lastName: '', extension: '', email: '', username: '', password: '', contactNumber: '', department: '', noOfSiblings: '', monthlyFamilyIncome: '', province: '', lrn: '' }); setSelectedRole(''); }}
            className="px-4 py-2 rounded-lg bg-[#185C20] text-white text-sm hover:bg-[#145218]"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Role selector */}
      <div>
        <label className={labelClass}>Account Role *</label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
          className={inputClass}
          required
        >
          <option value="">Select a role...</option>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {selectedRole && (
        <>
          {/* Name fields (all except superadmin) */}
          {selectedRole !== 'superadmin' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={labelClass}>First Name *</label>
                <input value={form.firstName} onChange={set('firstName')} className={inputClass} placeholder="Juan" required />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Middle Name</label>
                <input value={form.middleName} onChange={set('middleName')} className={inputClass} placeholder="(optional)" />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Last Name *</label>
                <input value={form.lastName} onChange={set('lastName')} className={inputClass} placeholder="dela Cruz" required />
              </div>
            </div>
          )}

          {/* Student-specific fields */}
          {selectedRole === 'student' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Extension (Jr., III, etc.)</label>
                  <input value={form.extension} onChange={set('extension')} className={inputClass} placeholder="(optional)" />
                </div>
                <div>
                  <label className={labelClass}>LRN *</label>
                  <input value={form.lrn} onChange={set('lrn')} className={inputClass} placeholder="12-digit LRN" required maxLength={12} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>No. of Siblings *</label>
                  <input type="number" value={form.noOfSiblings} onChange={set('noOfSiblings')} className={inputClass} min="0" required />
                </div>
                <div>
                  <label className={labelClass}>Monthly Family Income *</label>
                  <input type="number" value={form.monthlyFamilyIncome} onChange={set('monthlyFamilyIncome')} className={inputClass} min="0" required />
                </div>
                <div>
                  <label className={labelClass}>Province/City *</label>
                  <input value={form.province} onChange={set('province')} className={inputClass} placeholder="Province or city" required />
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">Note:</span> The student login code will be auto-generated after creation. Share it with the student — they will use it to sign in.
                </p>
              </div>
            </>
          )}

          {/* Staff contact fields (non-student, non-superadmin) */}
          {!['student', 'superadmin'].includes(selectedRole) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="email@example.com" required />
              </div>
              <div>
                <label className={labelClass}>Contact Number *</label>
                <input value={form.contactNumber} onChange={set('contactNumber')} className={inputClass} placeholder="09XX-XXX-XXXX" required />
              </div>
            </div>
          )}

          {/* Superadmin fields */}
          {selectedRole === 'superadmin' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={form.email} onChange={set('email')} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Contact Number *</label>
                <input value={form.contactNumber} onChange={set('contactNumber')} className={inputClass} required />
              </div>
            </div>
          )}

          {/* Teacher department */}
          {selectedRole === 'teacher' && (
            <div>
              <label className={labelClass}>Department *</label>
              <select value={form.department} onChange={set('department')} className={inputClass} required>
                <option value="">Select department...</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {/* Username (non-student) */}
          {selectedRole !== 'student' && (
            <div>
              <label className={labelClass}>Username *</label>
              <input value={form.username} onChange={set('username')} className={inputClass} placeholder="Unique login username" required autoComplete="off" />
            </div>
          )}

          {/* Password */}
          <div>
            <label className={labelClass}>Initial Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                className={`${inputClass} pr-10`}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#185C20] text-white text-sm font-medium hover:bg-[#145218] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </>
      )}
    </form>
  );
};
