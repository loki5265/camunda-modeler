/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import React from 'react';

import {
  TabContainer
} from '../primitives';

import {
  WithCache,
  WithCachedState,
  CachedComponent
} from '../cached';

import css from './MultiSheetTab.less';
import { Fill } from '../slot-fill';


export class MultiSheetTab extends CachedComponent {

  constructor(props) {
    super(props);

    this.editorRef = React.createRef();

    let { sheets } = this.getCached();

    if (!sheets) {
      sheets = this.getDefaultSheets();

      this.setCached({
        sheets,
        activeSheet: sheets[0]
      });
    }
  }

  /**
   * React to current sheet provider reporting
   * changed sheets.
   */
  sheetsChanged = (newSheets, newActiveSheet) => {
    let {
      activeSheet,
      sheets
    } = this.getCached();

    if (!sheets) {
      sheets = [];
    }

    const provider = activeSheet.provider;

    const wiredNewSheets = newSheets.map(newSheet => {
      return {
        ...newSheet,
        provider
      };
    });

    sheets = sheets
      .filter(sheet => sheet.provider !== provider)
      .concat(wiredNewSheets)
      .map(t => ({ ...t, order: t.order || 0 }))
      .sort((a, b) => a.order - b.order);

    if (newActiveSheet) {
      activeSheet = sheets.find(s => s.id === newActiveSheet.id);
    }

    this.setCached({
      sheets,
      activeSheet
    });
  }

  handleChanged = (newState = {}) => {
    const {
      onChanged
    } = this.props;

    const dirty = this.isDirty(newState);

    onChanged({
      ...newState,
      dirty
    });
  }

  handleError = (error) => {
    const {
      onError
    } = this.props;

    onError(error);
  }

  handleWarning = (warning) => {
    const {
      onWarning
    } = this.props;

    onWarning(warning);
  }

  /**
   * Check wether or not tab is dirty.
   *
   * @param {Object} state - Editor state.
   *
   * @returns {boolean}
   */
  isDirty(state = {}) {
    const { dirty } = state;

    if (dirty) {
      return true;
    }

    const { xml } = this.props;

    const { lastXML } = this.getCached();

    if (!lastXML) {
      return false;
    }

    return isXMLChange(lastXML, xml);
  }

  async showImportErrorDialog(error) {
    const {
      onAction,
      tab
    } = this.props;

    const {
      name,
      type
    } = tab;

    const { button } = await onAction('show-dialog', getErrorDialog({
      error,
      name,
      type
    }));

    if (button === 'ask-in-forum') {
      onAction('open-external-url', {
        url: 'https://forum.camunda.org/c/modeler'
      });
    }
  }

  handleImport = (error, warnings) => {

    if (warnings && warnings.length) {
      warnings.forEach(warning => {
        this.handleWarning(warning);
      });

      if (!error) {
        this.displayImportWarningsNotification(warnings);
      }
    }

    if (error) {
      this.openFallback();

      this.showImportErrorDialog(error);

      this.handleError(error);
    }
  }

  displayImportWarningsNotification(warnings) {
    this.props.onAction('display-notification', {
      type: 'warning',
      title: `Imported with ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`,
      content: 'See further details in the log.',
      duration: 0
    });
  }

  /**
   * Open fallback sheet if provided.
   */
  openFallback() {

    let {
      sheets
    } = this.getCached();

    if (!sheets) {
      sheets = this.getDefaultSheets();
    }

    const fallback = sheets.find(sheet => {
      const {
        provider
      } = sheet;

      return provider.isFallback;
    });

    if (fallback) {
      this.setCached({
        activeSheet: fallback
      });
    }
  }

  handleContentUpdated = xml => {
    this.setCached({
      lastXML: xml
    });
  }

  handleContextMenu = (event, context) => {

    const {
      activeSheet
    } = this.getCached();

    const {
      onContextMenu
    } = this.props;

    if (typeof onContextMenu === 'function') {
      onContextMenu(event, activeSheet.type, context);
    }

  }

  handleLayoutChanged = (newLayout) => {
    const {
      onLayoutChanged
    } = this.props;

    onLayoutChanged(newLayout);
  }

  triggerAction = async (action, options) => {

    const editor = this.editorRef.current;

    if (action === 'save') {
      const xml = await editor.getXML();

      this.setCached({
        lastXML: xml
      });

      return xml;
    } else if (action === 'export-as') {
      const { fileType } = options;

      return await editor.exportAs(fileType);
    }

    return editor.triggerAction(action, options);
  }

  switchSheet = async (sheet) => {
    const {
      activeSheet
    } = this.getCached();

    if (sheet === activeSheet) {
      return;
    }

    if (sheet.provider === activeSheet.provider) {
      return this.setCached({
        activeSheet: sheet
      });
    }

    const xml = await this.editorRef.current.getXML();

    this.setCached({
      activeSheet: sheet,
      lastXML: xml
    });

    this.props.onAction('emit-event', {
      type: 'tab.activeSheetChanged',
      payload: { activeSheet: sheet }
    });
  }

