/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import React, { Fragment, useState } from 'react';
import classnames from 'classnames';

import { isNil } from 'min-dash';

import { Overlay } from '../../shared/ui';
import { Fill } from '../slot-fill';

import Arrow from '../../../resources/icons/Arrow.svg';
import LinkArrow from '../../../resources/icons/LinkArrow.svg';

import css from './EngineProfile.less';


export function EngineProfile(props) {
  const {
    engineProfile = null,
    setEngineProfile = null,
    type
  } = props;

  const [ open, setOpen ] = React.useState(false, []);
  const buttonRef = React.useRef(null);

  if (!engineProfile && !setEngineProfile) {
    return null;
  }

  let label = 'No platform selected';

  if (engineProfile) {
    const {
      executionPlatform,
      executionPlatformVersion
    } = engineProfile;

    if (setEngineProfile) {
      label = `${ executionPlatform } ${ executionPlatformVersion }`;
    } else {
      label = executionPlatform;
    }
  }

  return (
    <Fill slot="status-bar__file" group="1_engine">
      {
        open &&
        <EngineProfileOverlay
          anchor={ buttonRef.current }
          onClose={ () => setOpen(false) }
          engineProfile={ engineProfile }
          setEngineProfile={ setEngineProfile }
          type={ type }
        />
      }
      <button
        className={ classnames('btn', { 'btn--active': open }) }
        onClick={ () => setOpen(val => !val) } ref={ buttonRef }
        title={ setEngineProfile ? 'Set engine profile' : 'Display engine profile information' }
      >
        { label }
        {
          setEngineProfile && <Arrow className="icon icon-arrow-down" />
        }
      </button>
    </Fill>
  );
}

function EngineProfileOverlay(props) {
  const {
    anchor,
    onClose,
    engineProfile,
    setEngineProfile,
    type
  } = props;

  return (
    <Overlay anchor={ anchor } onClose={ onClose }>
      {
        type === 'form'
          ? <EngineProfileSelection engineProfile={ engineProfile } onClose={ onClose } setEngineProfile={ setEngineProfile } />
          : <EngineProfileDescription engineProfile={ engineProfile } />
      }
    </Overlay>
  );
}

function EngineProfileSelection(props) {
  const {
    engineProfile,
    onClose
  } = props;

  const [ selectedEngineProfile, setSelectedEngineProfile ] = useState(engineProfile);

  const [ error, setError ] = useState(null);

  const onSelectEngineProfile = (newExecutionPlatform, newExecutionPlatformVersion) => {
    const newEngineProfile = {
      executionPlatform: newExecutionPlatform,
      executionPlatformVersion: newExecutionPlatformVersion
    };

    if (engineProfilesEqual(selectedEngineProfile, newEngineProfile)) {
      setSelectedEngineProfile(null);
    } else {
      setSelectedEngineProfile({
        executionPlatform: newExecutionPlatform,
        executionPlatformVersion: newExecutionPlatformVersion
      });

      setError(null);
    }
  };

  const setEngineProfile = () => {
    if (!selectedEngineProfile) {
      setError(true);

      return;
    }

    if (engineProfilesEqual(selectedEngineProfile, engineProfile)) {
      return;
    }

    props.setEngineProfile(selectedEngineProfile);

    onClose();
  };

  return (
    <Fragment>
      <Overlay.Title>
        Select the execution platform
      </Overlay.Title>
      <Overlay.Body className={ css.EngineProfileSelection }>
        <div className="form-group form-inline">
          {
            [
              [ 'Camunda Platform', '7.15' ],
              [ 'Camunda Cloud', '1.0' ],
              [ 'Camunda Cloud', '1.1' ],
            ].map(([ executionPlatform, executionPlatformVersion ]) => {
              const optionEngineProfile = {
                executionPlatform,
                executionPlatformVersion
              };

              const id = `execution-platform-${ executionPlatform }-${ executionPlatformVersion }`;

              const checked = engineProfilesEqual(selectedEngineProfile, optionEngineProfile);

              return <p
                className="custom-control custom-radio"
                key={ `${ executionPlatform} ${ executionPlatformVersion }` }>
                <input
                  id={ id }
                  className="custom-control-input"
                  type="radio"
                  checked={ checked }
                  onChange={ () => {} }
                  onClick={ () => onSelectEngineProfile(executionPlatform, executionPlatformVersion) } />
                <label className="custom-control-label" htmlFor={ id }>
                  { `${ executionPlatform } ${ executionPlatformVersion }` }
                </label>
              </p>;
            })
          }
          { error && <p className="error">Select one option.</p> }
          <button className="btn btn-primary" onClick={ setEngineProfile }>Apply</button>
        </div>
      </Overlay.Body>
      <Overlay.Footer>
        <Link href="https://docs.camunda.org/manual/latest/">Learn more</Link>
      </Overlay.Footer>
    </Fragment>
  );
}

function EngineProfileDescription(props) {
  const { engineProfile } = props;

  const { executionPlatform } = engineProfile;

  if (executionPlatform === 'Camunda Platform') {
    return (
      <Fragment>
        <Overlay.Body>
          This diagram is supposed to be executed on <em>Camunda Platform</em>.
          The properties panel provides the related implementation features.
          This diagram can be deployed to and started in a connected <em>Camunda Platform</em> instance.
        </Overlay.Body>
        <Overlay.Footer>
          <Link href="https://docs.camunda.org/manual/latest/">Learn more</Link>
        </Overlay.Footer>
      </Fragment>
    );
  } else if (executionPlatform === 'Camunda Cloud') {
    return (
      <Fragment>
        <Overlay.Body>
          This diagram is supposed to be executed on <em>Camunda Cloud</em>.
          The properties panel provides the related implementation features.
          This diagram can be deployed to and started in a connected <em>Camunda Cloud</em> instance.
        </Overlay.Body>
        <Overlay.Footer>
          <Link href="https://docs.camunda.io/">Learn more</Link>
        </Overlay.Footer>
      </Fragment>
    );
  } else if (executionPlatform === 'Camunda Platform or Cloud') {
    return (
      <Fragment>
        <Overlay.Body>
          This form is supposed to be used with <em>Camunda Platform</em> or <em>Camunda Cloud</em>.
          The properties panel provides the related implementation features.
          This form can be attached to a BPMN diagram or deployment
          and gets rendered in a connected Camunda Tasklist.
        </Overlay.Body>
        <Overlay.Footer>
          <Link href="https://docs.camunda.org/manual/latest/">Learn more</Link>
        </Overlay.Footer>
      </Fragment>
    );
  }
}

function Link(props) {
  const {
    href,
    children
  } = props;

  return (
    <a className={ css.Link } href={ href }>
      { children }
      <LinkArrow />
    </a>
  );
}

function engineProfilesEqual(a, b) {
  return !isNil(a)
    && !isNil(b)
    && a.executionPlatform === b.executionPlatform
    && a.executionPlatformVersion === b.executionPlatformVersion;
}