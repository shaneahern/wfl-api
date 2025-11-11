import { useNavigate } from 'react-router-dom';

export function useLogout() {
  const navigate = useNavigate();

  const logout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin/login');
  };

  return logout;
}