  getDefaultSheets = () => {
    const {
      providers
    } = this.props;

    return providers.map((provider) => {

      const {
        defaultName,
        type
      } = provider;

      return {
        id: type,
        name: defaultName,
        isDefault: true,
        provider,
        type
      };
    });
  }

  componentDidUpdate(prevProps) {
    const { xml } = this.props;

    if (isXMLChange(prevProps.xml, xml)) {
      this.setCached({
        lastXML: xml
      });
    }
  }

  isUnsaved = (tab) => {
    const { file } = tab;

    return file && !file.path;
  }

  onAction = (action, options) => {
    const {
      onAction,
      tab
    } = this.props;

    if (action === 'close-tab') {
      return onAction('close-tab', { tabId: tab.id });
    }

    if (action === 'lint') {
      const { contents } = options;

      return onAction('lint-tab', {
        tab,
        contents
      });
    }

    return onAction(action, options);
  }

  render() {
    let {
      activeSheet,
      sheets,
      lastXML
    } = this.getCached();

    let {
      id,
      xml,
      layout,
      onAction,
      tab
    } = this.props;

    if (!sheets) {
      sheets = this.getDefaultSheets();
    }

    if (!activeSheet) {
      activeSheet = sheets[0];
    }

    const Editor = activeSheet.provider.editor;

    const isNew = this.isUnsaved(tab);

    return (
      <div className={ css.MultiSheetTab }>
        <TabContainer className="content tab">
          <Editor
            ref={ this.editorRef }
            id={ `${id}-${activeSheet.provider.type}` }
            xml={ lastXML || xml }
            isNew={ isNew }
            layout={ layout }
            activeSheet={ activeSheet }
            onSheetsChanged={ this.sheetsChanged }
            onContextMenu={ this.handleContextMenu }
            onAction={ this.onAction }
            onChanged={ this.handleChanged }
            onContentUpdated={ this.handleContentUpdated }
            onError={ this.handleError }
            onImport={ this.handleImport }
            onLayoutChanged={ this.handleLayoutChanged }
            onModal={ this.props.onModal }
            getConfig={ this.props.getConfig }
            setConfig={ this.props.setConfig }
            getPlugins={ this.props.getPlugins }
            onWarning={ this.handleWarning }
          />
        </TabContainer>

        <SheetSwitch
          sheets={ sheets }
          activeSheet={ activeSheet }
          onSelect={ this.switchSheet }
        />

        { tab.type === 'form'
          ? <Linting tab={ tab } onAction={ onAction } />
          : null
        }
      </div>
    );
  }

}

export default WithCache(WithCachedState(MultiSheetTab));

function SheetSwitch(props) {
  const {
    sheets,
    activeSheet,
    onSelect
  } = props;

  if (sheets.length < 2) {
    return null;
  }

  const fallbackProvider = sheets.map(sheet => sheet.provider)
    .find(provider => provider.isFallback);
  const isFallback = activeSheet.provider === fallbackProvider;
  const switchSheet = () => onSelect(sheets.find(sheet => sheet !== activeSheet));

  return (
    <Fill slot="status-bar__file" group="0_sheet">
      <button
        className={ `btn${ isFallback ? ' btn--active' : '' }` }
        onClick={ switchSheet }
        title={ `Toggle ${fallbackProvider.defaultName}` }
      >
        { fallbackProvider.defaultName }
      </button>
    </Fill>
  );
}

function Linting(props) {
  const {
    tab,
    onAction
  } = props;

  const { linting = {} } = tab;

  const {
    errors = 0,
    warnings = 0
  } = linting;

  return (
    <Fill slot="status-bar__file" group="2_linting">
      <button
        className="btn"
        onClick={ () => onAction('toggleLog') }
        title="Toggle Linting"
      >
        <svg style={ { marginRight: '4px' } } height="12px" class="svg-inline--fa fa-exclamation-circle fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill={ errors > 0 ? 'rgb(255, 61, 61)' : 'currentColor' } d="M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zm-248 50c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>
        { errors }
        <svg style={ { marginLeft: '6px', marginRight: '4px' } } height="12px" class="svg-inline--fa fa-exclamation-triangle fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill={ warnings > 0 ? 'rgb(255, 61, 61)' : 'currentColor' } d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>
        { warnings }
      </button>
    </Fill>
  );
}


// helper //////////

function getErrorDialog({
  error,
  name,
  type
}) {
  return {
    type: 'error',
    title: 'Import Error',
    message: 'Ooops!',
    buttons: [{
      id: 'close',
      label: 'Close'
    }, {
      id: 'ask-in-forum',
      label: 'Ask in Forum'
    }],
    detail: [
      error.message,
      '',
      'Do you believe "' + name + '" is valid ' + type.toUpperCase() + ' diagram?',
      '',
      'Post this error with your diagram in our forum for help.'
    ].join('\n')
  };
}

function isXMLChange(prevXML, xml) {
  return prevXML !== xml;
}
