export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const register = (): void => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('No se pudo registrar el service worker', err);
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
