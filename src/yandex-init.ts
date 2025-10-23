const appContainer = document.getElementById('app');
const { common } = JSON.parse(
  appContainer?.getAttribute('data-bootstrap') || '{}'
);
const YANDEX_MAPS_API_KEY = common?.feature_flags?.YANDEX_MAPS_API_KEY;

export const initializeYandexMaps = () => {
  if (YANDEX_MAPS_API_KEY) {
    (window as any).YANDEX_MAPS_API_KEY = YANDEX_MAPS_API_KEY;
  } else {
    console.warn("No Yandex Maps API key found");
  }
  
  return YANDEX_MAPS_API_KEY;
};
