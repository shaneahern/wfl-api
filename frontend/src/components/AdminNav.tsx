import { Link, useLocation } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';

export function AdminNav() {
  const logout = useLogout();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 mb-4 md:mb-6">
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            <Link
              to="/admin"
              className={`px-3 py-2 md:px-4 rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
                isActive('/admin') && !isActive('/admin/edit') && !isActive('/admin/list') && !isActive('/admin/settings')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Add
            </Link>
            <Link
              to="/admin/edit"
              className={`px-3 py-2 md:px-4 rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
                isActive('/admin/edit')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Edit
            </Link>
            <Link
              to="/admin/list"
              className={`px-3 py-2 md:px-4 rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
                isActive('/admin/list')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              View All
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/settings"
              className={`p-2 rounded-lg transition-colors ${
                isActive('/admin/settings')
                  ? 'bg-gray-100 text-gray-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-label="Settings"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
            <button
              onClick={logout}
              className="px-3 py-2 md:px-4 text-xs md:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
