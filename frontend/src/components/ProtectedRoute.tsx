import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const authHeader = sessionStorage.getItem('adminAuth');
      
      if (!authHeader) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        // Try to access a protected endpoint to verify auth
        const response = await fetch('/admin/index.html', {
          method: 'HEAD',
          headers: {
            Authorization: authHeader,
          },
        });
        
        if (response.status === 401) {
          sessionStorage.removeItem('adminAuth');
          setIsAuthenticated(false);
        } else if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
