/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
export const PRIVATE = Symbol('@@webxr-polyfill/XRHitTestSource');

import XRRay from './XRRay';

export default class XRHitTestSource {
  constructor(session, options) {
    if (!options.space) {
      throw new Error('XRHitTestSource requires space.');
    }

    // Constrain to iOS hit test capability

    if (options.space._specialType !== 'viewer') {
      throw new Error('XRHitTestSource supports only viewer space for now.');
    }

    if (options.entityTypes) {
      for (const entityType of options.entityTypes) {
        if (entityType !== 'plane') {
          throw new Error('XRHitTestSource does not support entityType' + entityType + ' yet.');
        }
      }
    }

    if (options.offsetRay) {
      if (options.offsetRay.origin.x !== 0.0 ||
        options.offsetRay.origin.y !== 0.0 ||
        options.offsetRay.origin.z !== 0.0 ||
        options.offsetRay.origin.w !== 1.0) {
        throw new Error('XRHitTestSource supports offsetRay.origin yet.');
      }
    }

    this[PRIVATE] = {
      session,
      space: options.space,
      offsetRay: options.offsetRay || new XRRay(),
      active: true
    };
  }

  cancel() {
    // @TODO: Throw InvalidStateError if active is already false
    this[PRIVATE].active = false;
  }

  get _space() {
    return this[PRIVATE].space;
  }

  get _session() {
    return this[PRIVATE].session;
  }

  get _offsetRay() {
    return this[PRIVATE].offsetRay;
  }

  get _active() {
    return this[PRIVATE].active;
  }
}
