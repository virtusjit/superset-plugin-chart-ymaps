/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ChartProps, TimeseriesDataRecord } from '@superset-ui/core';

const extractColumnName = (value: any): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return extractColumnName(value[0]);
  }

  if (value.column_name) {
    return value.column_name;
  }

  if (value.label) {
    return value.label;
  }

  if (value.name) {
    return value.name;
  }

  if (value.value) {
    return value.value;
  }

  if (value.column) {
    return value.column.column_name || value.column.verbose_name || value.column.columnName;
  }

  return undefined;
};

const normalizeData = (rawData: any[], formData: any) => {
  const fieldMapping: Record<string, string> = {
    [formData.idColumn]: 'id',
    [formData.geojsonColumn]: 'geojson',
    [formData.regionNameColumn]: 'region_name',
    [formData.messageHtmlColumn?.label]: 'message_html',
    [formData.level]: 'level',
    [formData.parentId]: 'parent_id',
  };

  if (formData.colorColumn && formData.colorColumn.length > 0) {
    fieldMapping[formData.colorColumn] = 'color_column';
  }

  return rawData.map(row => {
    const normalizedRow: Record<string, any> = {};

    Object.keys(row).forEach(key => {
      if (fieldMapping[key]) {
        normalizedRow[fieldMapping[key]] = row[key];
      } else {
        normalizedRow[key] = row[key];
      }
    });

    return normalizedRow;
  });
};

export default function transformProps(chartProps: ChartProps) {
  const { width, height, formData, hooks, filterState, emitCrossFilters, queriesData } = chartProps;
  const {
    onShowInfo,
    onShowHeatmap,
    heatmapColor,
    heatmapOpacity,
    onShowLabels,
    showLegend,
    legendPosition,
    infoScale,

    initialZoom,
    onInitialZoom,
    metrics,
  } = formData as any;

  const rawData = (queriesData?.[0]?.data ?? []) as TimeseriesDataRecord[];
  const normalizedData = normalizeData(rawData, formData);
  const { setDataMask = () => {} } = hooks;

  const metricName = metrics && metrics.length > 0 
    ? metrics[0].label || extractColumnName(metrics[0])
    : undefined;

  // eslint-disable-next-line no-console
  //console.log('formData via transformProps.ts', formData);

  const getColorString = (colorObj: any): string => {
    if (!colorObj) return '#FF6D00';
    
    if (typeof colorObj === 'string') return colorObj;
    
    if (colorObj.r !== undefined && colorObj.g !== undefined && colorObj.b !== undefined) {
      const r = Math.round(colorObj.r);
      const g = Math.round(colorObj.g);
      const b = Math.round(colorObj.b);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    return '#FF6D00';
  };

  return {
    width,
    height,
    data: normalizedData,
    onShowInfo,
    onShowHeatmap,
    heatmapColor: getColorString(heatmapColor),
    heatmapOpacity,
    onShowLabels,
    showLegend,
    legendPosition,
    infoScale,
    metricName,
    initialZoom: initialZoom !== undefined ? Number(initialZoom) : 4,
    onInitialZoom,

    setDataMask,
    filterState,
    emitCrossFilters,
  };
}


