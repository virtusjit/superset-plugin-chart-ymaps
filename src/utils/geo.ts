function swapLonLat(coord: number[]) {
  if (!Array.isArray(coord) || coord.length < 2) return coord;
  const [lon, lat] = coord;
  return [lat, lon];
}

export function normalizeGeometry(geometry: any) {
  if (!geometry || !geometry.type || !geometry.coordinates) return null;

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates.map((ring: number[][]) => ring.map(swapLonLat));
    return { type: 'Polygon', coordinates: rings };
  }

  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates.map((poly: number[][][]) =>
      poly.map((ring: number[][]) => ring.map(swapLonLat))
    );
    return { type: 'MultiPolygon', coordinates: polys };
  }

  return null;
}

export function computeCentroid(geom: any) {
  try {
    if (geom.type === 'Polygon') {
      const points = geom.coordinates[0] || [];
      if (points.length === 0) return [55.75, 37.61];
      
      let latSum = 0;
      let lonSum = 0;
      points.forEach(([lat, lon]: [number, number]) => {
        latSum += lat;
        lonSum += lon;
      });
      
      return [latSum / points.length, lonSum / points.length];
    } 
    else if (geom.type === 'MultiPolygon') {
      let largestPolygon: [number, number][] = [];
      let maxArea = 0;
      
      for (const polygon of geom.coordinates) {
        if (polygon.length > 0) {
          const bbox = calculateBBox(polygon[0]);
          const area = (bbox.maxLat - bbox.minLat) * (bbox.maxLon - bbox.minLon);
          
          if (area > maxArea) {
            largestPolygon = polygon[0];
            maxArea = area;
          }
        }
      }
      
      if (largestPolygon.length === 0) return [55.75, 37.61];
      
      const bbox = calculateBBox(largestPolygon);
      return [
        (bbox.minLat + bbox.maxLat) / 2,
        (bbox.minLon + bbox.maxLon) / 2
      ];
    }
    
    return [55.75, 37.61];
  } catch (error) {
    console.error('Error in computeCentroid:', error);
    return [55.75, 37.61];
  }
}

function calculateBBox(points: [number, number][]): { minLat: number, maxLat: number, minLon: number, maxLon: number } {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  points.forEach(([lat, lon]: [number, number]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  });

  return { minLat, maxLat, minLon, maxLon };
}

export function safeParseGeoJSONString(geojsonData: any): { id: string | number; geometry: any } | null {
  try {
    if (typeof geojsonData === 'object' && geojsonData !== null) {
      if (!geojsonData.id || !geojsonData.geometry) {
        return null;
      }
      return {
        id: geojsonData.id,
        geometry: geojsonData.geometry
      };
    }
    
    if (typeof geojsonData === 'string') {
      const idPattern = /'id'\s*:\s*'([^']+)'|"id"\s*:\s*"([^"]+)"/;
      const idMatch = geojsonData.match(idPattern);
      
      if (!idMatch) {
        console.error('Could not find id');
        return null;
      }
      
      const id = idMatch[1] || idMatch[2];
      
      const geometryKeyIndex = geojsonData.search(/'geometry'|"geometry"/);
      if (geometryKeyIndex === -1) {
        console.error('Could not find geometry key');
        return null;
      }
      
      const geometryObjStart = geojsonData.indexOf('{', geometryKeyIndex);
      if (geometryObjStart === -1) {
        console.error('Could not find geometry object start');
        return null;
      }
      
      let braceCount = 0;
      let geometryEnd = geometryObjStart;
      
      for (let i = geometryObjStart; i < geojsonData.length; i++) {
        if (geojsonData[i] === '{') braceCount++;
        if (geojsonData[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            geometryEnd = i + 1;
            break;
          }
        }
      }
      
      // Извлекаем подстроку geometry и конвертируем в JSON
      let geometryStr = geojsonData.substring(geometryObjStart, geometryEnd);
      
      // Конвертируем Python-формат в JSON
      geometryStr = geometryStr
        .replace(/'/g, '"')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false')
        .replace(/None/g, 'null');
      
      const geometry = JSON.parse(geometryStr);
      
      return { id, geometry };
    }
    
    return null;
  } catch (error) {
    console.error('Error in safeParseGeoJSONString:', error);
    return null;
  }
}

export const safeRemoveFromMap = (map: any, object: any) => {
  if (!map || !object) return false;
  
  try {
    let exists = false;
    map.geoObjects.each((obj: any) => {
      if (obj === object) {
        exists = true;
        return true;
      }
      return false;
    });
    
    if (exists) {
      map.geoObjects.remove(object);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Error removing object from map:', e);
    return false;
  }
};

export const safeAddToMap = (map: any, object: any) => {
  if (!map || !object) return false;
  
  try {
    let exists = false;
    map.geoObjects.each((obj: any) => {
      if (obj === object) {
        exists = true;
        return true;
      }
      return false;
    });
    
    if (!exists) {
      map.geoObjects.add(object);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Error adding object to map:', e);
    return false;
  }
};