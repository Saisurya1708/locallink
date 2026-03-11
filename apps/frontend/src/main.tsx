import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/globals.css';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Feed } from './pages/Feed';
import { PostRequest } from './pages/PostRequest';
import { RequestDetail } from './pages/RequestDetail';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { useStore } from './store/useStore';
import { useSocket } from './hooks/useSocket';

function AppRoutes() {
  const user = useStore(s => s.user);
  useSocket(); // Keep socket alive while logged in

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/feed" replace /> : <Landing />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/feed" replace />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/feed" replace />} />
        <Route path="/feed" element={user ? <Feed /> : <Navigate to="/login" replace />} />
        <Route path="/post" element={user ? <PostRequest /> : <Navigate to="/login" replace />} />
        <Route path="/requests/:id" element={user ? <RequestDetail /> : <Navigate to="/login" replace />} />
        <Route path="/chat/:requestId" element={user ? <Chat /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
