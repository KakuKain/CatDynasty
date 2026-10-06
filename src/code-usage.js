const lifetime = 365 * 24 * 60 * 60;
const cookieName = mode => `catdynasty_used_codes_v1_${mode === 'demo' ? 'demo' : 'real'}`;

function readUsedCodes(cookie, mode) {
  const prefix = `${cookieName(mode)}=`;
  const entry = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(prefix));
  if (!entry) return new Set();
  try {
    const values = JSON.parse(decodeURIComponent(entry.slice(prefix.length)));
    return new Set(Array.isArray(values) ? values.filter(id => typeof id === 'string' && id.length > 0 && id.length <= 100) : []);
  } catch {
    return new Set();
  }
}

// Personal bookkeeping stays in a host-only cookie, separate from shared validity data.
export function createCodeUsageStore({document, path = '/', secure = false}) {
  const read = mode => {
    try { return readUsedCodes(document.cookie, mode); }
    catch { return new Set(); }
  };
  return {
    read,
    set(mode, id, used) {
      if (typeof id !== 'string' || !id || id.length > 100) return false;
      try {
        const values = readUsedCodes(document.cookie, mode);
        if (used) values.add(id);
        else values.delete(id);
        const value = encodeURIComponent(JSON.stringify([...values]));
        const pair = `${cookieName(mode)}=${value}`;
        if (pair.length > 3800) return false;
        document.cookie = `${pair}; Path=${path}; Max-Age=${values.size ? lifetime : 0}; SameSite=Lax${secure ? '; Secure' : ''}`;
        return readUsedCodes(document.cookie, mode).has(id) === Boolean(used);
      } catch {
        return false;
      }
    }
  };
}
