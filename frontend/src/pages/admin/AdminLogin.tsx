import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin';

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      const authHeader = sessionStorage.getItem('adminAuth');
      if (!authHeader) return;

      try {
        const response = await fetch('/admin/index.html', {
          method: 'HEAD',
          headers: {
            Authorization: authHeader,
          },
        });
        if (response.ok) {
          navigate(from, { replace: true });
        }
      } catch {
        // Not authenticated, show login form
      }
    };
    checkAuth();
  }, [navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authHeader = `Basic ${btoa(`${username}:${password}`)}`;
      
      // Try to access admin endpoint with credentials
      const response = await fetch('/admin/index.html', {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        // Success - store credentials and navigate to admin page
        sessionStorage.setItem('adminAuth', authHeader);
        navigate(from, { replace: true });
      } else if (response.status === 401) {
        setError('Invalid username or password');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('Failed to authenticate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-primary-700 mb-2">Admin Login</h1>
        <p className="text-gray-600 mb-6">Enter your credentials to access the admin panel</p>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
