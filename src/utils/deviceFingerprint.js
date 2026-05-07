// Generates a stable SHA-256 fingerprint from immutable browser/device characteristics.
// The same device + browser will consistently produce the same hash across sessions.
export const generateDeviceFingerprint = async () => {
  const components = [
    navigator.userAgent,
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.platform,
    String(navigator.hardwareConcurrency || ''),
    String(new Date().getTimezoneOffset())
  ].join('||');

  try {
    const encoded = new TextEncoder().encode(components);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback: return a deterministic but less secure string
    return btoa(components).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
  }
};

// Returns a human-readable label for the device based on the user-agent.
export const getDeviceLabel = (userAgent = '') => {
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone'))  return 'iPhone';
  if (ua.includes('ipad'))    return 'iPad';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('mac'))     return 'Mac';
  if (ua.includes('linux'))   return 'Linux';
  return 'Unknown device';
};

// Returns the likely biometric type based on the user-agent.
// iOS devices prioritise Face ID (or Touch ID on older models).
export const getBiometricLabel = (userAgent = '') => {
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'Face ID / Touch ID';
  if (ua.includes('android'))  return 'Fingerprint';
  if (ua.includes('windows'))  return 'Windows Hello';
  return 'Biometric';
};
