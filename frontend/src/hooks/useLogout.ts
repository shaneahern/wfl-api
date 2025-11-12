import { useNavigate } from 'react-router-dom';

export function useLogout() {
  const navigate = useNavigate();

  const logout = () => {
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminUsername');
    sessionStorage.removeItem('isSuperadmin');
    navigate('/admin/login');
  };

  return logout;
}
