import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// Tip tanımlamaları
interface LicenseInfo {
  key: string;
  status: 'active' | 'expired' | 'suspended';
  type: 'premium' | 'standard' | 'trial';
  expiresAt: string | null;
  maxDevices: number;
  owner: string;
  purchasedAt: string;
}

interface DeviceRecord {
  licenseKey: string;
  hwid: string;
  registeredAt: string;
  lastUsed: string;
}

// Geçerli lisanslar (gerçek uygulamada bir veritabanında saklanacak)
// NOT: Bu dosya sunucu tarafında çalışacağı için client tarafından görünmeyecek
const VALID_LICENSES: Record<string, LicenseInfo> = {
  'FIVEM-PREM-2023-1234': {
    key: 'FIVEM-PREM-2023-1234',
    status: 'active',
    type: 'premium',
    expiresAt: null, // Süresiz
    maxDevices: 3,
    owner: 'Example User 1',
    purchasedAt: '2023-05-15T12:00:00Z'
  },
  'FIVEM-STD-2023-5678': {
    key: 'FIVEM-STD-2023-5678',
    status: 'active',
    type: 'standard',
    expiresAt: '2024-12-31T23:59:59Z',
    maxDevices: 1,
    owner: 'Example User 2',
    purchasedAt: '2023-08-22T14:30:00Z'
  },
  'FIVEM-TRIAL-2023-9012': {
    key: 'FIVEM-TRIAL-2023-9012',
    status: 'active',
    type: 'trial',
    expiresAt: '2023-11-30T23:59:59Z',
    maxDevices: 1,
    owner: 'Example User 3',
    purchasedAt: '2023-10-15T09:45:00Z'
  },
  // Test lisansı
  'TEST-LICENSE-KEY': {
    key: 'TEST-LICENSE-KEY',
    status: 'active',
    type: 'premium',
    expiresAt: null,
    maxDevices: 999,
    owner: 'Test User',
    purchasedAt: '2023-01-01T00:00:00Z'
  }
};

