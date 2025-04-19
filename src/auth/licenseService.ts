// Lisans bilgisi için tip tanımlaması
export interface LicenseInfo {
  key: string;
  status: 'active' | 'expired' | 'suspended';
  type: 'premium' | 'standard' | 'trial';
  expiresAt: string | null; // ISO string formatında tarih veya null (süresiz)
  maxDevices: number;
  registeredDevices: number;
  owner: string;
  purchasedAt: string; // ISO string formatında tarih
}

// Geçerli lisanslar (gerçek uygulamada bu bir veritabanında olmalı)
const VALID_LICENSES: Record<string, LicenseInfo> = {
  'FIVEM-FORZ-ATAT-1923': {
    key: 'FIVEM-FORZ-ATAT-1923',
    status: 'active',
    type: 'premium',
    expiresAt: null, // Süresiz
    maxDevices: 30,
    registeredDevices: 1,
    owner: 'Example User 1',
    purchasedAt: '2023-05-15T12:00:00Z'
  },
  'FIVEM-STD-2023-5678': {
    key: 'FIVEM-STD-2023-5678',
    status: 'active',
    type: 'standard',
    expiresAt: '2024-12-31T23:59:59Z',
    maxDevices: 1,
    registeredDevices: 0,
    owner: 'Example User 2',
    purchasedAt: '2023-08-22T14:30:00Z'
  },
  'FIVEM-TRIAL-2023-9012': {
    key: 'FIVEM-TRIAL-2023-9012',
    status: 'active',
    type: 'trial',
    expiresAt: '2023-11-30T23:59:59Z',
    maxDevices: 1,
    registeredDevices: 0,
    owner: 'Example User 3',
    purchasedAt: '2023-10-15T09:45:00Z'
  },
  // Test lisansı (her zaman çalışacak)
  'TEST-LICENSE-KEY': {
    key: 'TEST-LICENSE-KEY',
    status: 'active',
    type: 'premium',
    expiresAt: null,
    maxDevices: 999,
    registeredDevices: 1,
    owner: 'Test User',
    purchasedAt: '2023-01-01T00:00:00Z'
  }
};

// HWID'lerin eşleştirildiği cihazlar (gerçek uygulamada bu bir veritabanında olmalı)
interface DeviceRegistration {
  licenseKey: string;
  hwid: string;
  registeredAt: string; // ISO string formatında tarih
  lastUsed: string; // ISO string formatında tarih
}

// Kayıtlı cihazlar (gerçek uygulamada bu bir veritabanında olmalı)
const REGISTERED_DEVICES: DeviceRegistration[] = [
  {
    licenseKey: 'FIVEM-PREM-2023-1234',
    hwid: 'example-hwid-1',
    registeredAt: '2023-05-15T12:05:00Z',
    lastUsed: '2023-10-28T18:22:15Z'
  },
  {
    licenseKey: 'TEST-LICENSE-KEY',
    hwid: 'test-hwid',
    registeredAt: '2023-01-01T00:00:00Z',
    lastUsed: '2023-01-01T00:00:00Z'
  }
];

/**
 * Benzersiz donanım kimliği (HWID) oluşturur
 * @returns Cihaz için benzersiz bir kimlik
 */
