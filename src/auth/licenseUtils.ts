// Hardware ID (HWID) oluşturmak için kullanılacak util fonksiyonları

/**
 * Tarayıcı ve cihaz bilgilerine dayanarak bir HWID (Hardware ID) oluşturur
 * Bu, her kullanıcı için benzersiz bir cihaz kimliği sağlar
 */
export async function generateHWID(): Promise<string> {
  try {
    // Kullanıcı tarayıcısı ve cihazı hakkında bilgi topla
    const navigatorInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory || '',
      cpuClass: (navigator as any).cpuClass || '',
      vendor: navigator.vendor,
      plugins: Array.from(navigator.plugins || []).map(p => p.name).join(','),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      screenDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Canvas fingerprinting - daha fazla benzersizlik için
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 10, 100, 30);
      ctx.fillStyle = '#069';
      ctx.fillText('HWID Generator', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('HWID Generator', 4, 17);
    }
    const canvasData = canvas.toDataURL();

    // Tüm topladığımız verileri birleştir
    const hwidData = JSON.stringify({
      ...navigatorInfo,
      canvasFingerprint: canvasData
    });

    // Verilerden bir hash oluştur
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(hwidData)
    );

    // Hash'i hex string formatına çevir
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    console.error('HWID oluşturma hatası:', error);
    // Fallback - bu daha az güvenli ama en azından bir değer döndürür
    return `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;
  }
}

/**
 * API'den lisans doğrulama yapar
 * @param license - Lisans anahtarı
 * @param hwid - Donanım kimliği
 * @returns Lisansın geçerli olup olmadığı
 */
export async function validateLicense(license: string, hwid: string): Promise<boolean> {
  try {
    // API URL'i - gerçekte kendi API'nize işaret etmeli
    const API_URL = 'https://api.example.com/license/validate';

    // API isteği gönder
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        license,
        hwid,
      }),
    });

    if (!response.ok) {
      throw new Error('API yanıt vermedi');
    }

    const data = await response.json();
    return data.isValid;
    
  } catch (error) {
    console.error('Lisans doğrulama hatası:', error);
    
    // DEV MODE - Gerçek uygulamada bu always-true modunu KALDIR
    // Bu sadece geliştirme amaçlıdır!
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      // Geliştirme modunda basit doğrulama yap - ilk 4 karakter kontrol et
      const VALID_PREFIX = 'FVTG'; // Örnek bir lisans prefix'i
      return license.startsWith(VALID_PREFIX);
    }
    
    // DEMO MODE - Örnek lisansları tanımla (GERÇEĞİNDE BU FONKSİYONU KALDIR)
    const validLicenses = [
      'FVTG-1234-5678-9ABC-DEF0',
      'FVTG-DEMO-ABCD-EFGH-IJKL'
    ];
    
    if (validLicenses.includes(license)) {
      // Lisans ve HWID eşleşmesini kaydet
      localStorage.setItem(`license_hwid_${license}`, hwid);
      return true;
    }
    
    // Önceden kaydedilmiş bir HWID var mı?
    const savedHWID = localStorage.getItem(`license_hwid_${license}`);
    if (savedHWID && savedHWID === hwid) {
      return true;
    }
    
    return false;
  }
}

/**
 * Lisans anahtarı formatını kontrol eder
 * @param license - Kontrol edilecek lisans anahtarı
 * @returns Lisans formatının doğru olup olmadığı
 */
export function isValidLicenseFormat(license: string): boolean {
  // Örnek format: XXXX-XXXX-XXXX-XXXX-XXXX
  const LICENSE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return LICENSE_PATTERN.test(license);
}

/**
 * Lisans anahtarını formatlar (kullanıcı girişini düzenler)
 * @param input - Formatlanacak kullanıcı girişi
 * @returns Formatlanmış lisans
 */
export function formatLicenseInput(input: string): string {
  // Tüm boşlukları ve tire işaretlerini kaldır
  const cleaned = input.replace(/[\s-]/g, '').toUpperCase();
  
  // 4'er karakter grupları halinde ayır ve araya tire ekle
  const chunks = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    chunks.push(cleaned.substring(i, i + 4));
  }
  
  return chunks.join('-');
} 