// Kayıtlı cihazlar (gerçek uygulamada bir veritabanında saklanacak)
let REGISTERED_DEVICES: DeviceRecord[] = [
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
 * Lisans anahtarı ve HWID'yi kontrol eden API
 * @param request Vercel isteği
 * @param response Vercel yanıtı
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS desteği
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // OPTIONS isteklerini yanıtla (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Sadece POST istekleri kabul edilir
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { action, licenseKey, hwid } = req.body;
    
    if (!action || !licenseKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }
    
    // API işlemleri
    switch (action) {
      case 'verify':
        return handleVerify(licenseKey, hwid, res);
      
      case 'info':
        return handleGetInfo(licenseKey, hwid, res);
      
      case 'register':
        return handleRegisterDevice(licenseKey, hwid, res);
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action' 
        });
    }
  } catch (error: any) {
    console.error('License API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  }
}

/**
 * Lisans anahtarını doğrula
 */
function handleVerify(licenseKey: string, hwid: string, res: VercelResponse) {
  // Lisans anahtarının var olup olmadığını kontrol et
  const licenseInfo = VALID_LICENSES[licenseKey];
  if (!licenseInfo) {
    return res.status(200).json({ 
      success: false, 
      error: 'Invalid license key' 
    });
  }
  
  // Lisansın durumunu kontrol et
  if (licenseInfo.status !== 'active') {
    return res.status(200).json({ 
      success: false, 
      error: `License is ${licenseInfo.status}` 
    });
  }
  
  // Lisansın süresinin dolup dolmadığını kontrol et
  if (licenseInfo.expiresAt) {
    const expiryDate = new Date(licenseInfo.expiresAt);
    const currentDate = new Date();
    if (currentDate > expiryDate) {
      return res.status(200).json({ 
        success: false, 
        error: 'License has expired' 
      });
    }
  }
  
  // Cihazın bu lisansa kayıtlı olup olmadığını kontrol et
  const registeredDevice = REGISTERED_DEVICES.find(
    device => device.licenseKey === licenseKey && device.hwid === hwid
  );
  
  if (registeredDevice) {
    // Cihaz zaten kayıtlı, son kullanım tarihini güncelle
    registeredDevice.lastUsed = new Date().toISOString();
    
    return res.status(200).json({ 
      success: true,
      message: 'License verified successfully'
    });
  } else {
    // Cihaz kayıtlı değil, kayıt yapılabilir mi kontrol et
    const deviceCount = REGISTERED_DEVICES.filter(
      device => device.licenseKey === licenseKey
    ).length;
    
    if (deviceCount < licenseInfo.maxDevices) {
      // Yeni cihaz kayıt yapılabilir
      return res.status(200).json({ 
        success: true,
        canRegister: true,
        message: 'Device can be registered with this license'
      });
    } else {
      // Maksimum cihaz sayısına ulaşıldı
      return res.status(200).json({ 
        success: false, 
        error: 'Maximum device limit reached for this license',
        maxDevices: licenseInfo.maxDevices
      });
    }
  }
}

/**
 * Lisans bilgilerini getir
 */
function handleGetInfo(licenseKey: string, hwid: string, res: VercelResponse) {
  // Lisans anahtarının var olup olmadığını kontrol et
  const licenseInfo = VALID_LICENSES[licenseKey];
  if (!licenseInfo) {
    return res.status(200).json({ 
      success: false, 
      error: 'Invalid license key' 
    });
  }
  
  // Cihazın bu lisansa kayıtlı olup olmadığını kontrol et
  const isDeviceRegistered = REGISTERED_DEVICES.some(
    device => device.licenseKey === licenseKey && device.hwid === hwid
  );
  
  if (!isDeviceRegistered) {
    return res.status(200).json({ 
      success: false, 
      error: 'Device not registered with this license' 
    });
  }
  
  // Lisans bilgilerini maskele/filtrele
  const safeInfo = {
    status: licenseInfo.status,
    type: licenseInfo.type,
    expiresAt: licenseInfo.expiresAt,
    maxDevices: licenseInfo.maxDevices,
    totalDevices: REGISTERED_DEVICES.filter(d => d.licenseKey === licenseKey).length
  };
  
  return res.status(200).json({ 
    success: true,
    license: safeInfo
  });
}

/**
 * Yeni cihaz kaydı yap
 */
function handleRegisterDevice(licenseKey: string, hwid: string, res: VercelResponse) {
  // Lisans anahtarının var olup olmadığını kontrol et
  const licenseInfo = VALID_LICENSES[licenseKey];
  if (!licenseInfo) {
    return res.status(200).json({ 
      success: false, 
      error: 'Invalid license key' 
    });
  }
  
  // Cihazın zaten kayıtlı olup olmadığını kontrol et
  const existingDevice = REGISTERED_DEVICES.find(
    device => device.licenseKey === licenseKey && device.hwid === hwid
  );
  
  if (existingDevice) {
    // Cihaz zaten kayıtlı
    return res.status(200).json({ 
      success: true,
      message: 'Device already registered with this license'
    });
  }
  
  // Kayıtlı cihaz sayısını kontrol et
  const deviceCount = REGISTERED_DEVICES.filter(
    device => device.licenseKey === licenseKey
  ).length;
  
  if (deviceCount >= licenseInfo.maxDevices) {
    return res.status(200).json({ 
      success: false, 
      error: 'Maximum device limit reached for this license',
      maxDevices: licenseInfo.maxDevices
    });
  }
  
  // Yeni cihazı kaydet
  const newDevice: DeviceRecord = {
    licenseKey,
    hwid,
    registeredAt: new Date().toISOString(),
    lastUsed: new Date().toISOString()
  };
  
  REGISTERED_DEVICES.push(newDevice);
  
  return res.status(200).json({ 
    success: true,
    message: 'Device registered successfully'
  });
} 