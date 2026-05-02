import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldX, Home, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const attemptedUrl = location.state?.from || '/admin';
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-600" />
        </div>
        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Access Denied – Admin Only
        </h1>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
          <Lock className="w-4 h-4" />
          <span>This area requires administrator privileges</span>
        </div>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          You don&apos;t have permission to view this page. If you believe this
          is an error, please contact your system administrator.
        </p>
        {/* User info */}
        {user && (
          <div className="bg-slate-50 p-4 rounded-xl mb-6 text-left space-y-1">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                Logged in as:
              </span>
              {''}
              {user.name}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Role:</span>
              {''}
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                  user.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {user.role}
              </span>
            </p>
          </div>
        )}
        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 px-4 text-slate-600 font-semibold hover:bg-slate-50 :bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
        {/* Login prompt for unauthenticated visitors who land here */}
        {!user && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-3">
              You may need to log in with an admin account
            </p>
            <button
              onClick={() =>
                navigate('/login', { state: { from: attemptedUrl } })
              }
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 :bg-slate-100 text-white font-semibold rounded-xl transition-colors"
            >
              Log In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default UnauthorizedPage;
