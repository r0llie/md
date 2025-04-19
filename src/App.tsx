import React from 'react';
import PlayerList from './PlayerList';
import LoginPage from './LoginPage';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import './App.css';

// Ana uygulama içeriği - autentication'a göre farklı içerik gösterilecek
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Yükleme durumu
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  // Kullanıcı giriş yapmışsa PlayerList, yapmamışsa LoginPage göster
  return isAuthenticated ? <PlayerList /> : <LoginPage />;
};

// Ana App bileşeni
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
