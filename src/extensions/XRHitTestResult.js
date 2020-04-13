/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
export const PRIVATE = Symbol('@@webxr-polyfill/XRHitTestResult');
import XRSpace from 'webxr-polyfill/src/api/XRSpace';
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4';

export default class XRHitTestResult {
  constructor(frame, transform) {
    this[PRIVATE] = {
      frame,
      transform
    };
  }

  getPose(baseSpace) {
    const space = new XRSpace();
    space._baseMatrix = mat4.copy(mat4.create(), this[PRIVATE].transform.matrix);
    return this[PRIVATE].frame.getPose(space, baseSpace);
  }

  get _frame() {
    return this[PRIVATE].frame;
  }
}
