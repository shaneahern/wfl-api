import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BusFinder } from './pages/BusFinder';
import { Help } from './pages/Help';
import { BusInput } from './pages/admin/BusInput';
import { BusEdit } from './pages/admin/BusEdit';
import { BusList } from './pages/admin/BusList';
import { AllBuses } from './pages/admin/AllBuses';
import { DeleteAllBuses } from './pages/admin/DeleteAllBuses';
import { AdminLogin } from './pages/admin/AdminLogin';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BusFinder />} />
        <Route path="/help" element={<Help />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <BusInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/input"
          element={
            <ProtectedRoute>
              <BusInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/edit"
          element={
            <ProtectedRoute>
              <BusEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/list"
          element={
            <ProtectedRoute>
              <BusList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/all"
          element={
            <ProtectedRoute>
              <AllBuses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/delete-all"
          element={
            <ProtectedRoute>
              <DeleteAllBuses />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
