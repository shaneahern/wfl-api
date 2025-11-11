import { Link, useLocation } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';

export function AdminNav() {
  const logout = useLogout();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 mb-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-1">
            <Link
              to="/admin"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/admin') && !isActive('/admin/edit') && !isActive('/admin/list') && !isActive('/admin/delete-all')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Add New Bus
            </Link>
            <Link
              to="/admin/edit"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/admin/edit')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Edit Bus
            </Link>
            <Link
              to="/admin/list"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/admin/list')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              All Buses
            </Link>
            <Link
              to="/admin/delete-all"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/admin/delete-all')
                  ? 'bg-red-100 text-red-700'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              Delete All
            </Link>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
