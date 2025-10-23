import { safeParseGeoJSONString } from "./geo";

export const computeOverallBounds = (data: any[]) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;

  data.forEach((item: any) => {
    try {
      const parsed = safeParseGeoJSONString(item.geojson);
      if (!parsed || !parsed.geometry) return;

      const geometry = parsed.geometry;
      
      const processCoordinates = (coords: any[]) => {
        coords.forEach(coord => {
          if (Array.isArray(coord[0])) {
            processCoordinates(coord);
          } else {
            let [lon, lat] = coord;
            
            while (lon < -180) lon += 360;
            while (lon > 180) lon -= 360;
            
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          }
        });
      };

      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(processCoordinates);
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: any) => {
          polygon.forEach(processCoordinates);
        });
      }
    } catch (e) {
      console.warn('Error processing geometry for bounds:', e);
    }
  });

  if (minLon === 180 || maxLon === -180 || minLat === 90 || maxLat === -90) {
    return null;
  }

  const isVeryLargeRegion = (maxLon - minLon > 100) || (maxLat - minLat > 60);
  
  if (maxLon - minLon > 180 || isVeryLargeRegion) {
    let adjustedMinLon = 180;
    let adjustedMaxLon = -180;
    
    data.forEach((item: any) => {
      try {
        const parsed = safeParseGeoJSONString(item.geojson);
        if (!parsed || !parsed.geometry) return;

        const adjustCoordinatesForAntimeridian = (coords: any[]) => {
          coords.forEach(coord => {
            if (Array.isArray(coord[0])) {
              adjustCoordinatesForAntimeridian(coord);
            } else {
              let [lon, _lat] = coord;
              if (lon < 0) lon += 360;
              
              adjustedMinLon = Math.min(adjustedMinLon, lon);
              adjustedMaxLon = Math.max(adjustedMaxLon, lon);
            }
          });
        };

        const geometry = parsed.geometry;
        if (geometry.type === 'Polygon') {
          geometry.coordinates.forEach(adjustCoordinatesForAntimeridian);
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach((polygon: any) => {
            polygon.forEach(adjustCoordinatesForAntimeridian);
          });
        }
      } catch (e) {
        console.warn('Error processing geometry for antimeridian bounds:', e);
      }
    });

    const centerLon = (adjustedMinLon + adjustedMaxLon) / 2;
    const normalizedCenterLon = centerLon > 180 ? centerLon - 360 : centerLon;
    
    return {
      bounds: [[minLat, -180], [maxLat, 180]],
      center: [(minLat + maxLat) / 2, normalizedCenterLon],
      width: 360,
      height: maxLat - minLat,
      crossesAntimeridian: true,
      isVeryLargeRegion
    };
  }

  return {
    bounds: [[minLat, minLon], [maxLat, maxLon]],
    center: [(minLat + maxLat) / 2, (minLon + maxLon) / 2],
    width: maxLon - minLon,
    height: maxLat - minLat,
    crossesAntimeridian: false,
    isVeryLargeRegion
  };
};

export const calculateOptimalZoom = (bounds: any, mapSize: { width: number; height: number }) => {
  if (!bounds) return 6;
  
  const { width: lonSpan, height: latSpan, crossesAntimeridian, isVeryLargeRegion } = bounds;
  
  const mapWidth = mapSize.width || 800;
  const mapHeight = mapSize.height || 600;
  
  if (crossesAntimeridian) {
    if (isVeryLargeRegion) {
      return 3;
    }
    return Math.max(2, Math.min(5, Math.floor(6 - (latSpan / 90))));
  }
  
  const lonZoom = Math.log2(360 * (mapWidth / 256) / lonSpan);
  const latZoom = Math.log2(180 * (mapHeight / 256) / latSpan);
  
  let zoom = Math.min(lonZoom, latZoom);
  
  if (isVeryLargeRegion) {
    zoom = Math.min(zoom, 4);
  } else if (lonSpan > 60 || latSpan > 40) {
    zoom = Math.min(zoom, 5);
  } else if (lonSpan > 30 || latSpan > 20) {
    zoom = Math.min(zoom, 6);
  } else if (lonSpan > 15 || latSpan > 10) {
    zoom = Math.min(zoom, 7);
  }
  
  zoom = Math.max(2, Math.min(15, zoom));
  
  return Math.floor(zoom);
};