import React, { useState, useEffect } from 'react';
import { useAuth } from './auth/AuthProvider';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const { login, error, isLoading } = useAuth();
  
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [savedLicense, setSavedLicense] = useState<string | null>(null);
  const [showStoredLicense, setShowStoredLicense] = useState<boolean>(false);
  
  // Kaydedilmiş lisans anahtarını kontrol et
  useEffect(() => {
    const storedLicense = localStorage.getItem('fivem-license-key');
    if (storedLicense) {
      setSavedLicense(storedLicense);
    }
  }, []);
  
  // Lisans anahtarı ile giriş yap
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;
    
    await login(licenseKey);
  };
  
  // Kaydedilmiş lisans ile giriş yap
  const loginWithSavedLicense = async () => {
    if (savedLicense) {
      await login(savedLicense);
    }
  };
  
  // Maskeli lisans anahtarı gösterimi
  const getMaskedLicense = (license: string) => {
    if (license.length <= 8) return '********';
    return `${license.substring(0, 4)}...${license.substring(license.length - 4)}`;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>FiveM Oyuncu Takip Paneli</h1>
          <div className="logo-badge">Premium</div>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="licenseKey">Lisans Anahtarı</label>
            <input
              id="licenseKey"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Lisans anahtarınızı girin"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          {savedLicense && (
            <div className="saved-license">
              <div className="saved-license-info">
                <span>Kaydedilmiş lisans: </span>
                <span className="license-mask">
                  {showStoredLicense ? savedLicense : getMaskedLicense(savedLicense)}
                </span>
                <button
                  type="button"
                  className="toggle-view"
                  onClick={() => setShowStoredLicense(!showStoredLicense)}
                >
                  {showStoredLicense ? 'Gizle' : 'Göster'}
                </button>
              </div>
              <button
                type="button"
                className="use-saved-button"
                onClick={loginWithSavedLicense}
                disabled={isLoading}
              >
                Bu lisans ile giriş yap
              </button>
            </div>
          )}
          
          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !licenseKey.trim()}
          >
            {isLoading ? (
              <div className="spinner-container">
                <div className="spinner"></div>
                <span>Doğrulanıyor...</span>
              </div>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>
        
        <div className="hwid-info">
          <h3>HWID Koruması</h3>
          <p>
            Bu uygulama donanım kimliği (HWID) koruması ile güvence altına alınmıştır.
            Her lisans sınırlı sayıda cihazda kullanılabilir.
          </p>
        </div>
        
        <div className="license-info">
          <div className="info-item">
            <div className="info-icon">🔒</div>
            <div className="info-text">
              <h4>Güvenli Erişim</h4>
              <p>HWID koruması ile lisansınız başkaları tarafından kullanılamaz.</p>
            </div>
          </div>
          
          <div className="info-item">
            <div className="info-icon">⚡</div>
            <div className="info-text">
              <h4>Premium Özellikler</h4>
              <p>Ekip tanıma, otomatik eşleştirme ve gerçek zamanlı güncelleme.</p>
            </div>
          </div>
          
          <div className="info-item">
            <div className="info-icon">📱</div>
            <div className="info-text">
              <h4>Birden Fazla Cihaz</h4>
              <p>Premium lisans ile 3 farklı cihazda kullanın.</p>
            </div>
          </div>
        </div>
        
        <div className="login-footer">
          <p>
            Lisans satın almak için <a href="https://example.com/license" target="_blank" rel="noreferrer">buraya tıklayın</a>
          </p>
          <p className="version">v1.2.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 