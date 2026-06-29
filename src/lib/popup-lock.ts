// Ensures at most one newsletter/subscribe popup is visible per session.
// Each popup calls acquirePopupLock() before showing — returns false if
// another popup already fired this session. Call releasePopupLock() on dismiss
// so the slot opens again (e.g. user dismisses quickly, next one can retry).

const SESSION_KEY = "dn_popup_lock";

export function acquirePopupLock(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    sessionStorage.setItem(SESSION_KEY, "1");
    return true;
  } catch {
    return true; // storage disabled — let popup proceed
  }
}

export function releasePopupLock() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}
