/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import {
  has
} from 'min-dash';

import BpmnModeler from 'camunda-bpmn-js/lib/camunda-platform/Modeler';

import addExporterModule from '@bpmn-io/add-exporter';

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  DesignPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule
} from '@bpmn-io/bpmn-properties-panel';

import completeDirectEditingModule from './features/complete-direct-editing';
import globalClipboardModule from './features/global-clipboard';
import handToolOnSpaceModule from './features/hand-tool-on-space';
import propertiesPanelKeyboardBindingsModule from './features/properties-panel-keyboard-bindings';

import toggleExecutionProperties from '../../cloud-bpmn/modeler/features/testing/ToggleExecutionProperties';

import Flags, { DISABLE_ADJUST_ORIGIN } from '../../../../util/Flags';

import 'camunda-bpmn-js/dist/assets/camunda-platform-modeler.css';

import '@bpmn-io/bpmn-properties-panel/dist/assets/properties-panel.css';

export default class PlatformBpmnModeler extends BpmnModeler {

  constructor(options = {}) {

    const {
      moddleExtensions,
      ...otherOptions
    } = options;

    super({
      ...otherOptions,
      disableAdjustOrigin: Flags.get(DISABLE_ADJUST_ORIGIN),
      moddleExtensions: {
        ...(moddleExtensions || {})
      }
    });
  }
}

const defaultModules = BpmnModeler.prototype._modules;

const extensionModules = [
  addExporterModule,
  completeDirectEditingModule,
  globalClipboardModule,
  handToolOnSpaceModule,
  propertiesPanelKeyboardBindingsModule,
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
  DesignPropertiesProviderModule,
  toggleExecutionProperties
];

PlatformBpmnModeler.prototype._modules = [
  ...excludeOldModules(defaultModules),
  ...extensionModules
];

// helper /////////////////////

/**
 * Excludes old properties panel + provider coming from camunda-bpmn-js.
 */
function excludeOldModules(modules) {
  return modules.filter(m => !has(m, 'propertiesPanel') && !has(m, 'propertiesProvider'));
}