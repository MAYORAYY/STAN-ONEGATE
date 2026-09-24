import axios from 'axios';

interface SessionResult {
  portalSession: string | null;
  lmsSession: string | null;
}

async function loginPortalAkademik(nim: string, password: string): Promise<string> {
  const loginUrl = 'https://portal.pknstan.ac.id/auth/masuk';
  
  const payload = new URLSearchParams();
  payload.append('identity', nim);
  payload.append('password', password);
  payload.append('submit', 'Masuk');

  const response = await axios.post(loginUrl, payload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400
});

console.log('[identity] Login portal:', {
  status: response.status,
  redirectedTo: response.headers['location'] || null,
  hasCookies: Boolean(response.headers['set-cookie']?.length)
});

const cookies = response.headers['set-cookie'];
  if (!cookies || cookies.length === 0) {
    throw new Error('Gagal mendapatkan sesi Portal: Cookie tidak ditemukan');
  }
  
  return cookies.map(cookie => cookie.split(';')[0]).join('; ');
}

async function loginLMS(nim: string, password: string): Promise<string> {
  const loginUrl = 'https://lms.pknstan.ac.id/login/index.php';

  // Tahap 1: Akses halaman login untuk mengambil 'MoodleSession' tamu dan 'logintoken'
  const getResponse = await axios.get(loginUrl);
  const initialCookies = getResponse.headers['set-cookie'];
  
  if (!initialCookies) {
    throw new Error('Gagal mendapatkan inisial cookie LMS');
  }
  const cookieString = initialCookies.map(c => c.split(';')[0]).join('; ');

  // Ekstraksi logintoken menggunakan Regex dari respon HTML
  const tokenMatch = getResponse.data.match(/name="logintoken"\s+value="([^"]+)"/);
  if (!tokenMatch) {
    throw new Error('Gagal menemukan logintoken LMS dari HTML');
  }
  const logintoken = tokenMatch[1];

  // Tahap 2: Eksekusi login dengan payload lengkap dan menumpang pada cookie sesi tamu
  const payload = new URLSearchParams();
  payload.append('anchor', '');
  payload.append('logintoken', logintoken);
  payload.append('username', nim);
  payload.append('password', password);

  const postResponse = await axios.post(loginUrl, payload, {
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieString // Sangat penting: Server akan menolak logintoken jika cookie tamu tidak dikembalikan
    },
    maxRedirects: 0, // Kita mengincar status 303 (Redirect sukses dari Moodle)
    validateStatus: (status) => status >= 200 && status < 400
  });

  // Ambil MoodleSession baru yang sudah memiliki otorisasi (login berhasil)
  const authCookies = postResponse.headers['set-cookie'];
  if (!authCookies) {
    throw new Error('Gagal mendapatkan sesi otentikasi paska-login LMS');
  }

  return authCookies.map(c => c.split(';')[0]).join('; ');
}

export async function extractSessions(nim: string, password: string): Promise<SessionResult> {
  const [portalResult, lmsResult] = await Promise.allSettled([
    loginPortalAkademik(nim, password),
    loginLMS(nim, password),
  ]);

  const result = {
    portalSession: portalResult.status === 'fulfilled' ? portalResult.value : null,
    lmsSession: lmsResult.status === 'fulfilled' ? lmsResult.value : null,
  };

  console.log('[identity] Hasil ekstraksi sesi:', {
    portalSession: Boolean(result.portalSession),
    lmsSession: Boolean(result.lmsSession)
  });

  return result;
}