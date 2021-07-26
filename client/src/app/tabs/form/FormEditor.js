/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import React, { createRef } from 'react';

import {
  isFunction,
  isUndefined
} from 'min-dash';

import {
  WithCache,
  WithCachedState,
  CachedComponent
} from '../../cached';

import { Loader } from '../../primitives';

import css from './FormEditor.less';

import { getFormEditMenu } from './getFormEditMenu';

import { active as isInputActive } from '../../../util/dom/isInput';

import { FormEditor as Form } from './editor/FormEditor';

import { EngineProfile } from '../EngineProfile';


export class FormEditor extends CachedComponent {
  constructor(props) {
    super(props);

    this.ref = createRef();

    this.state = {
      importing: false
    };
  }

  componentDidMount() {
    this._isMounted = true;

    let { form } = this.getCached();

    if (this.ref.current) {
      form.attachTo(this.ref.current);
    }

    this.checkImport();

    this.listen('on');
  }

  componentWillUnmount() {
    this._isMounted = false;

    const { form } = this.getCached();

    form.detach();

    this.listen('off');
  }

  componentDidUpdate(prevProps) {
    this.checkImport(prevProps);
  }

  checkImport(prevProps) {
    if (!this.isImportNeeded(prevProps)) {
      return;
    }

    this.importSchema();
  }

  isImportNeeded(prevProps = {}) {
    const { importing } = this.state;

    if (importing) {
      return false;
    }

    const { xml: schema } = this.props;

    const { xml: prevSchema } = prevProps;

    if (schema === prevSchema) {
      return false;
    }

    const { lastSchema } = this.getCached();

    return schema !== lastSchema;
  }

  async importSchema() {
    this.setState({
      importing: true
    });

    const { xml: schema } = this.props;

    const { form } = this.getCached();

    let error = null,
        warnings = null;

    try {
      const schemaJSON = JSON.parse(schema);

      ({ error, warnings } = await form.importSchema(schemaJSON));
    } catch (err) {
      error = err;

      if (err.warnings) {
        warnings = err.warnings;
      }
    }

    if (this._isMounted) {
      this.handleImport(error, warnings);
    }
  }

  handleImport(error, warnings) {
    const { form } = this.getCached();

    const commandStack = form.get('commandStack');

    const stackIdx = commandStack._stackIdx;

    const {
      onImport,
      xml: schema
    } = this.props;

    console.log('Hello', error);

    if (error) {
      this.setCached({
        engineProfile: null,
        lastSchema: null
      });
    } else {
      console.log('World');
      const {
        executionPlatform,
        executionPlatformVersion
      } = form.getSchema();

      let engineProfile = null;

      if (!isUndefined(executionPlatform)) {
        engineProfile = {
          executionPlatform,
          executionPlatformVersion
        };
      }

      this.setCached({
        engineProfile,
        lastSchema: schema,
        stackIdx
      });
    }

    this.setState({
      importing: false
    });

    onImport(error);
  }

  listen(fn) {
    const { form } = this.getCached();

    [
      'commandStack.changed',
      'import.done',
      'propertiesPanel.focusin',
      'propertiesPanel.focusout',
      'selection.changed'
    ].forEach((event) => form[ fn ](event, this.handleChanged));
  }

  handleChanged = () => {
    const { onChanged } = this.props;

    const { form } = this.getCached();

    const commandStack = form.get('commandStack');

    const inputActive = isInputActive();

    const newState = {
      defaultUndoRedo: inputActive,
      dirty: this.isDirty(),
      inputActive,
      redo: commandStack.canRedo(),
      save: true,
      undo: commandStack.canUndo()
    };

    if (isFunction(onChanged)) {
      onChanged({
        ...newState,
        editMenu: getFormEditMenu(newState)
      });
    }

    this.setState(newState);
  }

  isDirty() {
    const {
      form,
      stackIdx
    } = this.getCached();

    const commandStack = form.get('commandStack');

    return commandStack._stackIdx !== stackIdx;
  }

  getXML() {
    const {
      form,
      lastSchema
    } = this.getCached();

    const commandStack = form.get('commandStack');

    const stackIdx = commandStack._stackIdx;

    if (!this.isDirty()) {
      return lastSchema || this.props.xml;
    }

    const schema = JSON.stringify(form.saveSchema(), null, 2);

    this.setCached({
      lastSchema: schema,
      stackIdx
    });

    return schema;
  }

  triggerAction(action, context) {
    const { form } = this.getCached();

    const editorActions = form.get('editorActions');

    if (editorActions.isRegistered(action)) {
      return editorActions.trigger(action, context);
    }
  }

  setEngineProfile = (engineProfile) => {
    const { form } = this.getCached();

    const root = form._state.schema;

    const modeling = form.get('modeling');

    modeling.editFormField(root, engineProfile);

    this.setCached({ engineProfile });
  }

  render() {
    const { engineProfile } = this.getCached();

    const { importing } = this.state;

    return (
      <div className={ css.FormEditor }>
        <Loader hidden={ !importing } />

        <div
          className="form"
          onFocus={ this.handleChanged }
          ref={ this.ref }
        ></div>

        <EngineProfile
          type="form"
          engineProfile={ engineProfile }
          setEngineProfile={ this.setEngineProfile } />
      </div>
    );
  }

  static createCachedState() {
    const form = new Form({});

    const commandStack = form.get('commandStack');

    const stackIdx = commandStack._stackIdx;

    return {
      __destroy: () => {
        form.destroy();
      },
      engineProfile: null,
      form,
      lastSchema: null,
      stackIdx
    };
  }
}

export default WithCache(WithCachedState(FormEditor));