export function generateHWID(): string {
  // Tarayıcı ve sistem bilgilerinden benzersiz bir kimlik oluştur
  const userAgent = navigator.userAgent;
  const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  
  // Ek bilgiler (mümkünse)
  const cpuCores = navigator.hardwareConcurrency || 0;
  const deviceMemory = (navigator as any).deviceMemory || 0;
  
  // Bu bilgileri birleştir ve hash'le
  const deviceInfo = `${userAgent}|${screenInfo}|${timezone}|${language}|${cpuCores}|${deviceMemory}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < deviceInfo.length; i++) {
    const char = deviceInfo.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer
  }
  
  // Hex formatına dönüştür
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  
  // Karmaşıklığı artırmak için bir timestamp ekle (ancak değiştirilemez bilgilerle karıştır)
  const staticPart = hashHex;
  const timestamp = Date.now().toString(36).slice(-4);
  
  return `FV-${staticPart}-${timestamp}`.toUpperCase();
}

/**
 * Verilen lisans anahtarının geçerliliğini kontrol eder
 * @param licenseKey Kontrol edilecek lisans anahtarı
 * @param hwid Cihazın donanım kimliği
 * @returns Lisansın geçerli olup olmadığı
 */
export async function verifyLicense(licenseKey: string, hwid: string): Promise<boolean> {
  // Gerçek uygulamada bu, bir API isteği üzerinden doğrulama yapar
  
  // Simüle edilmiş ağ gecikmesi (gerçekçilik için)
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
  // Test anahtarı için özel durum
  if (licenseKey === 'TEST-LICENSE-KEY') {
    return true;
  }
  
  // Lisans anahtarının var olup olmadığını kontrol et
  const licenseInfo = VALID_LICENSES[licenseKey];
  if (!licenseInfo) {
    return false;
  }
  
  // Lisansın durumunu kontrol et
  if (licenseInfo.status !== 'active') {
    return false;
  }
  
  // Lisansın süresinin dolup dolmadığını kontrol et
  if (licenseInfo.expiresAt) {
    const expiryDate = new Date(licenseInfo.expiresAt);
    const currentDate = new Date();
    if (currentDate > expiryDate) {
      return false;
    }
  }
  
  // Cihazın bu lisansa kayıtlı olup olmadığını veya yeni kayıt yapılabilir mi diye kontrol et
  const registeredDevice = REGISTERED_DEVICES.find(
    device => device.licenseKey === licenseKey && device.hwid === hwid
  );
  
  if (registeredDevice) {
    // Cihaz zaten kayıtlı, kullanıma devam edilebilir
    return true;
  } else {
    // Cihaz kayıtlı değil, yeni kayıt yapılabilir mi kontrol et
    const deviceCount = REGISTERED_DEVICES.filter(
      device => device.licenseKey === licenseKey
    ).length;
    
    // Maksimum cihaz sayısını aşmıyorsa kayıt yapılabilir
    return deviceCount < licenseInfo.maxDevices;
  }
}

/**
 * Lisans bilgilerini getirir
 * @param licenseKey Lisans anahtarı
 * @param hwid Cihazın donanım kimliği
 * @returns Lisans bilgileri veya null
 */
export async function getLicenseInfo(licenseKey: string, hwid: string): Promise<LicenseInfo | null> {
  // Gerçek uygulamada bu, bir API isteği üzerinden bilgileri getirir
  
  // Simüle edilmiş ağ gecikmesi (gerçekçilik için)
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  // Test anahtarı için özel durum
  if (licenseKey === 'TEST-LICENSE-KEY') {
    return VALID_LICENSES[licenseKey];
  }
  
  // Lisans anahtarının var olup olmadığını kontrol et
  const licenseInfo = VALID_LICENSES[licenseKey];
  if (!licenseInfo) {
    return null;
  }
  
  // Lisansın durumunu kontrol et
  if (licenseInfo.status !== 'active') {
    return null;
  }
  
  // Lisansın süresinin dolup dolmadığını kontrol et
  if (licenseInfo.expiresAt) {
    const expiryDate = new Date(licenseInfo.expiresAt);
    const currentDate = new Date();
    if (currentDate > expiryDate) {
      return null;
    }
  }
  
  return licenseInfo;
}

/**
 * Yeni bir cihazı lisansa kaydeder
 * @param licenseKey Lisans anahtarı
 * @param hwid Cihazın donanım kimliği
 * @returns Kayıt işleminin başarılı olup olmadığı
 */
export async function registerDevice(licenseKey: string, hwid: string): Promise<boolean> {
  // Gerçek uygulamada bu, bir API isteği üzerinden kayıt yapar
  
  // Simüle edilmiş ağ gecikmesi (gerçekçilik için)
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
  
  // Lisans anahtarının var olup olmadığını kontrol et
  const licenseInfo = VALID_LICENSES[licenseKey];
  if (!licenseInfo) {
    return false;
  }
  
  // Cihazın zaten kayıtlı olup olmadığını kontrol et
  const isAlreadyRegistered = REGISTERED_DEVICES.some(
    device => device.licenseKey === licenseKey && device.hwid === hwid
  );
  
  if (isAlreadyRegistered) {
    return true; // Zaten kayıtlı
  }
  
  // Kayıtlı cihaz sayısını kontrol et
  const deviceCount = REGISTERED_DEVICES.filter(
    device => device.licenseKey === licenseKey
  ).length;
  
  // Maksimum cihaz sayısını aşıyorsa kayıt yapılamaz
  if (deviceCount >= licenseInfo.maxDevices) {
    return false;
  }
  
  // Yeni cihazı kaydet (gerçek uygulamada veritabanına kaydedilir)
  REGISTERED_DEVICES.push({
    licenseKey,
    hwid,
    registeredAt: new Date().toISOString(),
    lastUsed: new Date().toISOString()
  });
  
  return true;
} 