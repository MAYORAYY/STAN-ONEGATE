import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Impor semua halaman
import LoginView from './pages/LoginView';
import DashboardView from './pages/DashboardView';
import AcademicView from './pages/AcademicView';
import AttendanceView from './pages/AttendanceView';
import LmsView from './pages/LmsView';
import AsetView from './pages/AsetView';
import LmsAssignView from './pages/LmsAssignView';
import KarakterView from './pages/KarakterView';
import HelpdeskView from './pages/HelpdeskView';
import ProfileView from './pages/ProfileView'; // PASTIKAN BARIS INI ADA

// Impor komponen pembungkus
import Layout from './components/Layout';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Rute Publik */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginView />} />
        
        {/* Rute Terproteksi (Dibungkus Layout) */}
        <Route path="/dashboard" element={<Layout><DashboardView /></Layout>} />
        <Route path="/akademik" element={<Layout><AcademicView /></Layout>} />
        <Route path="/presensi" element={<Layout><AttendanceView /></Layout>} />
        <Route path="/lms" element={<Layout><LmsView /></Layout>} />
        
        {/* Rute Detail LMS (harus dibungkus layout juga agar tidak blank) */}
        <Route path="/lms/assign/:assignId" element={<Layout><LmsAssignView /></Layout>} />
        
        <Route path="/aset" element={<Layout><AsetView /></Layout>} />
        <Route path="/karakter" element={<Layout><KarakterView /></Layout>} />
        <Route path="/helpdesk" element={<Layout><HelpdeskView /></Layout>} />
        
        {/* Rute Profil */}
        <Route path="/profil" element={<Layout><ProfileView /></Layout>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);