import { useState } from 'react';
import { Shield, User, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { authenticateStaff, isFirebaseConfigured } from '../firebase';

export default function StaffLogin({ onLogin, navigateToHome }) {
  const [role, setRole] = useState('manager'); // 'manager' or 'employee'
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
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
      setPassword('admin');
    } else {
      setLoginId('employee');
      setPassword('staff');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      
      {/* Background blobs for playful aesthetics */}
      <div className="absolute top-[-100px] left-[-100px] w-72 h-72 rounded-full bg-secondary/30 blur-2xl z-0" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full bg-primary/10 blur-3xl z-0" />

      {/* Floating Back to Home button */}
      <button 
        onClick={navigateToHome}
        className="absolute top-6 left-6 z-10 bg-white hover:bg-gray-100 text-accent font-black px-4 py-2 rounded-xl comic-border-sm comic-shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 stroke-[3]" /> Back to Store
      </button>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl comic-border comic-shadow-lg p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white comic-border-sm flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-3xl font-black text-accent tracking-tight">Staff Portal</h2>
          <p className="text-sm font-semibold text-gray-500">Access your system command center</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border-2 border-accent">
          <button
            type="button"
            onClick={() => { setRole('manager'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              role === 'manager' 
                ? 'bg-secondary text-accent comic-border-sm shadow-sm' 
                : 'text-gray-500 hover:text-accent'
            }`}
          >
            Manager CMS
          </button>
          <button
            type="button"
            onClick={() => { setRole('employee'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              role === 'employee' 
                ? 'bg-primary text-white comic-border-sm shadow-sm' 
                : 'text-gray-500 hover:text-accent'
            }`}
          >
            Employee Kitchen
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border-2 border-primary text-primary font-bold text-xs rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {/* User ID */}
          <div className="space-y-1">
            <label className="block text-xs font-black text-accent uppercase flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> ID Reference
            </label>
            <input
              type="text"
              placeholder={role === 'manager' ? 'manager' : 'employee'}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-xs font-black text-accent uppercase flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-2 border-accent px-4 py-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-black py-3 rounded-2xl comic-border-sm comic-shadow-sm comic-hover text-base disabled:bg-gray-150 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer ${
              role === 'manager'
                ? 'bg-secondary text-accent hover:bg-secondary-hover'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {isSubmitting ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Autofill Demo helpers */}
        {!isFirebaseConfigured ? (
          <div className="border-t-2 border-dashed border-gray-200 pt-4 text-center space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase">Demo Quick Fill Shortcuts</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => autofill('manager')}
                className="text-xs bg-secondary/15 hover:bg-secondary text-accent font-bold px-3 py-1.5 rounded-lg border border-accent/20 cursor-pointer"
              >
                Fill Manager (admin)
              </button>
              <button
                onClick={() => autofill('employee')}
                className="text-xs bg-primary/10 hover:bg-primary hover:text-white text-primary font-bold px-3 py-1.5 rounded-lg border border-primary/20 cursor-pointer"
              >
                Fill Employee (staff)
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t-2 border-dashed border-gray-200 pt-4 text-center">
            <p className="text-[11px] font-bold text-gray-500">
              Firebase Authentication mode active. Log in with user accounts created in the Firebase console.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
