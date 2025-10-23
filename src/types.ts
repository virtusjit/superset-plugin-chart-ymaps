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
export type LabelPosition = 'top' | 'bottom' | 'left' | 'right';

import {
  QueryFormData,
  TimeseriesDataRecord,
  SetDataMaskHook,
} from '@superset-ui/core';

export interface RegionData {
  id: string;
  geojson: string;
  region_name: string;
  message_html: string;
  ds_id: string | null;
  level: number;
  parent_id: string | null;
  "SUM(sales_volume)": number;
  color_column?: string;
  [key: string]: any;
}

export interface NavigationState {
  currentLevel: number;
  currentParentId: string | null;
}

export interface SupersetPluginChartYmapsStylesProps {
  height: number;
  width: number;
  theme?: any;
}

interface SupersetPluginChartYmapsCustomizeProps {
  onShowInfo?: boolean,
  onShowHeatmap?: boolean,
  heatmapColor?: string,
  heatmapOpacity?: number,
  onShowLabels?: boolean;
  apiKey: string;
  initialCenterLon?: number;
  initialCenterLat?: number;
  initialZoom?: number;
  labelPosition?: LabelPosition;
}

export type SupersetPluginChartYmapsQueryFormData = QueryFormData &
  SupersetPluginChartYmapsStylesProps &
  SupersetPluginChartYmapsCustomizeProps;

export type SupersetPluginChartYmapsProps = SupersetPluginChartYmapsStylesProps &
  SupersetPluginChartYmapsCustomizeProps & {
    data: TimeseriesDataRecord[];
    emitCrossFilters?: boolean;
    setDataMask: SetDataMaskHook;
    metricName?: string;
    filterState?: any;
    // add typing here for the props you pass in from transformProps.ts!
  };
