/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import XRPose from 'webxr-polyfill/src/api/XRPose';

export const PRIVATE = Symbol('@@webxr-polyfill/XRTransientInputHitTestResult');

export default class XRTransientInputHitTestResult {
  constructor() {
    // @TODO: Implement
    throw new Error('XRTransientInputHitTestResult is not supported yet.');
  }

  getPose(baseSpace) {
    // @TODO: Implement
  }
}
