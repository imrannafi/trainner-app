import { supabase } from '../lib/supabase';

// Public half of the VAPID key pair (safe to expose). NEXT_PUBLIC_ is accepted like the Supabase settings.
const env = import.meta.env as Record<string, string | undefined>;
const VAPID_PUBLIC_KEY = (env.VITE_VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();

export type PushState =
  | 'unsupported' // browser has no Web Push
  | 'needs-install' // iPhone/iPad: push only works once the app is added to the Home Screen
  | 'not-configured' // the app was built without a VAPID public key
  | 'denied' // the user blocked notifications for this site
  | 'enabled'
  | 'disabled';

export interface PushServerStatus {
  configured: boolean;
}

const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const keyIsValid = (() => {
  try {
    return urlBase64ToUint8Array(VAPID_PUBLIC_KEY).length === 65;
  } catch {
    return false;
  }
})();

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    registration.update().catch(() => undefined);
  } catch (e) {
    console.error('Service worker registration failed', e);
  }
};

const getRegistration = async () =>
  (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));

/** True when an existing subscription was made with a different VAPID key (e.g. keys were rotated). */
const usesOtherKey = (subscription: PushSubscription) => {
  const existing = subscription.options?.applicationServerKey;
  if (!existing) return false;
  const a = new Uint8Array(existing);
  const b = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  return a.length !== b.length || a.some((v, i) => v !== b[i]);
};

export const getPushState = async (): Promise<PushState> => {
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!supported()) return 'unsupported';
  if (!keyIsValid) return 'not-configured';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && !usesOtherKey(subscription) && Notification.permission === 'granted' ? 'enabled' : 'disabled';
};

/** Whether the server side (Edge Function + database settings) is ready to deliver pushes. */
export const getPushServerStatus = async (): Promise<PushServerStatus | null> => {
  const { data, error } = await supabase.rpc('push_server_status');
  if (error) return null; // older database without the status function: unknown, not "broken"
  return { configured: Boolean((data as { configured?: boolean })?.configured) };
};

const saveSubscription = async (subscription: PushSubscription) => {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to enable notifications.');
  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: auth.user.id,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      user_agent: navigator.userAgent.slice(0, 300)
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw new Error(`Could not save this device: ${error.message}`);
};

const subscribe = async (registration: ServiceWorkerRegistration) => {
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && usesOtherKey(subscription)) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    await subscription.unsubscribe();
    subscription = null;
  }
  if (subscription) return subscription;
  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  } catch (e) {
    const name = (e as DOMException).name;
    if (name === 'NotAllowedError') throw new Error('Notifications are blocked for this site.');
    if (name === 'AbortError')
      throw new Error('The browser could not reach its push service. Check your connection, or try Chrome or Safari.');
    throw new Error(`Could not turn on notifications: ${(e as Error).message}`);
  }
};

/** Must be called from a click: browsers only show the permission prompt after a user gesture. */
export const enablePush = async (): Promise<PushState> => {
  const state = await getPushState();
  if (state === 'unsupported' || state === 'needs-install' || state === 'not-configured') return state;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'disabled';

  const registration = await getRegistration();
  await navigator.serviceWorker.ready;
  const subscription = await subscribe(registration);
  await saveSubscription(subscription);
  return 'enabled';
};

export const disablePush = async (): Promise<PushState> => {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    await subscription.unsubscribe();
  }
  return 'disabled';
};

/** Sends the signed-in user a real notification through the full server path. */
export const sendTestNotification = async (): Promise<PushServerStatus> => {
  const { data, error } = await supabase.rpc('send_test_notification');
  if (error) {
    if (error.code === 'PGRST202') throw new Error('The test feature needs the latest database update (see README).');
    throw new Error(error.message);
  }
  return { configured: Boolean((data as { configured?: boolean })?.configured) };
};

/** Re-links this browser's subscription to whoever is now signed in, renewing it if the key changed. */
export const refreshPushSubscription = async () => {
  if (!supported() || !keyIsValid || Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) return;
    await saveSubscription(usesOtherKey(existing) ? await subscribe(registration) : existing);
  } catch (e) {
    console.error(e);
  }
};

/** On sign-out, stop this device receiving the previous user's notifications. */
export const detachPushSubscription = async () => {
  if (!supported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  }
};
