import { useEffect, useState } from "react";

let scriptLoading = false;
let scriptLoaded = false;
const readyCallbacks: ((value: boolean) => void)[] = [];

export function useYandexMaps(componentId?: string, apiKey?: string) {
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.ymaps);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.ymaps) {
      setReady(true);
      return;
    }

    if (scriptLoading) {
      readyCallbacks.push(setReady);
      return;
    }

    if (scriptLoaded) {
      setReady(true);
      return;
    }

    const id = 'yandex-maps-script';
    if (document.getElementById(id)) {
      scriptLoading = true;
      return;
    }

    scriptLoading = true;

    const script = document.createElement('script');
    script.id = id;
    script.src = apiKey 
      ? `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`
      : `https://api-maps.yandex.ru/2.1/?lang=ru_RU`;
    script.async = true;
    
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      setReady(true);
      readyCallbacks.forEach(callback => callback(true));
      readyCallbacks.length = 0;
    };
    
    script.onerror = () => {
      scriptLoading = false;
      console.error('Yandex Maps script failed to load');
      readyCallbacks.forEach(callback => callback(false));
      readyCallbacks.length = 0;
    };
    
    document.body.appendChild(script);

    // Cleanup
    return () => {
      const index = readyCallbacks.indexOf(setReady);
      if (index > -1) {
        readyCallbacks.splice(index, 1);
      }
    };
  }, [componentId]);

  return ready;
}