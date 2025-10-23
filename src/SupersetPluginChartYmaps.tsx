/**
 * Licensed to the Apache Software Foundation (ASF) ...
 */

import React, { useEffect, useRef, useState } from 'react';
import { styled } from '@superset-ui/core';
import {
  NavigationState,
  RegionData,
  SupersetPluginChartYmapsProps,
  SupersetPluginChartYmapsStylesProps,
} from './types';
import { computeCentroid, normalizeGeometry, safeAddToMap, safeParseGeoJSONString, safeRemoveFromMap  } from './utils/geo';
import { isMobile, normalizeValue, numberFormat, sanitizeHtml } from './utils/format';
import { useYandexMaps } from './hooks/useYandexMaps';
import { darkenColor, getHeatmapColor, getRegionColor, getSafeColor } from './utils/color';
import { Legend, LegendItem } from './components/Legend';

import { initializeYandexMaps } from './yandex-init';

declare global {
  interface Window {
    ymaps?: any;
  }
}

const yandexApiKey = initializeYandexMaps();

// ====== Стили ======
const Styles = styled.div<SupersetPluginChartYmapsStylesProps>`
  background-color: ${({ theme }: any) => theme.colors.secondary.light2};
  padding: ${({ theme }: any) => theme.gridUnit * 4}px;
  border-radius: ${({ theme }: any) => theme.gridUnit * 2}px;
  height: ${({ height }: any) => height}px;
  width: ${({ width }: any) => width}px;

  --class-scale: 1;

  .scaleClass {
    transform-origin: center;
    transition: transform 0.2s ease-out;
    width: calc(220px * var(--class-scale, 1));
    min-width: 110px;
    max-width: 220px;
    transform: scale(var(--class-scale, 1));
  }

  h3 {
    margin-top: 0;
    margin-bottom: ${({ theme }: any) => theme.gridUnit * 3}px;
  }

  .content {
    display: flex;
    gap: 5px;
    width: 100%;
    height: 100%;
    position: relative;
    
    flex-direction: column;
  }

  .content.legend-top {
    flex-direction: column-reverse;
  }

  .content.legend-bottom {
    flex-direction: column;
  }

  .content.legend-left {
    flex-direction: row-reverse; 
  }

  .content.legend-right {
    flex-direction: row;
  }

  .mapWrapper {
    position: relative;
    width: 100%;
    height: calc(100% - 10px);
    min-height: 200px;
  }

  .mapContainer {
    position: relative;
    inset: 0;
    border-radius: ${({ theme }: any) => theme.gridUnit}px;
    overflow: hidden;
    background: #eef1f8;

    flex: 1 1 auto;
    min-height: 200px;
  }

  .content.legend-top .mapContainer,
  .content.legend-bottom .mapContainer {
    width: 100%;
    height: 85%;
  }

  .content.legend-left .mapContainer,
  .content.legend-right .mapContainer {
    width: 85%;
    height: 100%;
  }

  .legend-container {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .content.legend-top .legend-container,
  .content.legend-bottom .legend-container {
    width: 100%;
    height: 15%;
    min-height: 60px;
  }

  .content.legend-left .legend-container,
  .content.legend-right .legend-container {
    width: 15%;
    height: 100%;
    min-width: 120px;
  }

  .map-loader {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .map-loaded .map-loader {
    display: none;
  }

  .spinner {
    border: 3px solid #e3e7f2;
    border-left-color: #6270ff;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    animation: spin 1s linear infinite;
    margin-bottom: 6px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loader-text {
    color: #8087a2;
    font-size: 0.95rem;
    text-align: center;
  }

  .placeholder {
    color: #8a8a8a;
    padding: 8px 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .detail-modal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    z-index: 100;
    min-width: 300px;
    max-width: 400px;
    border: 2px solid #4159ba;
  }

  .detail-modal h3 {
    margin: 0 0 15px 0;
    color: #182047;
    text-align: center;
    font-size: 18px;
  }

  .detail-modal-content {
    margin-bottom: 20px;
    color: #062155;
    font-size: 14px;
    line-height: 1.5;
  }

  .detail-modal-actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
  }

  .detail-modal-button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .detail-modal-button.primary {
    background: #4159ba;
    color: white;
  }

  .detail-modal-button.primary:hover {
    background: #3141a0;
  }

  .detail-modal-button.secondary {
    background: #f0f0f0;
    color: #333;
  }

  .detail-modal-button.secondary:hover {
    background: #e0e0e0;
  }

  .detail-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 100;
  }
`;

// ====== Утилиты ======
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

