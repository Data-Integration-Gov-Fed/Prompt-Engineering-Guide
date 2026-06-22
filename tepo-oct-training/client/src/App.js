import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Modules from './pages/Modules';
import ModuleDetail from './pages/ModuleDetail';
import Supervisor from './pages/Supervisor';

function RequireAuth({ children }) {
  const tech = localStorage.getItem('tepo_tech');
  return tech ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/modules" element={<RequireAuth><Modules /></RequireAuth>} />
        <Route path="/module/:id" element={<RequireAuth><ModuleDetail /></RequireAuth>} />
        <Route path="/supervisor" element={<Supervisor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
