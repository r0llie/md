import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { verifyLicense, getLicenseInfo, LicenseInfo, generateHWID } from './licenseService';

// Auth context için tip tanımlaması
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  licenseInfo: LicenseInfo | null;
  error: string | null;
  login: (licenseKey: string) => Promise<boolean>;
  logout: () => void;
}

// Context oluşturma
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider bileşeni
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Uygulama ilk açıldığında localStorage'dan lisans kontrolü
  useEffect(() => {
    const checkSavedLicense = async () => {
      try {
        setIsLoading(true);
        
        // Kayıtlı lisans anahtarını al
        const savedLicense = localStorage.getItem('fivem-license-key');
        if (!savedLicense) {
          setIsLoading(false);
          return;
        }

        // HWID bilgisini al
        const hwid = generateHWID();
        
        // Lisansı doğrula
        const isValid = await verifyLicense(savedLicense, hwid);
        
        if (isValid) {
          // Lisans bilgilerini getir
          const info = await getLicenseInfo(savedLicense, hwid);
          setLicenseInfo(info);
          setIsAuthenticated(true);
        } else {
          // Geçersiz lisans, localStorage'dan temizle
          localStorage.removeItem('fivem-license-key');
          localStorage.removeItem('fivem-hwid');
        }
      } catch (error) {
        console.error('Lisans kontrolü sırasında hata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSavedLicense();
  }, []);

  // Lisansla giriş yapma fonksiyonu
  const login = async (licenseKey: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // HWID oluştur
      const hwid = generateHWID();
      
      // Lisansı kontrol et
      const isValid = await verifyLicense(licenseKey, hwid);
      
      if (isValid) {
        // Lisans bilgilerini getir
        const info = await getLicenseInfo(licenseKey, hwid);
        
        // Lisans ve HWID bilgilerini kaydet
        localStorage.setItem('fivem-license-key', licenseKey);
        localStorage.setItem('fivem-hwid', hwid);
        
        setLicenseInfo(info);
        setIsAuthenticated(true);
        return true;
      } else {
        setError('Geçersiz lisans anahtarı veya bu cihaz için yetkilendirilmemiş.');
        return false;
      }
    } catch (error) {
      setError('Lisans doğrulama sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      console.error('Login hatası:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Çıkış yapma fonksiyonu
  const logout = () => {
    localStorage.removeItem('fivem-license-key');
    setIsAuthenticated(false);
    setLicenseInfo(null);
  };

  // Context değerleri
  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    licenseInfo,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Context hook'u
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 