export default function SupersetPluginChartYmaps(props: SupersetPluginChartYmapsProps) {
  const {
    data,
    height,
    width,
    onShowInfo = true,
    onShowHeatmap = false,
    onShowLabels = false,
    heatmapColor = '#FF6D00',
    heatmapOpacity = 0.8,
    initialCenterLon = 37.61,
    initialCenterLat = 55.75,
    initialZoom = 9,
    onInitialZoom = false,
    labelPosition = 'top',

    showLegend = false,
    legendPosition = 'top',
    infoScale = 1,
    emitCrossFilters, 
    filterState, 
    setDataMask,
    metricName = 'value',
  } = props as any;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoLabelsRef = useRef<any[]>([]);
  const regionObjectsRef = useRef<any[]>([]);
  const labelObjectsRef = useRef<any[]>([]);
  const hoverTimeoutsRef = useRef<Record<string, any>>({});
  const mapInitializedRef = useRef(false);
  
  const [mapRendering, setMapRendering] = useState(true);
  const [salesRange, setSalesRange] = useState({ min: 0, max: 0 });
  const [currentHeatmapColor, setCurrentHeatmapColor] = useState(getSafeColor(heatmapColor));
  const [currentHeatmapOpacity, setCurrentHeatmapOpacity] = useState(heatmapOpacity);
  const [_mapKey, setMapKey] = useState(0);
  const [regionColors, setRegionColors] = useState<Map<string, string>>(new Map());

  const salesRangeRef = useRef({ min: 0, max: 0 });

  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  const [autoBounds, setAutoBounds] = useState<any>(null);
  const [calculatedCenter, setCalculatedCenter] = useState<[number, number]>([initialCenterLat, initialCenterLon]);
  const [calculatedZoom, setCalculatedZoom] = useState<number>(initialZoom);

  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentLevel: 1,
    currentParentId: null
  });
  
  const [detailModal, setDetailModal] = useState<{
    visible: boolean;
    region: RegionData | null;
    hasChildren: boolean;
    hasParent: boolean;
  }>({
    visible: false,
    region: null,
    hasChildren: false,
    hasParent: false
  });

  const [randomId] = useState(() => {
    return `YmapsView_${Math.random().toString(36).substring(2, 11)}`;
  });

  const ymapsReady = useYandexMaps(randomId, yandexApiKey);

  const getCrossFilterDataMask = (regionName: string) => {
    const selected = Object.values(filterState?.selectedValues || {});

    const key = regionName;
    const entity = 'region_name';
    let values: string[];
    
    if (selected.includes(key)) {
      values = [];
    } else {
      values = [regionName];
    }
    
    return {
      dataMask: {
        extraFormData: {
          filters: values.length ? [
            {
              col: entity as any, 
              op: 'IN' as const,
              val: values,
            },
          ] : [],
        },
        filterState: {
          value: values.length ? values : null,
          selectedValues: values.length ? [key] : null,
        },
      },
      isCurrentValueSelected: selected.includes(key),
    };
  };

  const handleCrossFilter = (regionName: string) => {
    if (!emitCrossFilters) {
      return;
    }

    const dataMask = getCrossFilterDataMask(regionName)?.dataMask;
    if (dataMask && setDataMask) {
      setDataMask(dataMask);
    }
    
    setDetailModal({ visible: false, region: null, hasChildren: false, hasParent: false });
  };

  const filteredData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    const uniqueLevels = [...new Set(data.map((item: RegionData) => item.level))];
    const uniqueRegions = [...new Set(data.map((item: RegionData) => item.id))];
    
    const minLevel = Math.min(...uniqueLevels);
    
    const isInitialState = navigationState.currentLevel === 1 && navigationState.currentParentId === null;
    const hasFirstLevel = uniqueLevels.includes(1);
    
    if (isInitialState && !hasFirstLevel) {
      return data.filter((item: RegionData) => item.level === minLevel);
    }
    
    if (!isInitialState) {
      const currentLevelExists = uniqueLevels.includes(navigationState.currentLevel);
      
      if (!currentLevelExists) {
        console.warn(`⚠️ Уровень ${navigationState.currentLevel} не существует в данных!`);
        return data.filter((item: RegionData) => item.level === minLevel);
      }
      
      if (navigationState.currentParentId !== null) {
        const parentExists = data.some(item => item.id === navigationState.currentParentId);
        if (!parentExists) {
          console.warn(`⚠️ Parent ${navigationState.currentParentId} не существует в данных!`);
          return data.filter((item: RegionData) => item.level === minLevel);
        }
      }
      
      const filtered = data.filter((item: RegionData) => {
        const levelMatch = item.level === navigationState.currentLevel;
        
        if (navigationState.currentParentId === null) {
          return levelMatch;
        }
        
        return levelMatch && item.parent_id === navigationState.currentParentId;
      });
      
      return filtered;
    }
    
    if (hasFirstLevel) {
      return data.filter((item: RegionData) => item.level === 1);
    }
    
    if (uniqueLevels.length > 1 && uniqueRegions.length <= 50) {
      return data.filter((item: RegionData) => item.level === minLevel);
    }
    
    if (uniqueLevels.length === 1) {
      return data;
    }
    
    // Fallback
    return data.filter((item: RegionData) => item.level === minLevel);
  }, [data, navigationState.currentLevel, navigationState.currentParentId]);

  useEffect(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    
    const uniqueLevels = [...new Set(data.map((item: RegionData) => item.level))];
    const minLevel = Math.min(...uniqueLevels);
    const hasFirstLevel = uniqueLevels.includes(1);
    
    const currentLevelExists = uniqueLevels.includes(navigationState.currentLevel);
    const parentExists = navigationState.currentParentId 
      ? data.some(item => item.id === navigationState.currentParentId)
      : true;
    
    if (!currentLevelExists || !parentExists) {
      if (hasFirstLevel) {
        setNavigationState({
          currentLevel: 1,
          currentParentId: null
        });
      } else {
        setNavigationState({
          currentLevel: minLevel,
          currentParentId: null
        });
      }
      return;
    }
    
    const isInitialState = navigationState.currentLevel === 1 && navigationState.currentParentId === null;
    
    if (isInitialState && !hasFirstLevel && navigationState.currentLevel === 1) {
      setNavigationState({
        currentLevel: minLevel,
        currentParentId: null
      });
    }
  }, [data]); 

  const minLevel = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return 1;
    const levels = data.map((item: RegionData) => item.level);
    return Math.min(...levels);
  }, [data]);

  const navigateToMinLevel = React.useCallback(() => {
    setNavigationState({
      currentLevel: minLevel,
      currentParentId: null
    });
    setDetailModal({ visible: false, region: null, hasChildren: false, hasParent: false });
  }, [minLevel]);

  const findChildrenRegions = React.useCallback((parentId: string) => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter((item: RegionData) => item.parent_id === parentId);
  }, [data]);

  const findParentRegion = React.useCallback((childId: string) => {
    if (!data || !Array.isArray(data)) return null;
    const child = data.find((item: RegionData) => item.id === childId);
    if (!child || !child.parent_id) return null;
    return data.find((item: RegionData) => item.id === child.parent_id) || null;
  }, [data]);

  const navigateToChildren = React.useCallback((region: RegionData) => {
    const children = findChildrenRegions(region.id);
    if (children.length > 0) {
      setNavigationState({
        currentLevel: region.level + 1,
        currentParentId: region.id
      });
      setDetailModal({ visible: false, region: null, hasChildren: false, hasParent: false });
    }
  }, [findChildrenRegions]);

  const navigateToParent = React.useCallback(() => {
    if (navigationState.currentLevel === 1) {
      return;
    }

    const currentParentRegion = data?.find((item: RegionData) => 
      item.id === navigationState.currentParentId
    );

    if (currentParentRegion) {
      setNavigationState({
        currentLevel: navigationState.currentLevel - 1,
        currentParentId: currentParentRegion.parent_id
      });
    } else {
      setNavigationState({
        currentLevel: 1,
        currentParentId: null
      });
    }

    setDetailModal({ visible: false, region: null, hasChildren: false, hasParent: false });
  }, [navigationState, data]);

  const calculateBounds = () => {
    if (filteredData && Array.isArray(filteredData) && filteredData.length > 0) {
      const bounds = computeOverallBounds(filteredData);
      setAutoBounds(bounds);

      if (bounds) {
        setCalculatedCenter(bounds.center  as [number, number]);
        const optimalZoom = calculateOptimalZoom(bounds, mapSize);
        setCalculatedZoom(optimalZoom); 

        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.setCenter(
              bounds.center, 
              !onInitialZoom ? optimalZoom : initialZoom, 
              { duration: 500 });
          }
        }, 100);
      } else {
        setCalculatedCenter([initialCenterLat, initialCenterLon]);
        setCalculatedZoom(initialZoom);
      }
    }
  }

  useEffect(() => {
    calculateBounds();
  }, [filteredData, onInitialZoom, mapSize, initialCenterLat, initialCenterLon, initialZoom]);

  const initializeMap = React.useCallback(() => {
    if (!window.ymaps || !mapContainerRef.current || mapInitializedRef.current) return;

    const ymaps = window.ymaps;

    try {
      // Info placemark layout
      const InfoLayout = ymaps.templateLayoutFactory.createClass(
        [
          '<div class="scaleClass" style="font-family: Inter, sans-serif; background:#ffffff; border:2px solid #4159ba; border-radius:12px; padding:12px 16px; font-size:13px; color:#1e3199; box-shadow:0 8px 24px rgba(50,70,160,0.15); max-width:320px; line-height:1.35; min-width:220px; text-align:left; transition:all .2s cubic-bezier(.4,0,.2,1); pointer-events:none;">',
          '<div style="font-size:12px; color:#062155; margin:4px 0;">{{properties.infoHtml|raw}}</div>',
          '</div>',
        ].join('')
      );

      // Hover hint layout
      const HintLayout = ymaps.templateLayoutFactory.createClass(
        [
          '<div style="font-family: Inter, sans-serif; background:#ffffff; border:2px solid #4159ba; border-radius:12px; padding:12px 16px; font-size:13px; color:#1e3199; box-shadow:0 8px 24px rgba(50,70,160,0.15); max-width:320px; line-height:1.35; min-width:220px; text-align:left; pointer-events:none;">',
          '<div style="font-size:12px; color:#062155; margin:4px 0;">{{properties.infoHtml|raw}}</div>',
          '</div>',
        ].join('')
      );

      // Initialize map
      mapRef.current = new ymaps.Map(mapContainerRef.current, {
        center: calculatedCenter,
        zoom: !onInitialZoom ? calculatedZoom : initialZoom,
        controls: ['zoomControl', 'fullscreenControl']
      }, {
        suppressMapOpenBlock: true
      });

      mapRef.current.behaviors.disable('dblClickZoom');
      
      mapRef.current.behaviors.disable('rightMouseButtonMagnifier');
      mapRef.current.behaviors.disable('multiTouch');

      mapInitializedRef.current = true;

      mapRef.current.events.add(['boundschange'], (e: any) => {
        const newZoom = e.get('newZoom');
        if (newZoom !== undefined) {
          updateScaleVariable(newZoom);
        }
      });

      mapRef.current.events.add('actionend', () => {
        const currentMapZoom = mapRef.current.getZoom();
        updateScaleVariable(currentMapZoom);
      });

      mapRef.current.events.add('dblclick', (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });

      // Loader imitation
      setTimeout(() => setMapRendering(false), 1000);

      // Prepare and add regions
      const allGeoObjects: any[] = [];

      if (filteredData && Array.isArray(filteredData)) {
        filteredData.forEach((raw: RegionData, idx: number) => {
          try {
            const parsed = safeParseGeoJSONString(raw.geojson);
            if (!parsed || !parsed.geometry) return;

            const norm = normalizeGeometry(parsed.geometry);
            if (!norm) return;

            const regionName = raw.region_name || `Регион ${idx + 1}`;
            const salesValue = Number(raw[metricName!]) || 0;
            
            const shouldShowInfoLabels = onShowInfo;
            const shouldShowRegionLabels = onShowLabels;
            const shouldShowHints = !onShowInfo;
            
            const colorFromData = raw.color_column;
            let fillColor = colorFromData || getRegionColor(raw);
            let strokeColor = '#4159ba';
            let strokeWidth = isMobile() ? 1.2 : 2;
            let fillOpacity = 0.72;
            
            if (onShowHeatmap) {
              const normalizedValue = normalizeValue(salesValue, salesRangeRef.current.min, salesRangeRef.current.max);
              fillColor = getHeatmapColor(
                normalizedValue, 
                currentHeatmapColor,
                currentHeatmapOpacity
              );
              strokeColor = darkenColor(currentHeatmapColor, 0.3);
              strokeWidth = 1;
              fillOpacity = currentHeatmapOpacity;
            }

            const infoHtml = sanitizeHtml(raw.message_html || '');
            const salesVolume = numberFormat(salesValue);

            const optionsBase = {
              fillColor,
              strokeColor,
              strokeWidth,
              fillOpacity,
              strokeOpacity: 0.9,
              cursor: 'pointer',
              zIndex: 100,
              hasBalloon: false,
              hintLayout: HintLayout,
              hasHint: shouldShowHints,
            };

            let geoObj: any = null;

            if (norm.type === 'Polygon') {
              geoObj = new ymaps.Polygon(
                norm.coordinates,
                { regionName, infoHtml, salesVolume },
                optionsBase
              );
            } else if (norm.type === 'MultiPolygon') {
              geoObj = new ymaps.GeoObjectCollection();
              
              norm.coordinates.forEach((polygonCoords: any, polyIndex: number) => {
                const polygon = new ymaps.Polygon(
                  polygonCoords,
                  { regionName, infoHtml, salesVolume, id: `${regionName}-${idx}-${polyIndex}` },
                  optionsBase
                );
                geoObj.add(polygon);
              });
            }

            if (!geoObj) return;

            // Add to map
            mapRef.current.geoObjects.add(geoObj);
            regionObjectsRef.current.push(geoObj);
            allGeoObjects.push(geoObj);

            const center = computeCentroid(norm);

            if (autoBounds?.crossesAntimeridian) {
              mapRef.current.setCenter(autoBounds.center, calculatedZoom, { duration: 500 });
            }
            
            // Info placemark
            const infoPlacemark = new ymaps.Placemark(
              center,
              { regionName, infoHtml, salesVolume },
              {
                iconLayout: InfoLayout,
                iconOffset: [-110, -110],
                zIndex: 1500,
                hasBalloon: false,
                hasHint: false,
              }
            );
            
            infoLabelsRef.current.push(infoPlacemark);
            
            if (shouldShowInfoLabels) {
              safeAddToMap(mapRef.current, infoPlacemark);
            }

            const labelOffset = calculateLabelOffset(labelPosition, regionName);
            
            const regionLabel = new ymaps.Placemark(
              center,
              { regionName },
              {
                iconLayout: createLabelLayout(labelPosition),
                iconOffset: labelOffset,
                zIndex: 1400,
                hasBalloon: false,
                hasHint: false,
              }
            );
            
            labelObjectsRef.current.push(regionLabel);
            
            if (shouldShowRegionLabels) {
              safeAddToMap(mapRef.current, regionLabel);
            }

            // Hover effects
            let isHovered = false;
            const regionId = `${regionName}-${idx}`;

            geoObj.events
              .add(['mouseenter', 'touchstart'], (e: any) => {
                if (isHovered || !mapRef.current) return;
                if (hoverTimeoutsRef.current[regionId]) {
                  clearTimeout(hoverTimeoutsRef.current[regionId]);
                }
                isHovered = true;

                e.get('target').options.set({
                  fillOpacity: Math.min(fillOpacity + 0.15, 1),
                  strokeColor: onShowHeatmap ? darkenColor(strokeColor, 0.1) : '#506fdd',
                  strokeWidth: strokeWidth * (isMobile() ? 1 : 1.25),
                  strokeOpacity: 1,
                  zIndex: 170,
                });

                if (shouldShowInfoLabels) {
                  infoLabelsRef.current.forEach((pl) => {
                    if (pl && pl.getElement) {
                      pl.getElement().then((el: HTMLElement) => {
                        if (el && isHovered) {
                          el.style.transform = 'scale(1.05)';
                          el.style.boxShadow = '0 12px 32px rgba(50,70,160,0.25)';
                          el.style.borderColor = '#6270ff';
                          el.style.background = '#f8f9ff';
                        }
                      }).catch(() => {});
                    }
                  });
                }
              })
              .add(['mouseleave', 'touchend'], (e: any) => {
                isHovered = false;
                e.get('target').options.set({
                  fillOpacity,
                  strokeColor,
                  strokeWidth,
                  strokeOpacity: 0.9,
                  zIndex: 100,
                });

                try {
                  if (mapRef.current?.hint?.close) {
                    mapRef.current.hint.close();
                  }
                } catch {}

                if (shouldShowInfoLabels) {
                  hoverTimeoutsRef.current[regionId] = setTimeout(() => {
                    if (!isHovered) {
                      infoLabelsRef.current.forEach((pl) => {
                        if (pl && pl.getElement) {
                          pl.getElement().then((el: HTMLElement) => {
                            if (el) {
                              el.style.transform = 'scale(1)';
                              el.style.boxShadow = '0 8px 24px rgba(50,70,160,0.15)';
                              el.style.borderColor = '#4159ba';
                              el.style.background = '#ffffff';
                            }
                          }).catch(() => {});
                        }
                      });
                    }
                  }, 100);
                }
              })
              .add('dblclick', (e: any) => {
                e.stopPropagation();
                
                const children = findChildrenRegions(raw.id);
                const parent = findParentRegion(raw.id);
                
                setDetailModal({
                  visible: true,
                  region: raw,
                  hasChildren: children.length > 0,
                  hasParent: parent !== null
                });

                if (navigator.vibrate && isMobile()) navigator.vibrate(40);
              });

          } catch (e) {
            console.warn('Region init error:', e);
          }
        });
      }
    } catch (e) {
      console.error('Map initialization error:', e);
      mapInitializedRef.current = false;
    }
  }, [calculatedCenter, calculatedZoom, currentHeatmapColor, currentHeatmapOpacity, labelPosition, 
  filteredData, findChildrenRegions, findParentRegion]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const updateSize = () => {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        setMapSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateSize();

    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    const safeColor = getSafeColor(heatmapColor);
    if (safeColor !== currentHeatmapColor || heatmapOpacity !== currentHeatmapOpacity) {
      setCurrentHeatmapColor(safeColor);
      setCurrentHeatmapOpacity(heatmapOpacity);
      setMapKey(prev => prev + 1);
    }
  }, [heatmapColor, heatmapOpacity, currentHeatmapColor, currentHeatmapOpacity]);

  useEffect(() => {
    if (!filteredData || !Array.isArray(filteredData)) {
      setRegionColors(new Map());
      return;
    }

    const newColors = new Map<string, string>();
    
    filteredData.forEach((item: RegionData, index: number) => {
      const regionName = item.region_name || `Регион ${index + 1}`;
      const salesValue = Number(item[metricName!]) || 0;
      const regionId = item.id || regionName || `region-${index}`;
      
      let color: string;
      
      if (onShowHeatmap) {
        const normalizedValue = normalizeValue(salesValue, salesRange.min, salesRange.max);
        color = getHeatmapColor(normalizedValue, currentHeatmapColor, currentHeatmapOpacity);
      } else {
        color = item.color_column || getRegionColor(item);
      }
      
      newColors.set(regionId, color);
    });

    setRegionColors(newColors);
  }, [filteredData, onShowHeatmap, salesRange, currentHeatmapColor, currentHeatmapOpacity]);

  useEffect(() => {
    if (filteredData && Array.isArray(filteredData)) {
      const salesValues = filteredData
        .map(item => Number(item[metricName!]) || 0)
        .filter(value => !isNaN(value));
      
      if (salesValues.length > 0) {
        const min = Math.min(...salesValues);
        const max = Math.max(...salesValues);
        const newRange = { min, max };
        setSalesRange(newRange);
        salesRangeRef.current = newRange;
      } else {
        const newRange = { min: 0, max: 0 };
        setSalesRange(newRange);
        salesRangeRef.current = newRange;
      }
    } else {
      const newRange = { min: 0, max: 0 };
      setSalesRange(newRange);
      salesRangeRef.current = newRange;
    }
  }, [filteredData]);

  const calculateLabelOffset = (position: string, regionName: string) => {
    const baseOffsets = {
      top: [0, -40],
      bottom: [0, 40],
      left: [-40, 0],
      right: [40, 0]
    };

    const baseOffset = baseOffsets[position as keyof typeof baseOffsets] || baseOffsets.top;
    
    const textLengthAdjustment = Math.min(regionName.length * 0.7, 15);
    
    switch (position) {
      case 'top':
        return [baseOffset[0], baseOffset[1] - textLengthAdjustment];
      case 'bottom':
        return [baseOffset[0], baseOffset[1] + textLengthAdjustment];
      case 'left':
        return [baseOffset[0] - textLengthAdjustment, baseOffset[1]];
      case 'right':
        return [baseOffset[0] + textLengthAdjustment, baseOffset[1]];
      default:
        return baseOffset;
    }
  };

  const createLabelLayout = (position: string) => {
    // @ts-ignore
    if (!window.ymaps || !window.ymaps.templateLayoutFactory) return null;
    
    const arrowContainerStyles: Record<string, string> = {
      top: `
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 16px;
        height: 8px;
        display: flex;
        justify-content: center;
      `,
      bottom: `
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 16px;
        height: 8px;
        display: flex;
        justify-content: center;
      `,
      left: `
        position: absolute;
        right: -8px;
        top: 50%;
        transform: translateY(-50%);
        width: 8px;
        height: 16px;
        display: flex;
        align-items: center;
      `,
      right: `
        position: absolute;
        left: -8px;
        top: 50%;
        transform: translateY(-50%);
        width: 8px;
        height: 16px;
        display: flex;
        align-items: center;
      `
    };

    const arrowStyles: Record<string, string> = {
      top: `
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid #ffffff;
      `,
      bottom: `
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 8px solid #ffffff;
      `,
      left: `
        width: 0;
        height: 0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-left: 8px solid #ffffff;
      `,
      right: `
        width: 0;
        height: 0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-right: 8px solid #ffffff;
      `
    };

    return window.ymaps.templateLayoutFactory.createClass(
      [
        '<div style="position: relative; display: inline-block; padding: 8px 12px; font-family: Arial, sans-serif;',
        'transform: translate(-50%, 0%); font-size: 12px; font-weight: bold; color: #2d3748;',
        'background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;',
        'box-shadow: 0 2px 8px rgba(0,0,0,0.15); pointer-events: none;',
        'white-space: nowrap; line-height: 1.2; z-index: 1000; text-align: center;">',
        '{{ properties.regionName }}',
        '<div style="', arrowContainerStyles[position], '">',
        '<div style="', arrowStyles[position], '"></div>',
        '</div>',
        '</div>'
      ].join(''),
      {
        build: function() {
          this.constructor.superclass.build.call(this);
          const parentElement = this.getParentElement();
          if (parentElement) {
            this._element = parentElement.querySelector('div');
          }
        },
        clear: function() {
          this._element = null;
          this.constructor.superclass.clear.call(this);
        }
      }
    );
  };

  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return;

    labelObjectsRef.current.forEach((label, idx) => {
      try {
        if (!label) return;
        
        const regionName = label.properties?.get('regionName') || `Регион ${idx + 1}`;
        const offset = calculateLabelOffset(labelPosition, regionName);
        const layout = createLabelLayout(labelPosition);
        
        if (layout) {
          label.options.set({
            iconLayout: layout,
            iconOffset: offset
          });
        }
      } catch (e) {
        console.warn('Error updating label position:', e);
      }
    });
  }, [labelPosition]);

  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return;
    
    const map = mapRef.current;
    const shouldShowInfoLabels = onShowInfo;
    const shouldShowRegionLabels = onShowLabels;
    
    infoLabelsRef.current.forEach((label) => {
      try {
        if (!label) return;
        
        if (shouldShowInfoLabels) {
          safeAddToMap(map, label);
        } else {
          safeRemoveFromMap(map, label);
        }
      } catch (e) {
        console.warn('Error toggling info labels:', e);
      }
    });

    labelObjectsRef.current.forEach((label) => {
      try {
        if (!label) return;
        
        if (shouldShowRegionLabels) {
          safeAddToMap(map, label);
        } else {
          safeRemoveFromMap(map, label);
        }
      } catch (e) {
        console.warn('Error toggling region labels:', e);
      }
    });

    const shouldShowHints = !onShowInfo && !onShowLabels;
    
    regionObjectsRef.current.forEach((geo) => {
      try {
        if (!geo) return;
        geo.options.set('hasHint', shouldShowHints);
      } catch (e) {
        console.warn('Error updating region options:', e);
      }
    });
  }, [onShowInfo, onShowLabels]);

  const safeDestroyMap = () => {
    if (mapRef.current) {
      try {
        infoLabelsRef.current = [];
        regionObjectsRef.current = [];
        labelObjectsRef.current = [];
        
        mapRef.current.destroy();
        mapRef.current = null;
        mapInitializedRef.current = false;
      } catch (e) {
        console.warn('Error destroying map:', e);
        mapRef.current = null;
        mapInitializedRef.current = false;
      }
    }
  };

  const getTransformOrigin = (position: string): string => {
    switch (position) {
      case 'top':
        return 'center bottom';
      case 'bottom':
        return 'center top';
      case 'left':
        return 'right center';
      case 'right':
        return 'left center';
      default:
        return 'center center';
    }
  };

  const updateScaleVariable = (zoom: number) => {
    let scaleFactor: number;
    
    if (infoScale === 1) {
      scaleFactor = 1;
    } else if (infoScale !== undefined && infoScale !== null) {
      scaleFactor = infoScale;
    } else {
      const minZoom = 5;
      const maxZoom = 13; 
      
      if (zoom <= minZoom) {
        scaleFactor = 0.2;
      } else if (zoom >= maxZoom) {
        scaleFactor = 1;
      } else {
        const progress = (zoom - minZoom) / (maxZoom - minZoom);
        scaleFactor = 0.2 + 0.8 * progress;
      }
    }
    
    if (mapContainerRef.current) {
      mapContainerRef.current.style.setProperty('--class-scale', scaleFactor.toString());
    }
    
    const scaleElements = document.querySelectorAll('.scaleClass') as NodeListOf<HTMLElement>;
    scaleElements.forEach((element) => {
      element.style.transform = `scale(${scaleFactor})`;
      element.style.width = `${220 * scaleFactor}px`;
      
      element.style.transformOrigin = getTransformOrigin(labelPosition);
    });
  };

  useEffect(() => {
    if (!ymapsReady || typeof window === 'undefined' || !window.ymaps || !mapContainerRef.current) return;

    const ymaps = window.ymaps;

    safeDestroyMap();

    ymaps.ready(() => {
      if (!mapContainerRef.current || mapInitializedRef.current) return;
      initializeMap();
    });

    // Cleanup
    return () => {
      safeDestroyMap();
    };
  }, [ymapsReady, initializeMap]);

  useEffect(() => {
    if (mapRef.current) {
      const currentMapZoom = mapRef.current.getZoom();
      updateScaleVariable(currentMapZoom);
    }
  }, [infoScale]);

  const legendItems: LegendItem[] = React.useMemo(() => {
    if (!filteredData || !Array.isArray(filteredData) || !showLegend) {
      return [];
    }

    return filteredData.map((item: RegionData, index: number) => {
      const regionName = item.region_name || `Регион ${index + 1}`;
      const salesValue = Number(item[metricName!]) || 0;
      const regionId = item.id || regionName || `region-${index}`;
      
      const color = regionColors.get(regionId) || item.color_column || getRegionColor(item);
      
      return {
        id: regionId,
        name: regionName,
        color: color,
        value: salesValue
      };
    });
  }, [filteredData, showLegend, regionColors]);

  const renderDetailModal = () => {
    if (!detailModal.visible || !detailModal.region) return null;

    const handleDetail = () => {
      navigateToChildren(detailModal.region!);
    };

    const handleNavigateUp = () => {
      navigateToParent();
    };

    const handleNavigateToMinLevel = () => {
      navigateToMinLevel();
    };

    const handleClickCrossFilter = () => {
      if (detailModal.region) {
        handleCrossFilter(detailModal.region.region_name);
      }
    };

    const isFilterActive = filterState?.selectedValues?.includes(detailModal.region.region_name);

    const showReturnToMin = navigationState.currentLevel > minLevel + 1;

    return (
      <>
        <div className="detail-modal-overlay" onClick={() => setDetailModal({ visible: false, region: null, hasChildren: false, hasParent: false })} />
        <div className="detail-modal">
          <h3>Действия с регионом</h3>
          <div className="detail-modal-content">
            <strong>{detailModal.region.region_name}</strong>
            <br />
            Уровень: {detailModal.region.level}
            {isFilterActive && (
              <div style={{ 
                marginTop: '8px', 
                padding: '4px 8px', 
                backgroundColor: '#e6f7ff', 
                border: '1px solid #91d5ff',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#0050b3'
              }}>
                ✓ Фильтр активен
              </div>
            )}
          </div>
          <div className="detail-modal-actions">
            {emitCrossFilters && (
              <button 
                className={`detail-modal-button ${isFilterActive ? 'secondary' : 'primary'}`}
                onClick={handleClickCrossFilter}
              >
                {isFilterActive ? 'Сбросить фильтр' : 'Применить фильтр'}
              </button>
            )}

            {detailModal.hasChildren && (
              <button 
                className="detail-modal-button primary"
                onClick={handleDetail}
              >
                Детализировать
              </button>
            )}
            {showReturnToMin && (
              <button 
                className="detail-modal-button secondary"
                onClick={handleNavigateToMinLevel}
                style={{
                  background: '#fff3cd',
                  color: '#856404',
                  borderColor: '#ffc107'
                }}
              >
                Вернуться к началу
              </button>
            )}
            {detailModal.hasParent && (
              <button 
                className="detail-modal-button secondary"
                onClick={handleNavigateUp}
              >
                На уровень выше
              </button>
            )}
            <button 
              className="detail-modal-button secondary"
              onClick={() => setDetailModal({ visible: false, region: null, hasChildren: false, hasParent: false })}
            >
              Отмена
            </button>
          </div>
        </div>
      </>
    );
  };

  const renderContent = () => {
    const contentClass = showLegend ? `legend-${legendPosition}` : 'no-legend';

    return (
      <div className={`content ${contentClass}`}>
        <div className={`mapContainer ${!mapRendering ? 'map-loaded' : ''}`}>
          {mapRendering && (
            <div className="map-loader">
              <div className="spinner" />
              <div className="loader-text">Загрузка карты...</div>
            </div>
          )}
          {renderDetailModal()}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
        {showLegend && (
          <div className="legend-container" key={`legend-${regionColors.size}-${legendItems.length}`}>
            <Legend
              items={legendItems}
              position={legendPosition}
              visible={!mapRendering}
              title="Регионы"
              totalRegions={filteredData?.length || 0}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Styles
      height={height}
      width={width}
    >
      <div className="mapWrapper">{renderContent()}</div>
    </Styles>
  );
}
