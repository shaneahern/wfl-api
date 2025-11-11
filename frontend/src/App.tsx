import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BusFinder } from './pages/BusFinder';
import { Help } from './pages/Help';
import { BusInput } from './pages/admin/BusInput';
import { BusEdit } from './pages/admin/BusEdit';
import { AllBuses } from './pages/admin/AllBuses';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BusFinder />} />
        <Route path="/help" element={<Help />} />
        <Route path="/admin" element={<BusInput />} />
        <Route path="/admin/input" element={<BusInput />} />
        <Route path="/admin/edit" element={<BusEdit />} />
        <Route path="/admin/all" element={<AllBuses />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
