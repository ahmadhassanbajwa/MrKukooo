import { useState } from 'react';
import { Shield, User, Lock, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authenticateStaff, isSupabaseConfigured } from '../supabase';

export default function StaffLogin({ onLogin, navigateToHome }) {
  const [role, setRole] = useState('manager'); // 'manager' or 'employee'
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginId.trim() || !password.trim()) {
      setError('Both fields are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authenticateStaff(loginId, password);
      if (result.role !== role) {
        setError(`Access denied. This account is configured for the role "${result.role}", but you selected "${role}".`);
        setIsSubmitting(false);
        return;
      }
      onLogin(result.role);
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const autofill = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'manager') {
      setLoginId('manager');
      setPassword('manager');
    } else {
      setLoginId('employee');
      setPassword('employee');
    }
    setError('');
  };

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col justify-center items-center p-4 sm:p-8 font-sans relative overflow-hidden">
      
      {/* Background blobs for playful aesthetics */}
      <div className="absolute top-[-100px] left-[-100px] w-72 h-72 rounded-full bg-secondary/30 blur-2xl z-0 pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full bg-primary/10 blur-3xl z-0 pointer-events-none" />

      {/* Floating Back to Home button */}
      <button 
        onClick={navigateToHome}
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 bg-white hover:bg-gray-50 text-gray-800 font-medium px-3.5 py-2 rounded-md border border-gray-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:translate-y-[0.5px] text-xs sm:text-sm"
      >
        <ArrowLeft className="w-4 h-4 stroke-[2.2]" /> Back to Store
      </button>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-lg p-6 sm:p-8 space-y-5 sm:space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-primary text-white flex items-center justify-center mx-auto shadow-2xs border border-primary-hover/50">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Staff Portal</h2>
          <p className="text-xs sm:text-sm font-normal text-gray-500">Access your system command center</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-md border border-gray-200 gap-1">
          <button
            type="button"
            onClick={() => { setRole('manager'); setError(''); }}
            className={`flex-1 py-1.5 sm:py-2 rounded-md font-medium text-xs sm:text-sm transition-all cursor-pointer ${
              role === 'manager' 
                ? 'bg-secondary text-accent shadow-2xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Manager CMS
          </button>
          <button
            type="button"
            onClick={() => { setRole('employee'); setError(''); }}
            className={`flex-1 py-1.5 sm:py-2 rounded-md font-medium text-xs sm:text-sm transition-all cursor-pointer ${
              role === 'employee' 
                ? 'bg-primary text-white shadow-2xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Employee Kitchen
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-primary p-3 rounded-md flex items-start gap-2 text-xs font-medium animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              {role === 'manager' ? 'Manager ID / Email' : 'Employee ID / Email'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                placeholder={role === 'manager' ? "manager" : "employee"}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full bg-white border border-gray-250 pl-10 pr-4 py-2.5 rounded-md font-medium text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-gray-250 pl-10 pr-10 py-2.5 rounded-md font-medium text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-medium py-2.5 mt-2 rounded-md text-xs sm:text-sm disabled:bg-gray-150 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all active:translate-y-[0.5px] border ${
              role === 'manager'
                ? 'bg-secondary text-accent hover:bg-secondary-hover border-secondary-hover/40'
                : 'bg-primary text-white hover:bg-primary-hover border-primary-hover/50'
            }`}
          >
            {isSubmitting ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Autofill Demo helpers */}
        <div className="border-t border-dashed border-gray-200 pt-3 text-center space-y-2">
          <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">Quick Demo Fill</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => autofill('manager')}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium px-3 py-1.5 rounded-md border border-amber-200 transition-colors cursor-pointer"
            >
              Fill Manager
            </button>
            <button
              onClick={() => autofill('employee')}
              className="text-xs bg-red-50 hover:bg-red-100 text-primary font-medium px-3 py-1.5 rounded-md border border-red-200 transition-colors cursor-pointer"
            >
              Fill Employee
            </button>
          </div>
          {isSupabaseConfigured && (
            <p className="text-[10px] text-gray-400 font-normal">
              Supabase Auth active
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
