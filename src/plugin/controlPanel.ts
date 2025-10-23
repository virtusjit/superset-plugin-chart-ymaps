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
import { t, validateNonEmpty } from '@superset-ui/core';
// @ts-ignore
import { ControlPanelConfig, sharedControls } from '@superset-ui/chart-controls';

const createRequiredColumnControl = (
  name: string,
  label: string,
  description: string,
  required: boolean = true,
) => ({
  name,
  config: {
    ...sharedControls.groupby,
    multi: false,
    label: t(label),
    description: t(description),
    validators: required ? [validateNonEmpty] : [],
  },
});

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          createRequiredColumnControl(
            'id_column',
            'ID column',
            'Drag and drop the column containing a unique region identifier',
          ),
        ],
        [
          createRequiredColumnControl(
            'geojson_column',
            'GeoJSON column',
            'Drag and drop the column with GeoJSON geometry for each region',
          ),
        ],
        [
          createRequiredColumnControl(
            'color_column',
            'Color column',
            'Drag and drop the column with custom region colors (optional per row)',
            false,
          ),
        ],
        [
          createRequiredColumnControl(
            'region_name_column',
            'Region name column',
            'Drag and drop the column containing the display name of the region',
          ),
        ],
        [
          createRequiredColumnControl(
            'message_html_column',
            'Message HTML column',
            'Drag and drop the column that stores HTML content for region info',
          ),
        ],
        [
          createRequiredColumnControl(
            'level',
            'Level column',
            'Drag and drop the column specifying the hierarchical level'
          ),
        ],
        [
          createRequiredColumnControl(
            'parent_id',
            'Parent ID column',
            'Drag and drop the column specifying the parent region ID'
          ),
        ],
        [
          {
            name: 'metrics',
            config: {
              ...sharedControls.metrics,
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          'adhoc_filters',
        ],
      ],
    },
    {
      label: t('Map Configuration'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'on_show_info',
            config: {
              type: 'CheckboxControl',
              label: t('Show info'),
              renderTrigger: true,
              default: true,
              description: t('Show information labels on the map'),
            },
          },
        ],
        [
          {
            name: 'on_show_heatmap',
            config: {
              type: 'CheckboxControl',
              label: t('Show heatmap'),
              renderTrigger: true,
              default: true,
              description: t('Display data as a heatmap'),
            },
          },
        ],
        [
          {
            name: 'on_show_labels',
            config: {
              type: 'CheckboxControl',
              label: t('Show labels'),
              renderTrigger: true,
              default: false,
              description: t('Display labels'),
            },
          },
        ],
        // Heatmap customization
        [
          {
            name: 'heatmap_color',
            config: {
              type: 'ColorPickerControl',
              label: t('Heatmap color'),
              description: t('Color for heatmap regions'),
              default: { r: 255, g: 109, b: 0, a: 1 }, 
              renderTrigger: true,
              visibility: ({ controls }: any) => Boolean(controls?.on_show_heatmap?.value),
            },
          },
        ],
        [
          {
            name: 'heatmap_opacity',
            config: {
              type: 'SliderControl',
              label: t('Heatmap opacity'),
              description: t('Opacity level for heatmap colors (0.3 - 0.9)'),
              min: 0.3,
              max: 0.9,
              step: 0.1,
              default: 0.8,
              renderTrigger: true,
              visibility: ({ controls }: any) => Boolean(controls?.on_show_heatmap?.value),
            },
          },
        ],
        [
          {
            name: 'infoScale',
            config: {
              type: 'SliderControl',
              label: t('Info container zoom'),
              description: t('Scale factor for info containers (0.1 = very small, 1.0 = normal size)'),
              min: 0.1,
              max: 1.0,
              step: 0.1,
              default: 1.0,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'onInitialZoom',
            config: {
              type: 'CheckboxControl',
              label: t('Use Initial Zoom'),
              renderTrigger: true,
              default: false,
              description: t('When enabled, use the specified initial zoom level instead of automatic calculation'),
            },
          },
        ],
        [
          {
            name: 'initialZoom',
            config: {
              type: 'TextControl',
              label: t('Initial zoom'),
              default: 4,
              renderTrigger: true,
              description: t('Zoom level to use when "Use Initial Zoom" is enabled'),
              visibility: ({ controls }: any) => Boolean(controls?.onInitialZoom?.value),
            },
          },
        ],
      ],
    },
    {
      label: t('Legend'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'show_legend',
            config: {
              type: 'CheckboxControl',
              label: t('Show legend'),
              renderTrigger: true,
              default: false,
              description: t('Display legend on the map'),
            },
          },
        ],
        [
          {
            name: 'legend_position',
            config: {
              type: 'SelectControl',
              label: t('Legend position'),
              renderTrigger: true,
              default: 'top',
              choices: [
                ['top', 'Top'],
                ['bottom', 'Bottom'],
                ['left', 'Left'],
                ['right', 'Right'],
              ],
              description: t('Position of the legend on the map'),
              visibility: ({ controls }: any) => Boolean(controls?.show_legend?.value),
            },
          },
        ],
      ],
    },
  ],
};

export default config;