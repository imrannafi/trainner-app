import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushState = 'unsupported' | 'not-configured' | 'denied' | 'enabled' | 'disabled';

const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.error('Service worker registration failed', e);
  }
};

export const getPushState = async (): Promise<PushState> => {
  if (!supported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'not-configured';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === 'granted' ? 'enabled' : 'disabled';
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

/** Must be called from a click: browsers only show the permission prompt after a user gesture. */
export const enablePush = async (): Promise<PushState> => {
  if (!supported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'not-configured';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'disabled';

  const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }));
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

/** Re-links an existing browser subscription to whoever is now signed in on this device. */
export const refreshPushSubscription = async () => {
  if (!supported() || !VAPID_PUBLIC_KEY || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await saveSubscription(subscription).catch((e) => console.error(e));
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
