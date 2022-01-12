/**
 * @license
 * webxr-ios-js
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */

/**
 * @license
 * webxr-polyfill
 * Copyright (c) 2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @license
 * wglu-preserve-state
 * Copyright (c) 2016, Brandon Jones.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @license
 * nosleep.js
 * Copyright (c) 2017, Rich Tibbett
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

const _global = typeof global !== 'undefined' ? global :
                typeof self !== 'undefined' ? self :
                typeof window !== 'undefined' ? window : {};

const PRIVATE = Symbol('@@webxr-polyfill/EventTarget');
class EventTarget {
  constructor() {
    this[PRIVATE] = {
      listeners: new Map(),
    };
  }
  addEventListener(type, listener) {
    if (typeof type !== 'string') { throw new Error('`type` must be a string'); }
    if (typeof listener !== 'function') { throw new Error('`listener` must be a function'); }
    const typedListeners = this[PRIVATE].listeners.get(type) || [];
    typedListeners.push(listener);
    this[PRIVATE].listeners.set(type, typedListeners);
  }
  removeEventListener(type, listener) {
    if (typeof type !== 'string') { throw new Error('`type` must be a string'); }
    if (typeof listener !== 'function') { throw new Error('`listener` must be a function'); }
    const typedListeners = this[PRIVATE].listeners.get(type) || [];
    for (let i = typedListeners.length; i >= 0; i--) {
      if (typedListeners[i] === listener) {
        typedListeners.pop();
      }
    }
  }
  dispatchEvent(type, event) {
    const typedListeners = this[PRIVATE].listeners.get(type) || [];
    const queue = [];
    for (let i = 0; i < typedListeners.length; i++) {
      queue[i] = typedListeners[i];
    }
    for (let listener of queue) {
      listener(event);
    }
    if (typeof this[`on${type}`] === 'function') {
      this[`on${type}`](event);
    }
  }
}

const EPSILON = 0.000001;
let ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;


const degree = Math.PI / 180;

function create() {
  let out = new ARRAY_TYPE(16);
  if(ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}


function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}

function invert(out, a) {
  let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  let b00 = a00 * a11 - a01 * a10;
  let b01 = a00 * a12 - a02 * a10;
  let b02 = a00 * a13 - a03 * a10;
  let b03 = a01 * a12 - a02 * a11;
  let b04 = a01 * a13 - a03 * a11;
  let b05 = a02 * a13 - a03 * a12;
  let b06 = a20 * a31 - a21 * a30;
  let b07 = a20 * a32 - a22 * a30;
  let b08 = a20 * a33 - a23 * a30;
  let b09 = a21 * a32 - a22 * a31;
  let b10 = a21 * a33 - a23 * a31;
  let b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) {
    return null;
  }
  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}


function multiply(out, a, b) {
  let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  return out;
}












function fromRotationTranslation(out, q, v) {
  let x = q[0], y = q[1], z = q[2], w = q[3];
  let x2 = x + x;
  let y2 = y + y;
  let z2 = z + z;
  let xx = x * x2;
  let xy = x * y2;
  let xz = x * z2;
  let yy = y * y2;
  let yz = y * z2;
  let zz = z * z2;
  let wx = w * x2;
  let wy = w * y2;
  let wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}

function getRotation(out, mat) {
  let trace = mat[0] + mat[5] + mat[10];
  let S = 0;
  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (mat[6] - mat[9]) / S;
    out[1] = (mat[8] - mat[2]) / S;
    out[2] = (mat[1] - mat[4]) / S;
  } else if ((mat[0] > mat[5]) && (mat[0] > mat[10])) {
    S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
    out[3] = (mat[6] - mat[9]) / S;
    out[0] = 0.25 * S;
    out[1] = (mat[1] + mat[4]) / S;
    out[2] = (mat[8] + mat[2]) / S;
  } else if (mat[5] > mat[10]) {
    S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
    out[3] = (mat[8] - mat[2]) / S;
    out[0] = (mat[1] + mat[4]) / S;
    out[1] = 0.25 * S;
    out[2] = (mat[6] + mat[9]) / S;
  } else {
    S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
    out[3] = (mat[1] - mat[4]) / S;
    out[0] = (mat[8] + mat[2]) / S;
    out[1] = (mat[6] + mat[9]) / S;
    out[2] = 0.25 * S;
  }
  return out;
}

function create$1() {
  let out = new ARRAY_TYPE(3);
  if(ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  return out;
}
function clone$1(a) {
  var out = new ARRAY_TYPE(3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
function length(a) {
  let x = a[0];
  let y = a[1];
  let z = a[2];
  return Math.sqrt(x*x + y*y + z*z);
}
function fromValues$1(x, y, z) {
  let out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
function copy$1(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}

function add$1(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}








function scale$1(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}






function normalize(out, a) {
  let x = a[0];
  let y = a[1];
  let z = a[2];
  let len = x*x + y*y + z*z;
  if (len > 0) {
    len = 1 / Math.sqrt(len);
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
  }
  return out;
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(out, a, b) {
  let ax = a[0], ay = a[1], az = a[2];
  let bx = b[0], by = b[1], bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}






function transformQuat(out, a, q) {
    let qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    let x = a[0], y = a[1], z = a[2];
    let uvx = qy * z - qz * y,
        uvy = qz * x - qx * z,
        uvz = qx * y - qy * x;
    let uuvx = qy * uvz - qz * uvy,
        uuvy = qz * uvx - qx * uvz,
        uuvz = qx * uvy - qy * uvx;
    let w2 = qw * 2;
    uvx *= w2;
    uvy *= w2;
    uvz *= w2;
    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;
    out[0] = x + uvx + uuvx;
    out[1] = y + uvy + uuvy;
    out[2] = z + uvz + uuvz;
    return out;
}



function angle(a, b) {
  let tempA = fromValues$1(a[0], a[1], a[2]);
  let tempB = fromValues$1(b[0], b[1], b[2]);
  normalize(tempA, tempA);
  normalize(tempB, tempB);
  let cosine = dot(tempA, tempB);
  if(cosine > 1.0) {
    return 0;
  }
  else if(cosine < -1.0) {
    return Math.PI;
  } else {
    return Math.acos(cosine);
  }
}








const len = length;

const forEach = (function() {
  let vec = create$1();
  return function(a, stride, offset, count, fn, arg) {
    let i, l;
    if(!stride) {
      stride = 3;
    }
    if(!offset) {
      offset = 0;
    }
    if(count) {
      l = Math.min((count * stride) + offset, a.length);
    } else {
      l = a.length;
    }
    for(i = offset; i < l; i += stride) {
      vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
      fn(vec, vec, arg);
      a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
    }
    return a;
  };
})();

function create$2() {
  let out = new ARRAY_TYPE(9);
  if(ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }
  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}

function create$3() {
  let out = new ARRAY_TYPE(4);
  if(ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }
  return out;
}
function clone$3(a) {
  let out = new ARRAY_TYPE(4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
function fromValues$3(x, y, z, w) {
  let out = new ARRAY_TYPE(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
function copy$3(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}


















function normalize$1(out, a) {
  let x = a[0];
  let y = a[1];
  let z = a[2];
  let w = a[3];
  let len = x*x + y*y + z*z + w*w;
  if (len > 0) {
    len = 1 / Math.sqrt(len);
    out[0] = x * len;
    out[1] = y * len;
    out[2] = z * len;
    out[3] = w * len;
  }
  return out;
}















const forEach$1 = (function() {
  let vec = create$3();
  return function(a, stride, offset, count, fn, arg) {
    let i, l;
    if(!stride) {
      stride = 4;
    }
    if(!offset) {
      offset = 0;
    }
    if(count) {
      l = Math.min((count * stride) + offset, a.length);
    } else {
      l = a.length;
    }
    for(i = offset; i < l; i += stride) {
      vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
      fn(vec, vec, arg);
      a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
    }
    return a;
  };
})();

function create$4() {
  let out = new ARRAY_TYPE(4);
  if(ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  out[3] = 1;
  return out;
}

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  let s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}

function multiply$4(out, a, b) {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  out[0] = ax * bw + aw * bx + ay * bz - az * by;
  out[1] = ay * bw + aw * by + az * bx - ax * bz;
  out[2] = az * bw + aw * bz + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}




function slerp(out, a, b, t) {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let omega, cosom, sinom, scale0, scale1;
  cosom = ax * bx + ay * by + az * bz + aw * bw;
  if ( cosom < 0.0 ) {
    cosom = -cosom;
    bx = - bx;
    by = - by;
    bz = - bz;
    bw = - bw;
  }
  if ( (1.0 - cosom) > EPSILON ) {
    omega  = Math.acos(cosom);
    sinom  = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    scale0 = 1.0 - t;
    scale1 = t;
  }
  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}

function invert$2(out, a) {
  let a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
  let dot$$1 = a0*a0 + a1*a1 + a2*a2 + a3*a3;
  let invDot = dot$$1 ? 1.0/dot$$1 : 0;
  out[0] = -a0*invDot;
  out[1] = -a1*invDot;
  out[2] = -a2*invDot;
  out[3] = a3*invDot;
  return out;
}

function fromMat3(out, m) {
  let fTrace = m[0] + m[4] + m[8];
  let fRoot;
  if ( fTrace > 0.0 ) {
    fRoot = Math.sqrt(fTrace + 1.0);
    out[3] = 0.5 * fRoot;
    fRoot = 0.5/fRoot;
    out[0] = (m[5]-m[7])*fRoot;
    out[1] = (m[6]-m[2])*fRoot;
    out[2] = (m[1]-m[3])*fRoot;
  } else {
    let i = 0;
    if ( m[4] > m[0] )
      i = 1;
    if ( m[8] > m[i*3+i] )
      i = 2;
    let j = (i+1)%3;
    let k = (i+2)%3;
    fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
    out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
    out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
  }
  return out;
}
function fromEuler(out, x, y, z) {
    let halfToRad = 0.5 * Math.PI / 180.0;
    x *= halfToRad;
    y *= halfToRad;
    z *= halfToRad;
    let sx = Math.sin(x);
    let cx = Math.cos(x);
    let sy = Math.sin(y);
    let cy = Math.cos(y);
    let sz = Math.sin(z);
    let cz = Math.cos(z);
    out[0] = sx * cy * cz - cx * sy * sz;
    out[1] = cx * sy * cz + sx * cy * sz;
    out[2] = cx * cy * sz - sx * sy * cz;
    out[3] = cx * cy * cz + sx * sy * sz;
    return out;
}

const clone$4 = clone$3;
const fromValues$4 = fromValues$3;
const copy$4 = copy$3;










const normalize$2 = normalize$1;


const rotationTo = (function() {
  let tmpvec3 = create$1();
  let xUnitVec3 = fromValues$1(1,0,0);
  let yUnitVec3 = fromValues$1(0,1,0);
  return function(out, a, b) {
    let dot$$1 = dot(a, b);
    if (dot$$1 < -0.999999) {
      cross(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 0.000001)
        cross(tmpvec3, yUnitVec3, a);
      normalize(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot$$1 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot$$1;
      return normalize$2(out, out);
    }
  };
})();
const sqlerp = (function () {
  let temp1 = create$4();
  let temp2 = create$4();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
}());
const setAxes = (function() {
  let matr = create$2();
  return function(out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize$2(out, fromMat3(out, matr));
  };
})();

const PRIVATE$1 = Symbol('@@webxr-polyfill/XRRigidTransform');
class XRRigidTransform$1 {
  constructor() {
    this[PRIVATE$1] = {
      matrix: null,
      position: null,
      orientation: null,
      inverse: null,
    };
    if (arguments.length === 0) {
      this[PRIVATE$1].matrix = identity(new Float32Array(16));
    } else if (arguments.length === 1) {
      if (arguments[0] instanceof Float32Array) {
        this[PRIVATE$1].matrix = arguments[0];
      } else {
        this[PRIVATE$1].position = this._getPoint(arguments[0]);
        this[PRIVATE$1].orientation = DOMPointReadOnly.fromPoint({
            x: 0, y: 0, z: 0, w: 1
        });
      }
    } else if (arguments.length === 2) {
      this[PRIVATE$1].position = this._getPoint(arguments[0]);
      this[PRIVATE$1].orientation = this._getPoint(arguments[1]);
    } else {
      throw new Error("Too many arguments!");
    }
    if (this[PRIVATE$1].matrix) {
        let position = create$1();
        getTranslation(position, this[PRIVATE$1].matrix);
        this[PRIVATE$1].position = DOMPointReadOnly.fromPoint({
            x: position[0],
            y: position[1],
            z: position[2]
        });
        let orientation = create$4();
        getRotation(orientation, this[PRIVATE$1].matrix);
        this[PRIVATE$1].orientation = DOMPointReadOnly.fromPoint({
          x: orientation[0],
          y: orientation[1],
          z: orientation[2],
          w: orientation[3]
        });
    } else {
        this[PRIVATE$1].matrix = identity(new Float32Array(16));
        fromRotationTranslation(
          this[PRIVATE$1].matrix,
          fromValues$4(
            this[PRIVATE$1].orientation.x,
            this[PRIVATE$1].orientation.y,
            this[PRIVATE$1].orientation.z,
            this[PRIVATE$1].orientation.w),
          fromValues$1(
            this[PRIVATE$1].position.x,
            this[PRIVATE$1].position.y,
            this[PRIVATE$1].position.z)
        );
    }
  }
  _getPoint(arg) {
    if (arg instanceof DOMPointReadOnly) {
      return arg;
    }
    return DOMPointReadOnly.fromPoint(arg);
  }
  get matrix() { return this[PRIVATE$1].matrix; }
  get position() { return this[PRIVATE$1].position; }
  get orientation() { return this[PRIVATE$1].orientation; }
  get inverse() {
    if (this[PRIVATE$1].inverse === null) {
      let invMatrix = identity(new Float32Array(16));
      invert(invMatrix, this[PRIVATE$1].matrix);
      this[PRIVATE$1].inverse = new XRRigidTransform$1(invMatrix);
      this[PRIVATE$1].inverse[PRIVATE$1].inverse = this;
    }
    return this[PRIVATE$1].inverse;
  }
}

const PRIVATE$2 = Symbol('@@webxr-polyfill/XRSpace');

class XRSpace {
  constructor(specialType = null, inputSource = null) {
    this[PRIVATE$2] = {
      specialType,
      inputSource,
      baseMatrix: null,
      inverseBaseMatrix: null,
      lastFrameId: -1
    };
  }
  get _specialType() {
    return this[PRIVATE$2].specialType;
  }
  get _inputSource() {
    return this[PRIVATE$2].inputSource;
  }
  _ensurePoseUpdated(device, frameId) {
    if (frameId == this[PRIVATE$2].lastFrameId) return;
    this[PRIVATE$2].lastFrameId = frameId;
    this._onPoseUpdate(device);
  }
  _onPoseUpdate(device) {
    if (this[PRIVATE$2].specialType == 'viewer') {
      this._baseMatrix = device.getBasePoseMatrix();
    }
  }
  set _baseMatrix(matrix) {
    this[PRIVATE$2].baseMatrix = matrix;
    this[PRIVATE$2].inverseBaseMatrix = null;
  }
  get _baseMatrix() {
    if (!this[PRIVATE$2].baseMatrix) {
      if (this[PRIVATE$2].inverseBaseMatrix) {
        this[PRIVATE$2].baseMatrix = new Float32Array(16);
        invert(this[PRIVATE$2].baseMatrix, this[PRIVATE$2].inverseBaseMatrix);
      }
    }
    return this[PRIVATE$2].baseMatrix;
  }
  set _inverseBaseMatrix(matrix) {
    this[PRIVATE$2].inverseBaseMatrix = matrix;
    this[PRIVATE$2].baseMatrix = null;
  }
  get _inverseBaseMatrix() {
    if (!this[PRIVATE$2].inverseBaseMatrix) {
      if (this[PRIVATE$2].baseMatrix) {
        this[PRIVATE$2].inverseBaseMatrix = new Float32Array(16);
        invert(this[PRIVATE$2].inverseBaseMatrix, this[PRIVATE$2].baseMatrix);
      }
    }
    return this[PRIVATE$2].inverseBaseMatrix;
  }
  _getSpaceRelativeTransform(space) {
    if (!this._inverseBaseMatrix || !space._baseMatrix) {
      return null;
    }
    let out = new Float32Array(16);
    multiply(out, this._inverseBaseMatrix, space._baseMatrix);
    return new XRRigidTransform$1(out);
  }
}

const DEFAULT_EMULATION_HEIGHT = 1.6;
const PRIVATE$3 = Symbol('@@webxr-polyfill/XRReferenceSpace');
const XRReferenceSpaceTypes = [
  'viewer',
  'local',
  'local-floor',
  'bounded-floor',
  'unbounded'
];
function isFloor(type) {
  return type === 'bounded-floor' || type === 'local-floor';
}
class XRReferenceSpace extends XRSpace {
  constructor(type, transform = null) {
    if (!XRReferenceSpaceTypes.includes(type)) {
      throw new Error(`XRReferenceSpaceType must be one of ${XRReferenceSpaceTypes}`);
    }
    super(type);
    if (type === 'bounded-floor' && !transform) {
      throw new Error(`XRReferenceSpace cannot use 'bounded-floor' type if the platform does not provide the floor level`);
    }
    if (isFloor(type) && !transform) {
      transform = identity(new Float32Array(16));
      transform[13] = DEFAULT_EMULATION_HEIGHT;
    }
    this._inverseBaseMatrix = transform || identity(new Float32Array(16));
    this[PRIVATE$3] = {
      type,
      transform,
      originOffset : identity(new Float32Array(16)),
    };
  }
  _transformBasePoseMatrix(out, pose) {
    multiply(out, this._inverseBaseMatrix, pose);
  }
  _originOffsetMatrix() {
    return this[PRIVATE$3].originOffset;
  }
  _adjustForOriginOffset(transformMatrix) {
    let inverseOriginOffsetMatrix = new Float32Array(16);
    invert(inverseOriginOffsetMatrix, this[PRIVATE$3].originOffset);
    multiply(transformMatrix, inverseOriginOffsetMatrix, transformMatrix);
  }
  _getSpaceRelativeTransform(space) {
    let transform = super._getSpaceRelativeTransform(space);
    this._adjustForOriginOffset(transform.matrix);
    return new XRRigidTransform(transform.matrix);
  }
  getOffsetReferenceSpace(additionalOffset) {
    let newSpace = new XRReferenceSpace(
      this[PRIVATE$3].type,
      this[PRIVATE$3].transform,
      this[PRIVATE$3].bounds);
    multiply(newSpace[PRIVATE$3].originOffset, this[PRIVATE$3].originOffset, additionalOffset.matrix);
    return newSpace;
  }
}

const PRIVATE$4 = Symbol('@@webxr-polyfill/XR');
const XRSessionModes = ['inline', 'immersive-vr', 'immersive-ar'];
const DEFAULT_SESSION_OPTIONS = {
  'inline': {
    requiredFeatures: ['viewer'],
    optionalFeatures: [],
  },
  'immersive-vr': {
    requiredFeatures: ['viewer', 'local'],
    optionalFeatures: [],
  },
  'immersive-ar': {
    requiredFeatures: ['viewer', 'local'],
    optionalFeatures: [],
  }
};
const POLYFILL_REQUEST_SESSION_ERROR =
`Polyfill Error: Must call navigator.xr.isSessionSupported() with any XRSessionMode
or navigator.xr.requestSession('inline') prior to requesting an immersive
session. This is a limitation specific to the WebXR Polyfill and does not apply
to native implementations of the API.`;
class XRSystem extends EventTarget {
  constructor(devicePromise) {
    super();
    this[PRIVATE$4] = {
      device: null,
      devicePromise,
      immersiveSession: null,
      inlineSessions: new Set(),
    };
    devicePromise.then((device) => { this[PRIVATE$4].device = device; });
  }
  async isSessionSupported(mode) {
    if (!this[PRIVATE$4].device) {
      await this[PRIVATE$4].devicePromise;
    }
    if (mode != 'inline') {
      return Promise.resolve(this[PRIVATE$4].device.isSessionSupported(mode));
    }
    return Promise.resolve(true);
  }
  async requestSession(mode, options) {
    if (!this[PRIVATE$4].device) {
      if (mode != 'inline') {
        throw new Error(POLYFILL_REQUEST_SESSION_ERROR);
      } else {
        await this[PRIVATE$4].devicePromise;
      }
    }
    if (!XRSessionModes.includes(mode)) {
      throw new TypeError(
          `The provided value '${mode}' is not a valid enum value of type XRSessionMode`);
    }
    const defaultOptions = DEFAULT_SESSION_OPTIONS[mode];
    const requiredFeatures = defaultOptions.requiredFeatures.concat(
        options && options.requiredFeatures ? options.requiredFeatures : []);
    const optionalFeatures = defaultOptions.optionalFeatures.concat(
        options && options.optionalFeatures ? options.optionalFeatures : []);
    const enabledFeatures = new Set();
    let requirementsFailed = false;
    for (let feature of requiredFeatures) {
      if (!this[PRIVATE$4].device.isFeatureSupported(feature)) {
        console.error(`The required feature '${feature}' is not supported`);
        requirementsFailed = true;
      } else {
        enabledFeatures.add(feature);
      }
    }
    if (requirementsFailed) {
      throw new DOMException('Session does not support some required features', 'NotSupportedError');
    }
    for (let feature of optionalFeatures) {
      if (!this[PRIVATE$4].device.isFeatureSupported(feature)) {
        console.log(`The optional feature '${feature}' is not supported`);
      } else {
        enabledFeatures.add(feature);
      }
    }
    const sessionId = await this[PRIVATE$4].device.requestSession(mode, enabledFeatures);
    const session = new XRSession(this[PRIVATE$4].device, mode, sessionId);
    if (mode == 'inline') {
      this[PRIVATE$4].inlineSessions.add(session);
    } else {
      this[PRIVATE$4].immersiveSession = session;
    }
    const onSessionEnd = () => {
      if (mode == 'inline') {
        this[PRIVATE$4].inlineSessions.delete(session);
      } else {
        this[PRIVATE$4].immersiveSession = null;
      }
      session.removeEventListener('end', onSessionEnd);
    };
    session.addEventListener('end', onSessionEnd);
    return session;
  }
}

let now;
if ('performance' in _global === false) {
  let startTime = Date.now();
  now = () => Date.now() - startTime;
} else {
  now = () => performance.now();
}
var now$1 = now;

const PRIVATE$5 = Symbol('@@webxr-polyfill/XRPose');
class XRPose$1 {
  constructor(transform, emulatedPosition) {
    this[PRIVATE$5] = {
      transform,
      emulatedPosition,
    };
  }
  get transform() { return this[PRIVATE$5].transform; }
  get emulatedPosition() { return this[PRIVATE$5].emulatedPosition; }
}

const PRIVATE$6 = Symbol('@@webxr-polyfill/XRViewerPose');
class XRViewerPose extends XRPose$1 {
  constructor(transform, views, emulatedPosition = false) {
    super(transform, emulatedPosition);
    this[PRIVATE$6] = {
      views
    };
  }
  get views() {
    return this[PRIVATE$6].views;
  }
}

const PRIVATE$7 = Symbol('@@webxr-polyfill/XRViewport');
class XRViewport {
  constructor(target) {
    this[PRIVATE$7] = { target };
  }
  get x() { return this[PRIVATE$7].target.x; }
  get y() { return this[PRIVATE$7].target.y; }
  get width() { return this[PRIVATE$7].target.width; }
  get height() { return this[PRIVATE$7].target.height; }
}

const XREyes = ['left', 'right', 'none'];
const PRIVATE$8 = Symbol('@@webxr-polyfill/XRView');
class XRView {
  constructor(device, transform, eye, sessionId) {
    if (!XREyes.includes(eye)) {
      throw new Error(`XREye must be one of: ${XREyes}`);
    }
    const temp = Object.create(null);
    const viewport = new XRViewport(temp);
    this[PRIVATE$8] = {
      device,
      eye,
      viewport,
      temp,
      sessionId,
      transform,
    };
  }
  get eye() { return this[PRIVATE$8].eye; }
  get projectionMatrix() { return this[PRIVATE$8].device.getProjectionMatrix(this.eye); }
  get transform() { return this[PRIVATE$8].transform; }
  _getViewport(layer) {
    if (this[PRIVATE$8].device.getViewport(this[PRIVATE$8].sessionId,
                                           this.eye,
                                           layer,
                                           this[PRIVATE$8].temp)) {
      return this[PRIVATE$8].viewport;
    }
    return undefined;
  }
}

const PRIVATE$9 = Symbol('@@webxr-polyfill/XRFrame');
const NON_ACTIVE_MSG = "XRFrame access outside the callback that produced it is invalid.";
const NON_ANIMFRAME_MSG = "getViewerPose can only be called on XRFrame objects passed to XRSession.requestAnimationFrame callbacks.";
let NEXT_FRAME_ID = 0;
class XRFrame$1 {
  constructor(device, session, sessionId) {
    this[PRIVATE$9] = {
      id: ++NEXT_FRAME_ID,
      active: false,
      animationFrame: false,
      device,
      session,
      sessionId
    };
  }
  get session() { return this[PRIVATE$9].session; }
  getViewerPose(referenceSpace) {
    if (!this[PRIVATE$9].animationFrame) {
      throw new DOMException(NON_ANIMFRAME_MSG, 'InvalidStateError');
    }
    if (!this[PRIVATE$9].active) {
      throw new DOMException(NON_ACTIVE_MSG, 'InvalidStateError');
    }
    const device = this[PRIVATE$9].device;
    const session = this[PRIVATE$9].session;
    session[PRIVATE$15].viewerSpace._ensurePoseUpdated(device, this[PRIVATE$9].id);
    referenceSpace._ensurePoseUpdated(device, this[PRIVATE$9].id);
    let viewerTransform = referenceSpace._getSpaceRelativeTransform(session[PRIVATE$15].viewerSpace);
    const views = [];
    for (let viewSpace of session[PRIVATE$15].viewSpaces) {
      viewSpace._ensurePoseUpdated(device, this[PRIVATE$9].id);
      let viewTransform = referenceSpace._getSpaceRelativeTransform(viewSpace);
      let view = new XRView(device, viewTransform, viewSpace.eye, this[PRIVATE$9].sessionId);
      views.push(view);
    }
    let viewerPose = new XRViewerPose(viewerTransform, views, false                             );
    return viewerPose;
  }
  getPose(space, baseSpace) {
    if (!this[PRIVATE$9].active) {
      throw new DOMException(NON_ACTIVE_MSG, 'InvalidStateError');
    }
    const device = this[PRIVATE$9].device;
    if (space._specialType === "target-ray" || space._specialType === "grip") {
      return device.getInputPose(
        space._inputSource, baseSpace, space._specialType);
    } else {
      space._ensurePoseUpdated(device, this[PRIVATE$9].id);
      baseSpace._ensurePoseUpdated(device, this[PRIVATE$9].id);
      let transform = baseSpace._getSpaceRelativeTransform(space);
      if (!transform) { return null; }
      return new XRPose(transform, false                             );
    }
    return null;
  }
}

const PRIVATE$10 = Symbol('@@webxr-polyfill/XRRenderState');
const XRRenderStateInit = Object.freeze({
  depthNear: 0.1,
  depthFar: 1000.0,
  inlineVerticalFieldOfView: null,
  baseLayer: null
});
class XRRenderState {
  constructor(stateInit = {}) {
    const config = Object.assign({}, XRRenderStateInit, stateInit);
    this[PRIVATE$10] = { config };
  }
  get depthNear() { return this[PRIVATE$10].config.depthNear; }
  get depthFar() { return this[PRIVATE$10].config.depthFar; }
  get inlineVerticalFieldOfView() { return this[PRIVATE$10].config.inlineVerticalFieldOfView; }
  get baseLayer() { return this[PRIVATE$10].config.baseLayer; }
}

const POLYFILLED_XR_COMPATIBLE = Symbol('@@webxr-polyfill/polyfilled-xr-compatible');
const XR_COMPATIBLE = Symbol('@@webxr-polyfill/xr-compatible');

const PRIVATE$11 = Symbol('@@webxr-polyfill/XRWebGLLayer');
const XRWebGLLayerInit = Object.freeze({
  antialias: true,
  depth: false,
  stencil: false,
  alpha: true,
  multiview: false,
  ignoreDepthValues: false,
  framebufferScaleFactor: 1.0,
});
class XRWebGLLayer {
  constructor(session, context, layerInit={}) {
    const config = Object.assign({}, XRWebGLLayerInit, layerInit);
    if (!(session instanceof XRSession$1)) {
      throw new Error('session must be a XRSession');
    }
    if (session.ended) {
      throw new Error(`InvalidStateError`);
    }
    if (context[POLYFILLED_XR_COMPATIBLE]) {
      if (context[XR_COMPATIBLE] !== true) {
        throw new Error(`InvalidStateError`);
      }
    }
    const framebuffer = context.getParameter(context.FRAMEBUFFER_BINDING);
    this[PRIVATE$11] = {
      context,
      config,
      framebuffer,
      session,
    };
  }
  get context() { return this[PRIVATE$11].context; }
  get antialias() { return this[PRIVATE$11].config.antialias; }
  get ignoreDepthValues() { return true; }
  get framebuffer() { return this[PRIVATE$11].framebuffer; }
  get framebufferWidth() { return this[PRIVATE$11].context.drawingBufferWidth; }
  get framebufferHeight() { return this[PRIVATE$11].context.drawingBufferHeight; }
  get _session() { return this[PRIVATE$11].session; }
  getViewport(view) {
    return view._getViewport(this);
  }
  static getNativeFramebufferScaleFactor(session) {
    if (!session) {
      throw new TypeError('getNativeFramebufferScaleFactor must be passed a session.')
    }
    if (session[PRIVATE$15].ended) { return 0.0; }
    return 1.0;
  }
}

const PRIVATE$12 = Symbol('@@webxr-polyfill/XRInputSourceEvent');
class XRInputSourceEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this[PRIVATE$12] = {
      frame: eventInitDict.frame,
      inputSource: eventInitDict.inputSource
    };
    Object.setPrototypeOf(this, XRInputSourceEvent.prototype);
  }
  get frame() { return this[PRIVATE$12].frame; }
  get inputSource() { return this[PRIVATE$12].inputSource; }
}

const PRIVATE$13 = Symbol('@@webxr-polyfill/XRSessionEvent');
class XRSessionEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this[PRIVATE$13] = {
      session: eventInitDict.session
    };
    Object.setPrototypeOf(this, XRSessionEvent.prototype);
  }
  get session() { return this[PRIVATE$13].session; }
}

const PRIVATE$14 = Symbol('@@webxr-polyfill/XRInputSourcesChangeEvent');
class XRInputSourcesChangeEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this[PRIVATE$14] = {
      session: eventInitDict.session,
      added: eventInitDict.added,
      removed: eventInitDict.removed
    };
    Object.setPrototypeOf(this, XRInputSourcesChangeEvent.prototype);
  }
  get session() { return this[PRIVATE$14].session; }
  get added() { return this[PRIVATE$14].added; }
  get removed() { return this[PRIVATE$14].removed; }
}

const PRIVATE$15 = Symbol('@@webxr-polyfill/XRSession');
class XRViewSpace extends XRSpace {
  constructor(eye) {
    super(eye);
  }
  get eye() {
    return this._specialType;
  }
  _onPoseUpdate(device) {
    this._inverseBaseMatrix = device.getBaseViewMatrix(this._specialType);
  }
}
class XRSession$1 extends EventTarget {
  constructor(device, mode, id) {
    super();
    let immersive = mode != 'inline';
    let initialRenderState = new XRRenderState({
      inlineVerticalFieldOfView: immersive ? null : Math.PI * 0.5
    });
    this[PRIVATE$15] = {
      device,
      mode,
      immersive,
      ended: false,
      suspended: false,
      frameCallbacks: [],
      currentFrameCallbacks: null,
      frameHandle: 0,
      deviceFrameHandle: null,
      id,
      activeRenderState: initialRenderState,
      pendingRenderState: null,
      viewerSpace: new XRReferenceSpace("viewer"),
      viewSpaces: [],
      currentInputSources: []
    };
    if (immersive) {
      this[PRIVATE$15].viewSpaces.push(new XRViewSpace('left'),
                                    new XRViewSpace('right'));
    } else {
      this[PRIVATE$15].viewSpaces.push(new XRViewSpace('none'));
    }
    this[PRIVATE$15].onDeviceFrame = () => {
      if (this[PRIVATE$15].ended || this[PRIVATE$15].suspended) {
        return;
      }
      this[PRIVATE$15].deviceFrameHandle = null;
      this[PRIVATE$15].startDeviceFrameLoop();
      if (this[PRIVATE$15].pendingRenderState !== null) {
        this[PRIVATE$15].activeRenderState = new XRRenderState(this[PRIVATE$15].pendingRenderState);
        this[PRIVATE$15].pendingRenderState = null;
        if (this[PRIVATE$15].activeRenderState.baseLayer) {
          this[PRIVATE$15].device.onBaseLayerSet(
            this[PRIVATE$15].id,
            this[PRIVATE$15].activeRenderState.baseLayer);
        }
      }
      if (this[PRIVATE$15].activeRenderState.baseLayer === null) {
        return;
      }
      const frame = new XRFrame$1(device, this, this[PRIVATE$15].id);
      const callbacks = this[PRIVATE$15].currentFrameCallbacks = this[PRIVATE$15].frameCallbacks;
      this[PRIVATE$15].frameCallbacks = [];
      frame[PRIVATE$9].active = true;
      frame[PRIVATE$9].animationFrame = true;
      this[PRIVATE$15].device.onFrameStart(this[PRIVATE$15].id, this[PRIVATE$15].activeRenderState);
      this._checkInputSourcesChange();
      const rightNow = now$1();
      for (let i = 0; i < callbacks.length; i++) {
        try {
          if (!callbacks[i].cancelled && typeof callbacks[i].callback === 'function') {
            callbacks[i].callback(rightNow, frame);
          }
        } catch(err) {
          console.error(err);
        }
      }
      this[PRIVATE$15].currentFrameCallbacks = null;
      frame[PRIVATE$9].active = false;
      this[PRIVATE$15].device.onFrameEnd(this[PRIVATE$15].id);
    };
    this[PRIVATE$15].startDeviceFrameLoop = () => {
      if (this[PRIVATE$15].deviceFrameHandle === null) {
        this[PRIVATE$15].deviceFrameHandle = this[PRIVATE$15].device.requestAnimationFrame(
          this[PRIVATE$15].onDeviceFrame
        );
      }
    };
    this[PRIVATE$15].stopDeviceFrameLoop = () => {
      const handle = this[PRIVATE$15].deviceFrameHandle;
      if (handle !== null) {
        this[PRIVATE$15].device.cancelAnimationFrame(handle);
        this[PRIVATE$15].deviceFrameHandle = null;
      }
    };
    this[PRIVATE$15].onPresentationEnd = sessionId => {
      if (sessionId !== this[PRIVATE$15].id) {
        this[PRIVATE$15].suspended = false;
        this[PRIVATE$15].startDeviceFrameLoop();
        this.dispatchEvent('focus', { session: this });
        return;
      }
      this[PRIVATE$15].ended = true;
      this[PRIVATE$15].stopDeviceFrameLoop();
      device.removeEventListener('@@webxr-polyfill/vr-present-end', this[PRIVATE$15].onPresentationEnd);
      device.removeEventListener('@@webxr-polyfill/vr-present-start', this[PRIVATE$15].onPresentationStart);
      device.removeEventListener('@@webxr-polyfill/input-select-start', this[PRIVATE$15].onSelectStart);
      device.removeEventListener('@@webxr-polyfill/input-select-end', this[PRIVATE$15].onSelectEnd);
      this.dispatchEvent('end', new XRSessionEvent('end', { session: this }));
    };
    device.addEventListener('@@webxr-polyfill/vr-present-end', this[PRIVATE$15].onPresentationEnd);
    this[PRIVATE$15].onPresentationStart = sessionId => {
      if (sessionId === this[PRIVATE$15].id) {
        return;
      }
      this[PRIVATE$15].suspended = true;
      this[PRIVATE$15].stopDeviceFrameLoop();
      this.dispatchEvent('blur', { session: this });
    };
    device.addEventListener('@@webxr-polyfill/vr-present-start', this[PRIVATE$15].onPresentationStart);
    this[PRIVATE$15].onSelectStart = evt => {
      if (evt.sessionId !== this[PRIVATE$15].id) {
        return;
      }
      this[PRIVATE$15].dispatchInputSourceEvent('selectstart',  evt.inputSource);
    };
    device.addEventListener('@@webxr-polyfill/input-select-start', this[PRIVATE$15].onSelectStart);
    this[PRIVATE$15].onSelectEnd = evt => {
      if (evt.sessionId !== this[PRIVATE$15].id) {
        return;
      }
      this[PRIVATE$15].dispatchInputSourceEvent('selectend',  evt.inputSource);
      this[PRIVATE$15].dispatchInputSourceEvent('select',  evt.inputSource);
    };
    device.addEventListener('@@webxr-polyfill/input-select-end', this[PRIVATE$15].onSelectEnd);
    this[PRIVATE$15].onSqueezeStart = evt => {
      if (evt.sessionId !== this[PRIVATE$15].id) {
        return;
      }
      this[PRIVATE$15].dispatchInputSourceEvent('squeezestart',  evt.inputSource);
    };
    device.addEventListener('@@webxr-polyfill/input-squeeze-start', this[PRIVATE$15].onSqueezeStart);
    this[PRIVATE$15].onSqueezeEnd = evt => {
      if (evt.sessionId !== this[PRIVATE$15].id) {
        return;
      }
      this[PRIVATE$15].dispatchInputSourceEvent('squeezeend',  evt.inputSource);
      this[PRIVATE$15].dispatchInputSourceEvent('squeeze',  evt.inputSource);
    };
    device.addEventListener('@@webxr-polyfill/input-squeeze-end', this[PRIVATE$15].onSqueezeEnd);
    this[PRIVATE$15].dispatchInputSourceEvent = (type, inputSource) => {
      const frame = new XRFrame$1(device, this, this[PRIVATE$15].id);
      const event = new XRInputSourceEvent(type, { frame, inputSource });
      frame[PRIVATE$9].active = true;
      this.dispatchEvent(type, event);
      frame[PRIVATE$9].active = false;
    };
    this[PRIVATE$15].startDeviceFrameLoop();
    this.onblur = undefined;
    this.onfocus = undefined;
    this.onresetpose = undefined;
    this.onend = undefined;
    this.onselect = undefined;
    this.onselectstart = undefined;
    this.onselectend = undefined;
  }
  get renderState() { return this[PRIVATE$15].activeRenderState; }
  get environmentBlendMode() {
    return this[PRIVATE$15].device.environmentBlendMode || 'opaque';
  }
  async requestReferenceSpace(type) {
    if (this[PRIVATE$15].ended) {
      return;
    }
    if (!XRReferenceSpaceTypes.includes(type)) {
      throw new TypeError(`XRReferenceSpaceType must be one of ${XRReferenceSpaceTypes}`);
    }
    if (!this[PRIVATE$15].device.doesSessionSupportReferenceSpace(this[PRIVATE$15].id, type)) {
      throw new DOMException(`The ${type} reference space is not supported by this session.`, 'NotSupportedError');
    }
    if (type === 'viewer') {
      return this[PRIVATE$15].viewerSpace;
    }
    let transform = await this[PRIVATE$15].device.requestFrameOfReferenceTransform(type);
    if (type === 'bounded-floor') {
      if (!transform) {
        throw new DOMException(`${type} XRReferenceSpace not supported by this device.`, 'NotSupportedError');
      }
      let bounds = this[PRIVATE$15].device.requestStageBounds();
      if (!bounds) {
        throw new DOMException(`${type} XRReferenceSpace not supported by this device.`, 'NotSupportedError');
      }
      throw new DOMException(`The WebXR polyfill does not support the ${type} reference space yet.`, 'NotSupportedError');
    }
    return new XRReferenceSpace(type, transform);
  }
  requestAnimationFrame(callback) {
    if (this[PRIVATE$15].ended) {
      return;
    }
    const handle = ++this[PRIVATE$15].frameHandle;
    this[PRIVATE$15].frameCallbacks.push({
      handle,
      callback,
      cancelled: false
    });
    return handle;
  }
  cancelAnimationFrame(handle) {
    let callbacks = this[PRIVATE$15].frameCallbacks;
    let index = callbacks.findIndex(d => d && d.handle === handle);
    if (index > -1) {
      callbacks[index].cancelled = true;
      callbacks.splice(index, 1);
    }
    callbacks = this[PRIVATE$15].currentFrameCallbacks;
    if (callbacks) {
      index = callbacks.findIndex(d => d && d.handle === handle);
      if (index > -1) {
        callbacks[index].cancelled = true;
      }
    }
  }
  get inputSources() {
    return this[PRIVATE$15].device.getInputSources();
  }
  async end() {
    if (this[PRIVATE$15].ended) {
      return;
    }
    if (this[PRIVATE$15].immersive) {
      this[PRIVATE$15].ended = true;
      this[PRIVATE$15].device.removeEventListener('@@webxr-polyfill/vr-present-start',
                                                 this[PRIVATE$15].onPresentationStart);
      this[PRIVATE$15].device.removeEventListener('@@webxr-polyfill/vr-present-end',
                                                 this[PRIVATE$15].onPresentationEnd);
      this[PRIVATE$15].device.removeEventListener('@@webxr-polyfill/input-select-start',
                                                 this[PRIVATE$15].onSelectStart);
      this[PRIVATE$15].device.removeEventListener('@@webxr-polyfill/input-select-end',
                                                 this[PRIVATE$15].onSelectEnd);
      this.dispatchEvent('end', new XRSessionEvent('end', { session: this }));
    }
    this[PRIVATE$15].stopDeviceFrameLoop();
    return this[PRIVATE$15].device.endSession(this[PRIVATE$15].id);
  }
  updateRenderState(newState) {
    if (this[PRIVATE$15].ended) {
      const message = "Can't call updateRenderState on an XRSession " +
                      "that has already ended.";
      throw new Error(message);
    }
    if (newState.baseLayer && (newState.baseLayer._session !== this)) {
      const message = "Called updateRenderState with a base layer that was " +
                      "created by a different session.";
      throw new Error(message);
    }
    const fovSet = (newState.inlineVerticalFieldOfView !== null) &&
                   (newState.inlineVerticalFieldOfView !== undefined);
    if (fovSet) {
      if (this[PRIVATE$15].immersive) {
        const message = "inlineVerticalFieldOfView must not be set for an " +
                        "XRRenderState passed to updateRenderState for an " +
                        "immersive session.";
        throw new Error(message);
      } else {
        newState.inlineVerticalFieldOfView = Math.min(
          3.13, Math.max(0.01, newState.inlineVerticalFieldOfView));
      }
    }
    if (this[PRIVATE$15].pendingRenderState === null) {
      const activeRenderState = this[PRIVATE$15].activeRenderState;
      this[PRIVATE$15].pendingRenderState = {
        depthNear: activeRenderState.depthNear,
        depthFar: activeRenderState.depthFar,
        inlineVerticalFieldOfView: activeRenderState.inlineVerticalFieldOfView,
        baseLayer: activeRenderState.baseLayer
      };
    }
    Object.assign(this[PRIVATE$15].pendingRenderState, newState);
  }
  _checkInputSourcesChange() {
    const added = [];
    const removed = [];
    const newInputSources = this.inputSources;
    const oldInputSources = this[PRIVATE$15].currentInputSources;
    for (const newInputSource of newInputSources) {
      if (!oldInputSources.includes(newInputSource)) {
        added.push(newInputSource);
      }
    }
    for (const oldInputSource of oldInputSources) {
      if (!newInputSources.includes(oldInputSource)) {
        removed.push(oldInputSource);
      }
    }
    if (added.length > 0 || removed.length > 0) {
      this.dispatchEvent('inputsourceschange', new XRInputSourcesChangeEvent('inputsourceschange', {
        session: this,
        added: added,
        removed: removed
      }));
    }
    this[PRIVATE$15].currentInputSources.length = 0;
    for (const newInputSource of newInputSources) {
      this[PRIVATE$15].currentInputSources.push(newInputSource);
    }
  }
}

const PRIVATE$16 = Symbol('@@webxr-polyfill/XRInputSource');
class XRInputSource {
  constructor(impl) {
    this[PRIVATE$16] = {
      impl,
      gripSpace: new XRSpace("grip", this),
      targetRaySpace: new XRSpace("target-ray", this)
    };
  }
  get handedness() { return this[PRIVATE$16].impl.handedness; }
  get targetRayMode() { return this[PRIVATE$16].impl.targetRayMode; }
  get gripSpace() {
    let mode = this[PRIVATE$16].impl.targetRayMode;
    if (mode === "gaze" || mode === "screen") {
      return null;
    }
    return this[PRIVATE$16].gripSpace;
  }
  get targetRaySpace() { return this[PRIVATE$16].targetRaySpace; }
  get profiles() { return this[PRIVATE$16].impl.profiles; }
  get gamepad() { return this[PRIVATE$16].impl.gamepad; }
}

const PRIVATE$17 = Symbol('@@webxr-polyfill/XRReferenceSpaceEvent');
class XRReferenceSpaceEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this[PRIVATE$17] = {
      referenceSpace: eventInitDict.referenceSpace,
      transform: eventInitDict.transform || null
    };
    Object.setPrototypeOf(this, XRReferenceSpaceEvent.prototype);
  }
  get referenceSpace() { return this[PRIVATE$17].referenceSpace; }
  get transform() { return this[PRIVATE$17].transform; }
}

var API = {
  XRSystem,
  XRSession: XRSession$1,
  XRSessionEvent,
  XRFrame: XRFrame$1,
  XRView,
  XRViewport,
  XRViewerPose,
  XRWebGLLayer,
  XRSpace,
  XRReferenceSpace,
  XRReferenceSpaceEvent,
  XRInputSource,
  XRInputSourceEvent,
  XRInputSourcesChangeEvent,
  XRRenderState,
  XRRigidTransform: XRRigidTransform$1,
  XRPose: XRPose$1,
};

const polyfillMakeXRCompatible = Context => {
  if (typeof Context.prototype.makeXRCompatible === 'function') {
    return false;
  }
  Context.prototype.makeXRCompatible = function () {
    this[XR_COMPATIBLE] = true;
    return Promise.resolve();
  };
  return true;
};
const polyfillGetContext = (Canvas) => {
  const getContext = Canvas.prototype.getContext;
  Canvas.prototype.getContext = function (contextType, glAttribs) {
    const ctx = getContext.call(this, contextType, glAttribs);
    if (ctx) {
      ctx[POLYFILLED_XR_COMPATIBLE] = true;
      if (glAttribs && ('xrCompatible' in glAttribs)) {
        ctx[XR_COMPATIBLE] = glAttribs.xrCompatible;
      }
    }
    return ctx;
  };
};

const requestXRDevice = async function (global, config) {
};

const CONFIG_DEFAULTS = {
  global: _global,
  webvr: true,
  cardboard: true,
  cardboardConfig: null,
  allowCardboardOnDesktop: false,
};
const partials = ['navigator', 'HTMLCanvasElement', 'WebGLRenderingContext'];
class WebXRPolyfill {
  constructor(config={}) {
    this.config = Object.freeze(Object.assign({}, CONFIG_DEFAULTS, config));
    this.global = this.config.global;
    this.nativeWebXR = 'xr' in this.global.navigator;
    this.injected = false;
    if (!this.nativeWebXR) {
      this._injectPolyfill(this.global);
    } else {
      this._injectCompatibilityShims(this.global);
    }
  }
  _injectPolyfill(global) {
    if (!partials.every(iface => !!global[iface])) {
      throw new Error(`Global must have the following attributes : ${partials}`);
    }
    for (const className of Object.keys(API)) {
      if (global[className] !== undefined) {
        console.warn(`${className} already defined on global.`);
      } else {
        global[className] = API[className];
      }
    }
    {
      const polyfilledCtx = polyfillMakeXRCompatible(global.WebGLRenderingContext);
      if (polyfilledCtx) {
        polyfillGetContext(global.HTMLCanvasElement);
        if (global.OffscreenCanvas) {
          polyfillGetContext(global.OffscreenCanvas);
        }
        if (global.WebGL2RenderingContext){
          polyfillMakeXRCompatible(global.WebGL2RenderingContext);
        }
        if (!window.isSecureContext) {
          console.warn(`WebXR Polyfill Warning:
This page is not running in a secure context (https:// or localhost)!
This means that although the page may be able to use the WebXR Polyfill it will
not be able to use native WebXR implementations, and as such will not be able to
access dedicated VR or AR hardware, and will not be able to take advantage of
any performance improvements a native WebXR implementation may offer. Please
host this content on a secure origin for the best user experience.
`);
        }
      }
    }
    this.injected = true;
    this._patchNavigatorXR();
  }
  _patchNavigatorXR() {
    let devicePromise = requestXRDevice(this.global, this.config);
    this.xr = new API.XRSystem(devicePromise);
    Object.defineProperty(this.global.navigator, 'xr', {
      value: this.xr,
      configurable: true,
    });
  }
  _injectCompatibilityShims(global) {
    if (!partials.every(iface => !!global[iface])) {
      throw new Error(`Global must have the following attributes : ${partials}`);
    }
    if (global.navigator.xr &&
        'supportsSession' in global.navigator.xr &&
        !('isSessionSupported' in global.navigator.xr)) {
      let originalSupportsSession = global.navigator.xr.supportsSession;
      global.navigator.xr.isSessionSupported = function(mode) {
        return originalSupportsSession.call(this, mode).then(() => {
          return true;
        }).catch(() => {
          return false;
        });
      };
      global.navigator.xr.supportsSession = function(mode) {
        console.warn("navigator.xr.supportsSession() is deprecated. Please " +
        "call navigator.xr.isSessionSupported() instead and check the boolean " +
        "value returned when the promise resolves.");
        return originalSupportsSession.call(this, mode);
      };
    }
  }
}

const EPSILON$1 = 0.000001;
let ARRAY_TYPE$1 = (typeof Float32Array !== 'undefined') ? Float32Array : Array;


const degree$1 = Math.PI / 180;

function create$5() {
  let out = new ARRAY_TYPE$1(16);
  if(ARRAY_TYPE$1 != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
function clone$5(a) {
  let out = new ARRAY_TYPE$1(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
function copy$5(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}


function identity$3(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}

function invert$3(out, a) {
  let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  let b00 = a00 * a11 - a01 * a10;
  let b01 = a00 * a12 - a02 * a10;
  let b02 = a00 * a13 - a03 * a10;
  let b03 = a01 * a12 - a02 * a11;
  let b04 = a01 * a13 - a03 * a11;
  let b05 = a02 * a13 - a03 * a12;
  let b06 = a20 * a31 - a21 * a30;
  let b07 = a20 * a32 - a22 * a30;
  let b08 = a20 * a33 - a23 * a30;
  let b09 = a21 * a32 - a22 * a31;
  let b10 = a21 * a33 - a23 * a31;
  let b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) {
    return null;
  }
  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}


function multiply$5(out, a, b) {
  let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  return out;
}



function rotateX$3(out, a, rad) {
  let s = Math.sin(rad);
  let c = Math.cos(rad);
  let a10 = a[4];
  let a11 = a[5];
  let a12 = a[6];
  let a13 = a[7];
  let a20 = a[8];
  let a21 = a[9];
  let a22 = a[10];
  let a23 = a[11];
  if (a !== out) {
    out[0]  = a[0];
    out[1]  = a[1];
    out[2]  = a[2];
    out[3]  = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
function rotateY$3(out, a, rad) {
  let s = Math.sin(rad);
  let c = Math.cos(rad);
  let a00 = a[0];
  let a01 = a[1];
  let a02 = a[2];
  let a03 = a[3];
  let a20 = a[8];
  let a21 = a[9];
  let a22 = a[10];
  let a23 = a[11];
  if (a !== out) {
    out[4]  = a[4];
    out[5]  = a[5];
    out[6]  = a[6];
    out[7]  = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}

function fromTranslation$2(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}

function fromRotation$2(out, rad, axis) {
  let x = axis[0], y = axis[1], z = axis[2];
  let len = Math.sqrt(x * x + y * y + z * z);
  let s, c, t;
  if (len < EPSILON$1) { return null; }
  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  out[0] = x * x * t + c;
  out[1] = y * x * t + z * s;
  out[2] = z * x * t - y * s;
  out[3] = 0;
  out[4] = x * y * t - z * s;
  out[5] = y * y * t + c;
  out[6] = z * y * t + x * s;
  out[7] = 0;
  out[8] = x * z * t + y * s;
  out[9] = y * z * t - x * s;
  out[10] = z * z * t + c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}



function fromRotationTranslation$1(out, q, v) {
  let x = q[0], y = q[1], z = q[2], w = q[3];
  let x2 = x + x;
  let y2 = y + y;
  let z2 = z + z;
  let xx = x * x2;
  let xy = x * y2;
  let xz = x * z2;
  let yy = y * y2;
  let yz = y * z2;
  let zz = z * z2;
  let wx = w * x2;
  let wy = w * y2;
  let wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}

function getTranslation$1(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}

function getRotation$1(out, mat) {
  let trace = mat[0] + mat[5] + mat[10];
  let S = 0;
  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (mat[6] - mat[9]) / S;
    out[1] = (mat[8] - mat[2]) / S;
    out[2] = (mat[1] - mat[4]) / S;
  } else if ((mat[0] > mat[5]) && (mat[0] > mat[10])) {
    S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
    out[3] = (mat[6] - mat[9]) / S;
    out[0] = 0.25 * S;
    out[1] = (mat[1] + mat[4]) / S;
    out[2] = (mat[8] + mat[2]) / S;
  } else if (mat[5] > mat[10]) {
    S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
    out[3] = (mat[8] - mat[2]) / S;
    out[0] = (mat[1] + mat[4]) / S;
    out[1] = 0.25 * S;
    out[2] = (mat[6] + mat[9]) / S;
  } else {
    S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
    out[3] = (mat[1] - mat[4]) / S;
    out[0] = (mat[8] + mat[2]) / S;
    out[1] = (mat[6] + mat[9]) / S;
    out[2] = 0.25 * S;
  }
  return out;
}




function perspective$1(out, fovy, aspect, near, far) {
  let f = 1.0 / Math.tan(fovy / 2), nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;
  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = (2 * far * near) * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }
  return out;
}











function equals$7(a, b) {
  let a0  = a[0],  a1  = a[1],  a2  = a[2],  a3  = a[3];
  let a4  = a[4],  a5  = a[5],  a6  = a[6],  a7  = a[7];
  let a8  = a[8],  a9  = a[9],  a10 = a[10], a11 = a[11];
  let a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
  let b0  = b[0],  b1  = b[1],  b2  = b[2],  b3  = b[3];
  let b4  = b[4],  b5  = b[5],  b6  = b[6],  b7  = b[7];
  let b8  = b[8],  b9  = b[9],  b10 = b[10], b11 = b[11];
  let b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
  return (Math.abs(a0 - b0) <= EPSILON$1*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
          Math.abs(a1 - b1) <= EPSILON$1*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
          Math.abs(a2 - b2) <= EPSILON$1*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
          Math.abs(a3 - b3) <= EPSILON$1*Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
          Math.abs(a4 - b4) <= EPSILON$1*Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
          Math.abs(a5 - b5) <= EPSILON$1*Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
          Math.abs(a6 - b6) <= EPSILON$1*Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
          Math.abs(a7 - b7) <= EPSILON$1*Math.max(1.0, Math.abs(a7), Math.abs(b7)) &&
          Math.abs(a8 - b8) <= EPSILON$1*Math.max(1.0, Math.abs(a8), Math.abs(b8)) &&
          Math.abs(a9 - b9) <= EPSILON$1*Math.max(1.0, Math.abs(a9), Math.abs(b9)) &&
          Math.abs(a10 - b10) <= EPSILON$1*Math.max(1.0, Math.abs(a10), Math.abs(b10)) &&
          Math.abs(a11 - b11) <= EPSILON$1*Math.max(1.0, Math.abs(a11), Math.abs(b11)) &&
          Math.abs(a12 - b12) <= EPSILON$1*Math.max(1.0, Math.abs(a12), Math.abs(b12)) &&
          Math.abs(a13 - b13) <= EPSILON$1*Math.max(1.0, Math.abs(a13), Math.abs(b13)) &&
          Math.abs(a14 - b14) <= EPSILON$1*Math.max(1.0, Math.abs(a14), Math.abs(b14)) &&
          Math.abs(a15 - b15) <= EPSILON$1*Math.max(1.0, Math.abs(a15), Math.abs(b15)));
}

function create$6() {
  let out = new ARRAY_TYPE$1(3);
  if(ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  return out;
}




function set$6(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

















function dot$3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross$1(out, a, b) {
  let ax = a[0], ay = a[1], az = a[2];
  let bx = b[0], by = b[1], bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}




function transformMat4$2(out, a, m) {
  let x = a[0], y = a[1], z = a[2];
  let w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}








function equals$8(a, b) {
  let a0 = a[0], a1 = a[1], a2 = a[2];
  let b0 = b[0], b1 = b[1], b2 = b[2];
  return (Math.abs(a0 - b0) <= EPSILON$1*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
          Math.abs(a1 - b1) <= EPSILON$1*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
          Math.abs(a2 - b2) <= EPSILON$1*Math.max(1.0, Math.abs(a2), Math.abs(b2)));
}







const forEach$2 = (function() {
  let vec = create$6();
  return function(a, stride, offset, count, fn, arg) {
    let i, l;
    if(!stride) {
      stride = 3;
    }
    if(!offset) {
      offset = 0;
    }
    if(count) {
      l = Math.min((count * stride) + offset, a.length);
    } else {
      l = a.length;
    }
    for(i = offset; i < l; i += stride) {
      vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
      fn(vec, vec, arg);
      a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
    }
    return a;
  };
})();

class XRAnchor extends EventTarget {
	constructor(transform, uid=null, timestamp = 0){
		super();
		this._uid = uid || XRAnchor._generateUID();
		this._transform = clone$5(transform);
		this._timestamp = timestamp;
		this._poseChanged = true;
		this._deleted = false;
		this._placeholder = false;
	}
	get deleted () { return this._deleted }
	set deleted (value) { this._deleted = value; }
	get placeholder () { return this._placeholder }
	set placeholder (value) { this._placeholder = value; }
	isMesh() { return false }
	get timeStamp () { return this._timestamp }
	get changed () { return this._poseChanged }
	clearChanged() {
		this._poseChanged = false;
	}
	get modelMatrix () {  return this._transform };
	updateModelMatrix (transform, timestamp) {
		this._timestamp = timestamp;
		if (!this._deleted) {
			if (!equals$7(this._transform, transform)) {
				this._poseChanged = true;
				for ( var i = 0; i < 16; i ++ ) {
					this._transform[ i ] = transform[ i ];
				}
				try {
					this.dispatchEvent( "update", { source: this });
				} catch(e) {
					console.error('XRAnchor update event error', e);
				}
			}
		}
	}
	notifyOfRemoval() {
		try {
			this.dispatchEvent( "remove", { source: this });
		} catch(e) {
			console.error('XRAnchor removed event error', e);
		}
	}
	get position(){
		return getTranslation$1(new Float32Array(3), this._poseMatrix)
	}
	get orientation(){
		return getRotation$1(new Float32Array(4), this._poseMatrix)
	}
	get uid(){ return this._uid }
	static _generateUID(){
		return 'anchor-' + new Date().getTime() + '-' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
	}
}

class XRAnchorOffset extends XRAnchor {
	constructor(anchor, offset=null){
		super(offset, null);
		this._anchor = anchor;
		this._timestamp = anchor.timeStamp;
		this._tempArray = new Float32Array(16);
		this._offsetMatrix = create$5();
		if (offset) {
			copy$5(this._offsetMatrix, offset);
		}
		multiply$5(this._transform, anchor.modelMatrix, this._offsetMatrix);
		this._handleAnchorUpdateListener = this._handleAnchorUpdate.bind(this);
		this._notifyOfRemovalListener = this.notifyOfRemoval.bind(this);
		this._handleReplaceAnchorListener = this._handleReplaceAnchor.bind(this);
		anchor.addEventListener("update", this._handleAnchorUpdateListener);
		anchor.addEventListener("removal", this._notifyOfRemovalListener);
		anchor.addEventListener("replaceAnchor", this._handleReplaceAnchorListener);
	}
	_handleReplaceAnchor(detail) {
		this._anchor.removeEventListener("update", this._handleAnchorUpdateListener);
		this._anchor.removeEventListener("removal", this._notifyOfRemovalListener);
		this._anchor.removeEventListener("replaceAnchor", this._handleReplaceAnchorListener);
		this._anchor = detail;
		this._anchor.addEventListener("update", this._handleAnchorUpdateListener);
		this._anchor.addEventListener("removal", this._notifyOfRemovalListener);
		this._anchor.addEventListener("replaceAnchor", this._handleReplaceAnchorListener);
	}
	_handleAnchorUpdate() {
		multiply$5(this._tempArray, this._anchor.modelMatrix, this._offsetMatrix);
		this.updateModelMatrix(this._tempArray, Math.max(this._anchor.timeStamp, this._timestamp));
	}
	get modelMatrix () { return this._transform }
	clearChanged() {
		super.clearChanged();
	}
	get anchor(){ return this._anchor }
	get offsetMatrix(){ return this._offsetMatrix }
	set offsetMatrix(array16){
		copy$5(this._offsetMatrix, array16);
		this._handleAnchorUpdate();
	}
}

var _useGeomArrays = false;
class XRMesh extends XRAnchor {
    static setUseGeomArrays() { _useGeomArrays = true; }
    static useGeomArrays() {return _useGeomArrays}
	constructor(transform, geometry, uid=null, timestamp=0) {
        super(transform, uid, timestamp);
        this._useGeomArrays = _useGeomArrays;
        this._vertexCountChanged = true;
        this._vertexPositionsChanged = true;
        this._triangleIndicesChanged = true;
		this._textureCoordinatesChanged = true;
        this._vertexPositions = [];
        this._triangleIndices = [];
		this._textureCoordinates = [];
        this._vertexNormalsChanged = true;
        this._vertexNormals = [];
        if (geometry) {
            this._geometry = geometry;
            this._updateGeometry(this._geometry);
        }
    }
    isMesh() { return true }
    get changed () {
        return super.changed ||
            this._vertexPositionsChanged ||
            this._vertexNormalsChanged ||
            this._triangleIndicesChanged ||
            this._vertexCountChanged
        }
	clearChanged() {
		super.clearChanged();
        this._vertexPositionsChanged = false;
        this._vertexNormalsChanged = false;
        this._triangleIndicesChanged = false;
        this._vertexCountChanged = false;
	}
    get vertexCountChanged () { return this._vertexCountChanged }
    get vertexPositionsChanged() { return this._vertexPositionsChanged }
    get triangleIndicesChanged () { this._triangleIndicesChanged; }
    get textureCoordinatesChanged () { this._textureCoordinatesChanged; }
    get vertexNormalsChanged () { this._vertexNormalsChanged; }
    get vertexPositions () { return this._vertexPositions }
    get vertexNormals () { return this._vertexNormals }
    get triangleIndices () { return this._triangleIndices}
    get textureCoordinates () { return this._textureCoordinates}
    get vertexCount () { return this._vertexPositions.length }
    get triangleCount () { return this._triangleIndices.length }
    get hasNormals () { return this._vertexNormals.length > 0 }
    get hasTextureCoordinates () { return this._textureCoordinates.length > 0}
    _updateGeometry(geometry) {
        this._geometry = geometry;
        let g = geometry;
        if (g.vertexCount == 0) {
            if (this._vertexPositions.length > 0) {
                this._vertexPositionsChanged = true;
                this._vertexNormalsChanged = true;
                this._triangleIndicesChanged = true;
                this._textureCoordinatesChanged = true;
                this._vertexPositions = [];
                this._vertexNormals = [];
                this.triangleIndices = [];
                this._textureCoordinates = [];
            }
            return
        }
        if (typeof g.vertexCount === 'undefined') {
            console.warn("bad geometry data passed to XRMesh._updateGeometry: no vertex count", g);
            return
        }
        let currentVertexIndex = 0;
        if (this._vertexPositions.length != g.vertexCount * 3) {
            if (typeof g.vertices === 'undefined') {
                console.warn("bad geometry data passed to XRMesh._updateGeometry: no vertices", g);
                return
            }
            this._vertexCountChanged = true;
            this._vertexPositionsChanged = true;
            this._vertexPositions = new Float32Array( g.vertexCount * 3 );
            if (g.textureCoordinates) {
                this._textureCoordinatesChanged = true;
                this._textureCoordinates = new Float32Array( g.vertexCount * 2 );
            }
        } else {
            if (this._useGeomArrays) {
                this._vertexPositionsChanged = (typeof g.vertices != 'undefined') && !XRMesh.arrayFuzzyEquals(this._vertexPositions, g.vertices);
                this._textureCoordinatesChanged = (typeof g.textureCoordinates != 'undefined') && !XRMesh.arrayFuzzyEquals(this._textureCoordinates, g.textureCoordinates);
            } else {
                this._vertexPositionsChanged = false;
                if (g.vertices) {
                    currentVertexIndex = 0;
                    for ( var i = 0, l = g.vertexCount; i < l; i++ ) {
                        if (Math.abs(this._vertexPositions[currentVertexIndex++] - g.vertices[i].x) > EPSILON$1 ||
                            Math.abs(this._vertexPositions[currentVertexIndex++] - g.vertices[i].y) > EPSILON$1 ||
                            Math.abs(this._vertexPositions[currentVertexIndex++] - g.vertices[i].z) > EPSILON$1)
                        {
                            this._vertexPositionsChanged = true;
                            break;
                        }
                    }
                }
                this._textureCoordinatesChanged = false;
                if (g.textureCoordinates) {
                    currentVertexIndex = 0;
                    for ( var i = 0, l = g.vertexCount; i < l; i++ ) {
                        if (Math.abs(this._textureCoordinates[currentVertexIndex++] - g.textureCoordinates[i].x) > EPSILON$1 ||
                            Math.abs(this._textureCoordinates[currentVertexIndex++] - g.textureCoordinates[i].x) > EPSILON$1)
                        {
                            this._textureCoordinatesChanged = true;
                            break;
                        }
                    }
                }
            }
        }
        if (g.triangleCount) {
            if(this._triangleIndices.length != g.triangleCount * 3) {
                this._triangleIndicesChanged = true;
                this._triangleIndices = XRMesh.arrayMax(g.triangleIndices) > 65535 ? new Uint32Array( g.triangleCount * 3) :  new Uint32Array( g.triangleCount * 3);
            } else {
                this._triangleIndicesChanged = g.triangleIndicies && !XRMesh.arrayEquals(this._triangleIndices, g.triangleIndices);
            }
        } else {
            this._triangleIndicesChanged = false;
        }
        if (this._vertexPositionsChanged) {
            if (this._useGeomArrays) {
                this._vertexPositions.set(g.vertices);
            } else {
                currentVertexIndex = 0;
                for (let vertex of g.vertices) {
                    this._vertexPositions[currentVertexIndex++] = vertex.x;
                    this._vertexPositions[currentVertexIndex++] = vertex.y;
                    this._vertexPositions[currentVertexIndex++] = vertex.z;
                }
            }
        }
        if (this._textureCoordinatesChanged) {
			currentVertexIndex = 0;
            if (this._useGeomArrays) {
                this._textureCoordinates.set(g.textureCoordinates);
            } else {
                for (let tc of g.textureCoordinates) {
                    this._textureCoordinates[currentVertexIndex++] = tc.x;
                    this._textureCoordinates[currentVertexIndex++] = tc.y;
                }
			}
        }
        if (this._triangleIndicesChanged) {
            this._triangleIndices.set(g.triangleIndices);
        }
    }
    static arrayMax( array ) {
        if ( array.length === 0 ) return - Infinity;
        var max = array[ 0 ];
        for ( var i = 1, l = array.length; i < l; ++ i ) {
            if ( array[ i ] > max ) max = array[ i ];
        }
        return max;
    }
    static arrayEquals(a, b) {
        if (!a || !b)
            return false;
        if (a.length != b.length)
            return false;
        for (var i = 0, l=a.length; i < l; i++) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }
    static arrayFuzzyEquals(a, b) {
        if (!a || !b)
            return false;
        if (a.length != b.length)
            return false;
        for (var i = 0, l=a.length; i < l; i++) {
            if (Math.abs(a[i] - b[i]) > EPSILON$1) {
                return false;
            }
        }
        return true;
    }
}

class XRFaceMesh extends XRMesh {
    constructor(transform, geometry, blendShapeArray, uid=null, timestamp=0) {
        super(transform, geometry, uid, timestamp);
        this._blendShapes = {};
        this._blendShapesChanged = true;
        this._updateBlendShapes(blendShapeArray);
    }
    get changed () { return super.changed || this._blendShapesChanged }
	clearChanged() {
		super.clearChanged();
		this._blendShapesChanged = false;
	}
    _updateBlendShapes(blendShapeArray) {
        for (let i = 0; i < blendShapeNames.length; i++) {
            let j = blendShapeNames[i];
            var a0 = this._blendShapes[j];
            if (a0 === undefined) a0 = 0;
            var b0 = blendShapeArray[i];
            if (Math.abs(a0 - b0) > EPSILON$1) {
                this._blendShapesChanged = true;
                this._blendShapes[j] = b0;
            }
        }
    }
	updateFaceData(transform, geometry, blendShapeArray, timestamp) {
        super.updateModelMatrix(transform, timestamp);
        if (typeof geometry.vertexCount === 'undefined') {
            geometry.vertexCount = geometry.vertices.length / (XRMesh.useGeomArrays() ? 3 : 1);
        }
        this._updateGeometry(geometry);
        this._updateBlendShapes(blendShapeArray);
	}
    get blendShapes() { return this._blendShapes }
}
const blendShapeNames = [
    "browDownLeft",
    "browDownRight",
    "browInnerUp",
    "browOuterUpLeft",
    "browOuterUpRight",
    "cheekPuff",
    "cheekSquintLeft",
    "cheekSquintRight",
    "eyeBlinkLeft",
    "eyeBlinkRight",
    "eyeLookDownLeft",
    "eyeLookDownRight",
    "eyeLookInLeft",
    "eyeLookInRight",
    "eyeLookOutLeft",
    "eyeLookOutRight",
    "eyeLookUpLeft",
    "eyeLookUpRight",
    "eyeSquintLeft",
    "eyeSquintRight",
    "eyeWideLeft",
    "eyeWideRight",
    "jawForward",
    "jawLeft",
    "jawOpen",
    "jawRight",
    "mouthClose",
    "mouthDimpleLeft",
    "mouthDimpleRight",
    "mouthFrownLeft",
    "mouthFrownRight",
    "mouthFunnel",
    "mouthLeft",
    "mouthLowerDownLeft",
    "mouthLowerDownRight",
    "mouthPressLeft",
    "mouthPressRight",
    "mouthPucker",
    "mouthRight",
    "mouthRollLower",
    "mouthRollUpper",
    "mouthShrugLower",
    "mouthShrugUpper",
    "mouthSmileLeft",
    "mouthSmileRight",
    "mouthStretchLeft",
    "mouthStretchRight",
    "mouthUpperUpLeft",
    "mouthUpperUpRight",
    "noseSneerLeft",
    "noseSneerRight"
];

const PRIVATE$18 = Symbol('@@webxr-polyfill/XRHitTestResult');
class XRHitTestResult {
  constructor(frame, transform) {
    this[PRIVATE$18] = {
      frame,
      transform
    };
  }
  getPose(baseSpace) {
    const space = new XRSpace();
    space._baseMatrix = copy$5(create$5(), this[PRIVATE$18].transform.matrix);
    return this[PRIVATE$18].frame.getPose(space, baseSpace);
  }
  get _frame() {
    return this[PRIVATE$18].frame;
  }
}

function create$7() {
  let out = new ARRAY_TYPE$1(4);
  if(ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }
  return out;
}

function fromValues$7(x, y, z, w) {
  let out = new ARRAY_TYPE$1(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}

function set$7(out, x, y, z, w) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}





















function transformMat4$3(out, a, m) {
  let x = a[0], y = a[1], z = a[2], w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}











const forEach$3 = (function() {
  let vec = create$7();
  return function(a, stride, offset, count, fn, arg) {
    let i, l;
    if(!stride) {
      stride = 4;
    }
    if(!offset) {
      offset = 0;
    }
    if(count) {
      l = Math.min((count * stride) + offset, a.length);
    } else {
      l = a.length;
    }
    for(i = offset; i < l; i += stride) {
      vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
      fn(vec, vec, arg);
      a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
    }
    return a;
  };
})();

const PRIVATE$19 = Symbol('@@webxr-polyfill/XRRay');
class XRRay {
  constructor(origin, direction) {
    const _origin = {x: 0, y: 0, z: 0, w: 1};
    const _direction = {x: 0, y: 0, z: -1, w: 0};
    if (origin && origin instanceof XRRigidTransform$1) {
      const transform = origin;
      const matrix = transform.matrix;
      const originVec4 = set$7(create$7(), _origin.x, _origin.y, _origin.z, _origin.w);
      const directionVec4 = set$7(create$7(), _direction.x, _direction.y, _direction.z, _direction.w);
      transformMat4$3(originVec4, originVec4, matrix);
      transformMat4$3(directionVec4, directionVec4, matrix);
      _origin.x = originVec4[0];
      _origin.y = originVec4[1];
      _origin.z = originVec4[2];
      _origin.w = originVec4[3];
      _directionVec4.x = directionVec4[0];
      _directionVec4.y = directionVec4[1];
      _directionVec4.z = directionVec4[2];
      _directionVec4.w = directionVec4[3];
    } else {
      if (origin) {
        _origin.x = origin.x;
        _origin.y = origin.y;
        _origin.z = origin.z;
        _origin.w = origin.w;
      }
      if (direction) {
        _direction.x = direction.x;
        _direction.y = direction.y;
        _direction.z = direction.z;
        _direction.w = direction.w;
      }
    }
    const length = Math.sqrt(_direction.x * _direction.x +
      _direction.y * _direction.y + _direction.z * _direction.z) || 1;
    _direction.x = _direction.x / length;
    _direction.y = _direction.y / length;
    _direction.z = _direction.z / length;
    this[PRIVATE$19] = {
      origin: new DOMPointReadOnly(_origin.x, _origin.y, _origin.z, _origin.w),
      direction: new DOMPointReadOnly(_direction.x, _direction.y, _direction.z, _direction.w),
      matrix: null
    };
  }
  get origin() {
    return this[PRIVATE$19].origin;
  }
  get direction() {
    return this[PRIVATE$19].direction;
  }
  get matrix() {
    if (this[PRIVATE$19].matrix) {
      return this[PRIVATE$19].matrix;
    }
    const z = set$6(create$6(), 0, 0, -1);
    const origin = set$6(create$6(),
      this[PRIVATE$19].origin.x,
      this[PRIVATE$19].origin.y,
      this[PRIVATE$19].origin.z
    );
    const direction = set$6(create$6(),
      this[PRIVATE$19].direction.x,
      this[PRIVATE$19].direction.y,
      this[PRIVATE$19].direction.z
    );
    const axis = cross$1(create$6(), direction, z);
    const cosAngle = dot$3(direction, z);
    const rotation = create$5();
    if (cosAngle > -1 && cosAngle < 1) {
      fromRotation$2(rotation, Math.acos(cosAngle), axis);
    } else if (cosAngle === -1) {
      fromRotation$2(rotation, Math.acos(cosAngle), set$6(create$6(), 1, 0, 0));
    }
    const translation = fromTranslation$2(create$5(), origin);
    const matrix = multiply$5(create$5(), translation, rotation);
    this[PRIVATE$19].matrix = matrix;
    return matrix;
  }
}

const PRIVATE$20 = Symbol('@@webxr-polyfill/XRHitTestSource');
class XRHitTestSource {
  constructor(session, options) {
    if (!options.space) {
      throw new Error('XRHitTestSource requires space.');
    }
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
    this[PRIVATE$20] = {
      session,
      space: options.space,
      offsetRay: options.offsetRay || new XRRay(),
      active: true
    };
  }
  cancel() {
    this[PRIVATE$20].active = false;
  }
  get _space() {
    return this[PRIVATE$20].space;
  }
  get _session() {
    return this[PRIVATE$20].session;
  }
  get _offsetRay() {
    return this[PRIVATE$20].offsetRay;
  }
  get _active() {
    return this[PRIVATE$20].active;
  }
}

class XRTransientInputHitTestResult {
  constructor() {
    throw new Error('XRTransientInputHitTestResult is not supported yet.');
  }
  getPose(baseSpace) {
  }
}

class XRTransientInputHitTestSource {
  constructor(options) {
    throw new Error('XRTransientInputHitTestSource is not supported yet.');
  }
  cancel() {
  }
}

class XRImageAnchor extends XRAnchor {}

const PRIVATE$23 = Symbol('@@webxr-polyfill/XRLightProbe');
class XRLightProbe {
	constructor(options = {}){
		this[PRIVATE$23] = {
			indirectIrradiance: options.indirectIrradiance
		};
	}
	get indirectIrradiance() {
		return this[PRIVATE$23].indirectIrradiance;
	}
	get primaryLightDirection() {
		throw new Error('Not implemented');
	}
	get primaryLightIntensity() {
		throw new Error('Not implemented');
	}
	get sphericalHarmonicsCoefficients() {
		throw new Error('Not implemented');
	}
	get sphericalHarmonicsOrientation() {
		throw new Error('Not implemented');
	}
}

class XRPlaneMesh extends XRMesh {
	constructor(transform, center, extent, alignment, geometry, uid=null, timestamp=0) {
		super(transform, null, uid, timestamp);
		this._center = center;
		this._extent = extent;
		this._alignment = alignment;
		this._planeFeatureChanged = true;
		this._yAxis = fromValues$7(0,1,0, 0);
        this._normal = create$7();
		this._boundaryVerticesChanged = true;
		this._boundaryVertices = [];
		this._geometry = geometry;
		this._updateGeometry(this._geometry);
	}
    get changed () { return super.changed || this._planeFeatureChanged }
	clearChanged() {
		super.clearChanged();
		this._planeFeatureChanged = false;
	}
	updatePlaneData(transform, center, extent, alignment, geometry, timestamp) {
		super.updateModelMatrix(transform, timestamp);
		if (!equals$8(this._center, center) || !equals$8(this._extent, extent) ||
		 	this._alignment) {
			this._center = center;
			this._extent = extent;
			this._alignment = alignment;
			this._planeFeatureChanged = true;
		}
		this._updateGeometry(geometry);
	}
	get center() { return this._center }
	get extent() { return this._extent }
	get alignment() { return this._alignment }
	get boundaryVertices () { return this._boundaryVertices }
	get boundaryVerticesChanged () { return this._boundaryVerticesChanged }
	get boundaryVertexCount () { return this._boundaryVertices.length }
	_updateGeometry(geometry) {
		super._updateGeometry(geometry);
		let g = geometry;
		const n = transformMat4$3(this._normal, this._yAxis, this._transform);
		const nx = n[0], ny = n[1], nz = n[2];
		let currentVertexIndex = 0;
		if (this._boundaryVertices.length != g.boundaryVertexCount * 3) {
			this._boundaryVerticesChanged = true;
			this._boundaryVertices = new Float32Array( g.vertexCount * 3 );
			this._vertexNormalsChanged = true;
			this._vertexNormals = new Float32Array( g.vertexCount * 3 );
		} else {
			this._vertexNormalsChanged = (Math.abs(this._vertexNormals[0] - nx) > EPSILON$1 ||
					Math.abs(this._vertexNormals[1] - ny) > EPSILON$1 ||
					Math.abs(this._vertexNormals[2] - nz) > EPSILON$1);
			if (this._useGeomArrays) {
                this._vertexPositionsChanged = !XRMesh.arrayFuzzyEquals(this._boundaryVertices, g.boundaryVertices);
            } else {
                this._boundaryVerticesChanged = false;
                currentVertexIndex = 0;
                for ( var i = 0, l = g.vertexCount; i < l; i++ ) {
                    if (Math.abs(this._boundaryVertices[currentVertexIndex++] - g.boundaryVertices[i].x) > EPSILON$1 ||
                        Math.abs(this._boundaryVertices[currentVertexIndex++] - g.boundaryVertices[i].y) > EPSILON$1 ||
                        Math.abs(this._boundaryVertices[currentVertexIndex++] - g.boundaryVertices[i].z) > EPSILON$1)
                    {
                        this._boundaryVerticesChanged = true;
                        break
                    }
				}
			}
		}
		if (this._boundaryVerticesChanged) {
            if (this._useGeomArrays) {
                this._boundaryVertices.set(g.boundaryVertices);
            } else {
				currentVertexIndex = 0;
				for (let vertex of g.boundaryVertices) {
					this._boundaryVertices[currentVertexIndex++] = vertex.x;
					this._boundaryVertices[currentVertexIndex++] = vertex.y;
					this._boundaryVertices[currentVertexIndex++] = vertex.z;
				}
			}
		}
		if (this._vertexNormalsChanged) {
			currentVertexIndex = 0;
			for (var i = 0; i < g.vertexCount; i++) {
				this._vertexNormals[currentVertexIndex++] = nx;
				this._vertexNormals[currentVertexIndex++] = ny;
				this._vertexNormals[currentVertexIndex++] = nz;
			}
		}
	}
}

class base64 {
	static decodeLength(input)  {
		return (input.length/4) * 3;
	}
	static decodeArrayBuffer(input, buffer) {
		var bytes = (input.length/4) * 3;
		if (!buffer || buffer.byteLength != bytes) {
			buffer = new ArrayBuffer(bytes);
		}
		this.decode(input, buffer);
		return buffer;
	}
	static removePaddingChars(input){
		var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
		if(lkey == 64){
			return input.substring(0,input.length - 1);
		}
		return input;
	}
	static decode(input, arrayBuffer) {
		input = this.removePaddingChars(input);
		input = this.removePaddingChars(input);
		var bytes = parseInt((input.length / 4) * 3, 10);
		var uarray;
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		var j = 0;
		if (arrayBuffer)
			uarray = new Uint8Array(arrayBuffer);
		else
			uarray = new Uint8Array(bytes);
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		for (i=0; i<bytes; i+=3) {
			enc1 = this._keyStr.indexOf(input.charAt(j++));
			enc2 = this._keyStr.indexOf(input.charAt(j++));
			enc3 = this._keyStr.indexOf(input.charAt(j++));
			enc4 = this._keyStr.indexOf(input.charAt(j++));
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
			uarray[i] = chr1;
			if (enc3 != 64) uarray[i+1] = chr2;
			if (enc4 != 64) uarray[i+2] = chr3;
		}
		return uarray;
	}
    static encode(buffer) {
	    var base64    = '';
  		var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		var bytes      = buffer;
		if (buffer instanceof ArrayBuffer) {
			bytes = new Uint8Array(arrayBuffer);
		} else if (buffer instanceof ImageData) {
			bytes = buffer.data;
		}
		var byteLength    = buffer.length;
		var byteRemainder = byteLength % 3;
		var mainLength    = byteLength - byteRemainder;
		var a, b, c, d;
		var chunk;
		for (var i = 0; i < mainLength; i = i + 3) {
			chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
			a = (chunk & 16515072) >> 18;
			b = (chunk & 258048)   >> 12;
			c = (chunk & 4032)     >>  6;
			d = chunk & 63;
			base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
		}
		if (byteRemainder == 1) {
			chunk = bytes[mainLength];
			a = (chunk & 252) >> 2;
			b = (chunk & 3)   << 4;
			base64 += encodings[a] + encodings[b] + '==';
		} else if (byteRemainder == 2) {
			chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
			a = (chunk & 64512) >> 10;
			b = (chunk & 1008)  >>  4;
			c = (chunk & 15)    <<  2;
			base64 += encodings[a] + encodings[b] + encodings[c] + '=';
		}
		return base64
	}
}
base64._keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

var _ab = [];
class XRVideoFrame {
	constructor(buffers, pixelFormat, timestamp, camera){
		this._buffers = buffers;
        for (var i=0; i< buffers.length; i++) {
            buffers[i]._buffer = buffers[i].buffer;
            buffers[i].buffer = null;
            if (!buffers[i]._abCache && typeof buffers[i]._buffer == "string") {
                var bytes = base64.decodeLength(buffers[i]._buffer);
                for (var j=0; j < _ab.length; j++) {
                    if (_ab[j].byteLength == bytes) {
                        buffers[i]._abCache = _ab[j];
                        _ab.splice(j, 1);
                        break;
                    }
                }
            } else if (!buffers[i]._abCache && buffers[i]._buffer instanceof ImageData) {
                var data = buffers[i]._buffer.data;
                var bytes = data.length;
                for (var j=0; j < _ab.length; j++) {
                    if (_ab[j].byteLength == bytes) {
                        buffers[i]._abCache = _ab[j];
                        _ab.splice(j, 1);
                        break;
                    }
                }
                var ab = buffers[i]._abCache ? buffers[i]._abCache : new ArrayBuffer(bytes);
                buffers[i]._abCache = null;
                var buffData = new Uint8Array(ab);
                for (var k = 0; k < bytes; k++) buffData[k] = data[k];
                buffers[i]._buffer = ab;
            }
        }
		this._pixelFormat = pixelFormat;
		this._timestamp = timestamp;
		this._camera = camera;
	}
    static createFromMessage (event) {
        return new this(event.data.buffers, event.data.pixelFormat, event.data.timestamp, event.data.camera)
    }
    numBuffers() {this._buffers.length;}
    buffer(index) {
        if (index >= 0 && index < this._buffers.length) {
            var buff = this._buffers[index];
            if (!buff.buffer) {
                if (typeof buff._buffer == "string") {
                    buff._buffer = base64.decodeArrayBuffer(buff._buffer, buff._abCache);
                    buff._abCache = null;
                    buff.buffer = new Uint8Array(buff._buffer);
                } else if (buff._buffer instanceof ArrayBuffer) {
                    buff.buffer = new Uint8Array(buff._buffer);
                } else if (buff._buffer instanceof ImageData) {
                    buff.buffer = ImageData.data;
                }
            }
            return buff;
        }
        return null
    }
	get pixelFormat(){ return this._pixelFormat }
	get timestamp(){ return this._timestamp }
	get camera(){ return this._camera }
    release () {
        var buffers = this._buffers;
        for (var i=0; i< buffers.length; i++) {
            if (buffers[i]._buffer instanceof ArrayBuffer && buffers[i]._buffer.byteLength > 0) {
                _ab.push(buffers[i]._buffer);
            }
            if (buffers[i]._abCache instanceof ArrayBuffer && buffers[i]._abCache.byteLength > 0) {
                _ab.push(buffers[i]._abCache);
            }
        }
    }
    postMessageToWorker (worker, options) {
        var msg = Object.assign({}, options || {});
        msg.buffers = this._buffers;
        msg.timestamp = this._timestamp;
        msg.pixelFormat = this._pixelFormat;
        msg.camera = this._camera;
        var buffs = [];
        for (var i = 0; i < msg.buffers.length; i++) {
            msg.buffers[i].buffer = msg.buffers[i]._buffer;
            if (msg.buffers[i]._buffer instanceof ArrayBuffer || msg.buffers[i]._buffer instanceof ImageData) {
                buffs.push(msg.buffers[i]._buffer);
            }
            msg.buffers[i]._buffer = null;
            if (msg.buffers[i]._abCache instanceof ArrayBuffer) {
                buffs.push(msg.buffers[i]._abCache);
            }
        }
        worker.postMessage(msg, buffs);
    }
    postReplyMessage (options) {
        var msg = Object.assign({}, options);
        msg.buffers = this._buffers;
        msg.timestamp = this._timestamp;
        msg.pixelFormat = this._pixelFormat;
        msg.camera = this._camera;
        var buffs = [];
        for (var i = 0; i < msg.buffers.length; i++) {
            msg.buffers[i].buffer = null;
            if (msg.buffers[i]._buffer instanceof ArrayBuffer || msg.buffers[i]._buffer instanceof ImageData) {
                buffs.push(msg.buffers[i]._buffer);
                msg.buffers[i].buffer = msg.buffers[i]._buffer;
            }
            msg.buffers[i]._buffer = null;
            if (msg.buffers[i]._abCache instanceof ArrayBuffer) {
                buffs.push(msg.buffers[i]._abCache);
            }
         }
        postMessage(msg, buffs);
    }
}
XRVideoFrame.IMAGEFORMAT_RGBA32 = "RGBA32";
XRVideoFrame.IMAGEFORMAT_BGRA32 = "BGRA32";
XRVideoFrame.IMAGEFORMAT_RGB24 = "RGB24";
XRVideoFrame.IMAGEFORMAT_BGR24 = "BGR24";
XRVideoFrame.IMAGEFORMAT_GRAY8 = "GRAY8";
XRVideoFrame.IMAGEFORMAT_YUV444P = "YUV444P";
XRVideoFrame.IMAGEFORMAT_YUV422P = "YUV422P";
XRVideoFrame.IMAGEFORMAT_YUV420P = "YUV420P";
XRVideoFrame.IMAGEFORMAT_YUV420SP_NV12 = "YUV420SP_NV12";
XRVideoFrame.IMAGEFORMAT_YUV420SP_NV21 = "YUV420SP_NV21";
XRVideoFrame.IMAGEFORMAT_HSV = "HSV";
XRVideoFrame.IMAGEFORMAT_Lab = "Lab";
XRVideoFrame.IMAGEFORMAT_DEPTH = "DEPTH";
XRVideoFrame.IMAGEFORMAT_NULL = "";
XRVideoFrame.IMAGEFORMAT = [
    XRVideoFrame.IMAGEFORMAT_RGBA32,
    XRVideoFrame.IMAGEFORMAT_BGRA32,
    XRVideoFrame.IMAGEFORMAT_RGB24,
    XRVideoFrame.IMAGEFORMAT_BGR24,
    XRVideoFrame.IMAGEFORMAT_GRAY8,
    XRVideoFrame.IMAGEFORMAT_YUV444P,
    XRVideoFrame.IMAGEFORMAT_YUV422P,
    XRVideoFrame.IMAGEFORMAT_YUV420P,
    XRVideoFrame.IMAGEFORMAT_YUV420SP_NV12,
    XRVideoFrame.IMAGEFORMAT_YUV420SP_NV21,
    XRVideoFrame.IMAGEFORMAT_HSV,
    XRVideoFrame.IMAGEFORMAT_Lab,
    XRVideoFrame.IMAGEFORMAT_DEPTH,
    XRVideoFrame.IMAGEFORMAT_NULL
];

var API$1 = {
    XRAnchor,
    XRAnchorOffset,
    XRFaceMesh,
    XRHitTestResult,
    XRHitTestSource,
    XRTransientInputHitTestResult,
    XRTransientInputHitTestSource,
    XRImageAnchor,
    XRLightProbe,
    XRMesh,
    XRPlaneMesh,
    XRRay,
    XRVideoFrame
};

class XRDevice extends EventTarget {
  constructor(global) {
    super();
    this.global = global;
    this.onWindowResize = this.onWindowResize.bind(this);
    this.global.window.addEventListener('resize', this.onWindowResize);
    this.environmentBlendMode = 'opaque';
  }
  onBaseLayerSet(sessionId, layer) { throw new Error('Not implemented'); }
  isSessionSupported(mode) { throw new Error('Not implemented'); }
  isFeatureSupported(featureDescriptor) { throw new Error('Not implemented'); }
  async requestSession(mode, enabledFeatures) { throw new Error('Not implemented'); }
  requestAnimationFrame(callback) { throw new Error('Not implemented'); }
  onFrameStart(sessionId) { throw new Error('Not implemented'); }
  onFrameEnd(sessionId) { throw new Error('Not implemented'); }
  doesSessionSupportReferenceSpace(sessionId, type) { throw new Error('Not implemented'); }
  requestStageBounds() { throw new Error('Not implemented'); }
  async requestFrameOfReferenceTransform(type, options) {
    return undefined;
  }
  cancelAnimationFrame(handle) { throw new Error('Not implemented'); }
  endSession(sessionId) { throw new Error('Not implemented'); }
  getViewport(sessionId, eye, layer, target) { throw new Error('Not implemented'); }
  getProjectionMatrix(eye) { throw new Error('Not implemented'); }
  getBasePoseMatrix() { throw new Error('Not implemented'); }
  getBaseViewMatrix(eye) { throw new Error('Not implemented'); }
  getInputSources() { throw new Error('Not implemented'); }
  getInputPose(inputSource, coordinateSystem, poseType) { throw new Error('Not implemented'); }
  onWindowResize() {
    this.onWindowResize();
  }
}

let daydream = {
  mapping: '',
  profiles: ['google-daydream', 'generic-trigger-touchpad'],
  buttons: {
    length: 3,
    0: null,
    1: null,
    2: 0
  },
};
let viveFocus = {
  mapping: 'xr-standard',
  profiles: ['htc-vive-focus', 'generic-trigger-touchpad'],
  buttons: {
    length: 3,
    0: 1,
    1: null,
    2: 0
  },
};
let oculusGo = {
  mapping: 'xr-standard',
  profiles: ['oculus-go', 'generic-trigger-touchpad'],
  buttons: {
    length: 3,
    0: 1,
    1: null,
    2: 0
  },
  gripTransform: {
    orientation: [Math.PI * 0.11, 0, 0, 1]
  }
};
let oculusTouch = {
  mapping: 'xr-standard',
  displayProfiles: {
    'Oculus Quest': ['oculus-touch-v2', 'oculus-touch', 'generic-trigger-squeeze-thumbstick']
  },
  profiles: ['oculus-touch', 'generic-trigger-squeeze-thumbstick'],
  axes: {
    length: 4,
    0: null,
    1: null,
    2: 0,
    3: 1
  },
  buttons: {
    length: 7,
    0: 1,
    1: 2,
    2: null,
    3: 0,
    4: 3,
    5: 4,
    6: null
  },
  gripTransform: {
    position: [0, -0.02, 0.04, 1],
    orientation: [Math.PI * 0.11, 0, 0, 1]
  }
};
let openVr = {
  mapping: 'xr-standard',
  profiles: ['htc-vive', 'generic-trigger-squeeze-touchpad'],
  displayProfiles: {
    'HTC Vive': ['htc-vive', 'generic-trigger-squeeze-touchpad'],
    'HTC Vive DVT': ['htc-vive', 'generic-trigger-squeeze-touchpad'],
    'Valve Index': ['valve-index', 'generic-trigger-squeeze-touchpad-thumbstick']
  },
  buttons: {
    length: 3,
    0: 1,
    1: 2,
    2: 0
  },
  gripTransform: {
    position: [0, 0, 0.05, 1],
  },
  targetRayTransform: {
    orientation: [Math.PI * -0.08, 0, 0, 1]
  },
  userAgentOverrides: {
    "Firefox": {
      axes: {
        invert: [1, 3]
      }
    }
  }
};
let samsungGearVR = {
  mapping: 'xr-standard',
  profiles: ['samsung-gearvr', 'generic-trigger-touchpad'],
  buttons: {
    length: 3,
    0: 1,
    1: null,
    2: 0
  },
  gripTransform: {
    orientation: [Math.PI * 0.11, 0, 0, 1]
  }
};
let samsungOdyssey = {
  mapping: 'xr-standard',
  profiles: ['samsung-odyssey', 'microsoft-mixed-reality', 'generic-trigger-squeeze-touchpad-thumbstick'],
  buttons: {
    length: 4,
    0: 1,
    1: 0,
    2: 2,
    3: 4,
  },
  gripTransform: {
    position: [0, -0.02, 0.04, 1],
    orientation: [Math.PI * 0.11, 0, 0, 1]
  }
};
let windowsMixedReality = {
  mapping: 'xr-standard',
  profiles: ['microsoft-mixed-reality', 'generic-trigger-squeeze-touchpad-thumbstick'],
  buttons: {
    length: 4,
    0: 1,
    1: 0,
    2: 2,
    3: 4,
  },
  gripTransform: {
    position: [0, -0.02, 0.04, 1],
    orientation: [Math.PI * 0.11, 0, 0, 1]
  }
};
let GamepadMappings = {
  'Daydream Controller': daydream,
  'Gear VR Controller': samsungGearVR,
  'HTC Vive Focus Controller': viveFocus,
  'Oculus Go Controller': oculusGo,
  'Oculus Touch (Right)': oculusTouch,
  'Oculus Touch (Left)': oculusTouch,
  'OpenVR Gamepad': openVr,
  'Spatial Controller (Spatial Interaction Source) 045E-065A': windowsMixedReality,
  'Spatial Controller (Spatial Interaction Source) 045E-065D': samsungOdyssey,
  'Windows Mixed Reality (Right)': windowsMixedReality,
  'Windows Mixed Reality (Left)': windowsMixedReality,
};

const HEAD_ELBOW_OFFSET_RIGHTHANDED = fromValues$1(0.155, -0.465, -0.15);
const HEAD_ELBOW_OFFSET_LEFTHANDED = fromValues$1(-0.155, -0.465, -0.15);
const ELBOW_WRIST_OFFSET = fromValues$1(0, 0, -0.25);
const WRIST_CONTROLLER_OFFSET = fromValues$1(0, 0, 0.05);
const ARM_EXTENSION_OFFSET = fromValues$1(-0.08, 0.14, 0.08);
const ELBOW_BEND_RATIO = 0.4;
const EXTENSION_RATIO_WEIGHT = 0.4;
const MIN_ANGULAR_SPEED = 0.61;
const MIN_ANGLE_DELTA = 0.175;
const MIN_EXTENSION_COS = 0.12;
const MAX_EXTENSION_COS = 0.87;
const RAD_TO_DEG = 180 / Math.PI;
function eulerFromQuaternion(out, q, order) {
  function clamp(value, min$$1, max$$1) {
    return (value < min$$1 ? min$$1 : (value > max$$1 ? max$$1 : value));
  }
  var sqx = q[0] * q[0];
  var sqy = q[1] * q[1];
  var sqz = q[2] * q[2];
  var sqw = q[3] * q[3];
  if ( order === 'XYZ' ) {
    out[0] = Math.atan2( 2 * ( q[0] * q[3] - q[1] * q[2] ), ( sqw - sqx - sqy + sqz ) );
    out[1] = Math.asin(  clamp( 2 * ( q[0] * q[2] + q[1] * q[3] ), -1, 1 ) );
    out[2] = Math.atan2( 2 * ( q[2] * q[3] - q[0] * q[1] ), ( sqw + sqx - sqy - sqz ) );
  } else if ( order ===  'YXZ' ) {
    out[0] = Math.asin(  clamp( 2 * ( q[0] * q[3] - q[1] * q[2] ), -1, 1 ) );
    out[1] = Math.atan2( 2 * ( q[0] * q[2] + q[1] * q[3] ), ( sqw - sqx - sqy + sqz ) );
    out[2] = Math.atan2( 2 * ( q[0] * q[1] + q[2] * q[3] ), ( sqw - sqx + sqy - sqz ) );
  } else if ( order === 'ZXY' ) {
    out[0] = Math.asin(  clamp( 2 * ( q[0] * q[3] + q[1] * q[2] ), -1, 1 ) );
    out[1] = Math.atan2( 2 * ( q[1] * q[3] - q[2] * q[0] ), ( sqw - sqx - sqy + sqz ) );
    out[2] = Math.atan2( 2 * ( q[2] * q[3] - q[0] * q[1] ), ( sqw - sqx + sqy - sqz ) );
  } else if ( order === 'ZYX' ) {
    out[0] = Math.atan2( 2 * ( q[0] * q[3] + q[2] * q[1] ), ( sqw - sqx - sqy + sqz ) );
    out[1] = Math.asin(  clamp( 2 * ( q[1] * q[3] - q[0] * q[2] ), -1, 1 ) );
    out[2] = Math.atan2( 2 * ( q[0] * q[1] + q[2] * q[3] ), ( sqw + sqx - sqy - sqz ) );
  } else if ( order === 'YZX' ) {
    out[0] = Math.atan2( 2 * ( q[0] * q[3] - q[2] * q[1] ), ( sqw - sqx + sqy - sqz ) );
    out[1] = Math.atan2( 2 * ( q[1] * q[3] - q[0] * q[2] ), ( sqw + sqx - sqy - sqz ) );
    out[2] = Math.asin(  clamp( 2 * ( q[0] * q[1] + q[2] * q[3] ), -1, 1 ) );
  } else if ( order === 'XZY' ) {
    out[0] = Math.atan2( 2 * ( q[0] * q[3] + q[1] * q[2] ), ( sqw - sqx + sqy - sqz ) );
    out[1] = Math.atan2( 2 * ( q[0] * q[2] + q[1] * q[3] ), ( sqw + sqx - sqy - sqz ) );
    out[2] = Math.asin(  clamp( 2 * ( q[2] * q[3] - q[0] * q[1] ), -1, 1 ) );
  } else {
    console.log('No order given for quaternion to euler conversion.');
    return;
  }
}
class OrientationArmModel {
  constructor() {
    this.hand = 'right';
    this.headElbowOffset = HEAD_ELBOW_OFFSET_RIGHTHANDED;
    this.controllerQ = create$4();
    this.lastControllerQ = create$4();
    this.headQ = create$4();
    this.headPos = create$1();
    this.elbowPos = create$1();
    this.wristPos = create$1();
    this.time = null;
    this.lastTime = null;
    this.rootQ = create$4();
    this.position = create$1();
  }
  setHandedness(hand) {
    if (this.hand != hand) {
      this.hand = hand;
      if (this.hand == 'left') {
        this.headElbowOffset = HEAD_ELBOW_OFFSET_LEFTHANDED;
      } else {
        this.headElbowOffset = HEAD_ELBOW_OFFSET_RIGHTHANDED;
      }
    }
  }
  update(controllerOrientation, headPoseMatrix) {
    this.time = now$1();
    if (controllerOrientation) {
      copy$4(this.lastControllerQ, this.controllerQ);
      copy$4(this.controllerQ, controllerOrientation);
    }
    if (headPoseMatrix) {
      getTranslation(this.headPos, headPoseMatrix);
      getRotation(this.headQ, headPoseMatrix);
    }
    let headYawQ = this.getHeadYawOrientation_();
    let angleDelta = this.quatAngle_(this.lastControllerQ, this.controllerQ);
    let timeDelta = (this.time - this.lastTime) / 1000;
    let controllerAngularSpeed = angleDelta / timeDelta;
    if (controllerAngularSpeed > MIN_ANGULAR_SPEED) {
      slerp(this.rootQ, this.rootQ, headYawQ,
                 Math.min(angleDelta / MIN_ANGLE_DELTA, 1.0));
    } else {
      copy$4(this.rootQ, headYawQ);
    }
    let controllerForward = fromValues$1(0, 0, -1.0);
    transformQuat(controllerForward, controllerForward, this.controllerQ);
    let controllerDotY = dot(controllerForward, [0, 1, 0]);
    let extensionRatio = this.clamp_(
        (controllerDotY - MIN_EXTENSION_COS) / MAX_EXTENSION_COS, 0.0, 1.0);
    let controllerCameraQ = clone$4(this.rootQ);
    invert$2(controllerCameraQ, controllerCameraQ);
    multiply$4(controllerCameraQ, controllerCameraQ, this.controllerQ);
    let elbowPos = this.elbowPos;
    copy$1(elbowPos, this.headPos);
    add$1(elbowPos, elbowPos, this.headElbowOffset);
    let elbowOffset = clone$1(ARM_EXTENSION_OFFSET);
    scale$1(elbowOffset, elbowOffset, extensionRatio);
    add$1(elbowPos, elbowPos, elbowOffset);
    let totalAngle = this.quatAngle_(controllerCameraQ, create$4());
    let totalAngleDeg = totalAngle * RAD_TO_DEG;
    let lerpSuppression = 1 - Math.pow(totalAngleDeg / 180, 4);let elbowRatio = ELBOW_BEND_RATIO;
    let wristRatio = 1 - ELBOW_BEND_RATIO;
    let lerpValue = lerpSuppression *
        (elbowRatio + wristRatio * extensionRatio * EXTENSION_RATIO_WEIGHT);
    let wristQ = create$4();
    slerp(wristQ, wristQ, controllerCameraQ, lerpValue);
    let invWristQ = invert$2(create$4(), wristQ);
    let elbowQ = clone$4(controllerCameraQ);
    multiply$4(elbowQ, elbowQ, invWristQ);
    let wristPos = this.wristPos;
    copy$1(wristPos, WRIST_CONTROLLER_OFFSET);
    transformQuat(wristPos, wristPos, wristQ);
    add$1(wristPos, wristPos, ELBOW_WRIST_OFFSET);
    transformQuat(wristPos, wristPos, elbowQ);
    add$1(wristPos, wristPos, elbowPos);
    let offset = clone$1(ARM_EXTENSION_OFFSET);
    scale$1(offset, offset, extensionRatio);
    add$1(this.position, this.wristPos, offset);
    transformQuat(this.position, this.position, this.rootQ);
    this.lastTime = this.time;
  }
  getPosition() {
    return this.position;
  }
  getHeadYawOrientation_() {
    let headEuler = create$1();
    eulerFromQuaternion(headEuler, this.headQ, 'YXZ');
    let destinationQ = fromEuler(create$4(), 0, headEuler[1] * RAD_TO_DEG, 0);
    return destinationQ;
  }
  clamp_(value, min$$1, max$$1) {
    return Math.min(Math.max(value, min$$1), max$$1);
  }
  quatAngle_(q1, q2) {
    let vec1 = [0, 0, -1];
    let vec2 = [0, 0, -1];
    transformQuat(vec1, vec1, q1);
    transformQuat(vec2, vec2, q2);
    return angle(vec1, vec2);
  }
}

const PRIVATE$24 = Symbol('@@webxr-polyfill/XRRemappedGamepad');
const PLACEHOLDER_BUTTON = { pressed: false, touched: false, value: 0.0 };
Object.freeze(PLACEHOLDER_BUTTON);
class XRRemappedGamepad {
  constructor(gamepad, display, map) {
    if (!map) {
      map = {};
    }
    if (map.userAgentOverrides) {
      for (let agent in map.userAgentOverrides) {
        if (navigator.userAgent.includes(agent)) {
          let override = map.userAgentOverrides[agent];
          for (let key in override) {
            if (key in map) {
              Object.assign(map[key], override[key]);
            } else {
              map[key] = override[key];
            }
          }
          break;
        }
      }
    }
    let axes = new Array(map.axes && map.axes.length ? map.axes.length : gamepad.axes.length);
    let buttons = new Array(map.buttons && map.buttons.length ? map.buttons.length : gamepad.buttons.length);
    let gripTransform = null;
    if (map.gripTransform) {
      let orientation = map.gripTransform.orientation || [0, 0, 0, 1];
      gripTransform = create();
      fromRotationTranslation(
        gripTransform,
        normalize$2(orientation, orientation),
        map.gripTransform.position || [0, 0, 0]
      );
    }
    let targetRayTransform = null;
    if (map.targetRayTransform) {
      let orientation =  map.targetRayTransform.orientation || [0, 0, 0, 1];
      targetRayTransform = create();
      fromRotationTranslation(
        targetRayTransform,
        normalize$2(orientation, orientation),
        map.targetRayTransform.position || [0, 0, 0]
      );
    }
    let profiles = map.profiles;
    if (map.displayProfiles) {
      if (display.displayName in map.displayProfiles) {
        profiles = map.displayProfiles[display.displayName];
      }
    }
    this[PRIVATE$24] = {
      gamepad,
      map,
      profiles: profiles || [gamepad.id],
      mapping: map.mapping || gamepad.mapping,
      axes,
      buttons,
      gripTransform,
      targetRayTransform,
    };
    this._update();
  }
  _update() {
    let gamepad = this[PRIVATE$24].gamepad;
    let map = this[PRIVATE$24].map;
    let axes = this[PRIVATE$24].axes;
    for (let i = 0; i < axes.length; ++i) {
      if (map.axes && i in map.axes) {
        if (map.axes[i] === null) {
          axes[i] = 0;
        } else {
          axes[i] = gamepad.axes[map.axes[i]];
        }
      } else {
        axes[i] = gamepad.axes[i];
      }
    }
    if (map.axes && map.axes.invert) {
      for (let axis of map.axes.invert) {
        if (axis < axes.length) {
          axes[axis] *= -1;
        }
      }
    }
    let buttons = this[PRIVATE$24].buttons;
    for (let i = 0; i < buttons.length; ++i) {
      if (map.buttons && i in map.buttons) {
        if (map.buttons[i] === null) {
          buttons[i] = PLACEHOLDER_BUTTON;
        } else {
          buttons[i] = gamepad.buttons[map.buttons[i]];
        }
      } else {
        buttons[i] = gamepad.buttons[i];
      }
    }
  }
  get id() {
    return '';
  }
  get _profiles() {
    return this[PRIVATE$24].profiles;
  }
  get index() {
    return -1;
  }
  get connected() {
    return this[PRIVATE$24].gamepad.connected;
  }
  get timestamp() {
    return this[PRIVATE$24].gamepad.timestamp;
  }
  get mapping() {
    return this[PRIVATE$24].mapping;
  }
  get axes() {
    return this[PRIVATE$24].axes;
  }
  get buttons() {
    return this[PRIVATE$24].buttons;
  }
  get hapticActuators() {
    return this[PRIVATE$24].gamepad.hapticActuators;
  }
}
class GamepadXRInputSource {
  constructor(polyfill, display, primaryButtonIndex = 0, primarySqueezeButtonIndex = -1) {
    this.polyfill = polyfill;
    this.display = display;
    this.nativeGamepad = null;
    this.gamepad = null;
    this.inputSource = new XRInputSource(this);
    this.lastPosition = create$1();
    this.emulatedPosition = false;
    this.basePoseMatrix = create();
    this.outputMatrix = create();
    this.primaryButtonIndex = primaryButtonIndex;
    this.primaryActionPressed = false;
    this.primarySqueezeButtonIndex = primarySqueezeButtonIndex;
    this.primarySqueezeActionPressed = false;
    this.handedness = '';
    this.targetRayMode = 'gaze';
    this.armModel = null;
  }
  get profiles() {
    return this.gamepad ? this.gamepad._profiles : [];
  }
  updateFromGamepad(gamepad) {
    if (this.nativeGamepad !== gamepad) {
      this.nativeGamepad = gamepad;
      if (gamepad) {
        this.gamepad = new XRRemappedGamepad(gamepad, this.display, GamepadMappings[gamepad.id]);
      } else {
        this.gamepad = null;
      }
    }
    this.handedness = gamepad.hand === '' ? 'none' : gamepad.hand;
    if (this.gamepad) {
      this.gamepad._update();
    }
    if (gamepad.pose) {
      this.targetRayMode = 'tracked-pointer';
      this.emulatedPosition = !gamepad.pose.hasPosition;
    } else if (gamepad.hand === '') {
      this.targetRayMode = 'gaze';
      this.emulatedPosition = false;
    }
  }
  updateBasePoseMatrix() {
    if (this.nativeGamepad && this.nativeGamepad.pose) {
      let pose = this.nativeGamepad.pose;
      let position = pose.position;
      let orientation = pose.orientation;
      if (!position && !orientation) {
        return;
      }
      if (!position) {
        if (!pose.hasPosition) {
          if (!this.armModel) {
            this.armModel = new OrientationArmModel();
          }
          this.armModel.setHandedness(this.nativeGamepad.hand);
          this.armModel.update(orientation, this.polyfill.getBasePoseMatrix());
          position = this.armModel.getPosition();
        } else {
          position = this.lastPosition;
        }
      } else {
        this.lastPosition[0] = position[0];
        this.lastPosition[1] = position[1];
        this.lastPosition[2] = position[2];
      }
      fromRotationTranslation(this.basePoseMatrix, orientation, position);
    } else {
      copy(this.basePoseMatrix, this.polyfill.getBasePoseMatrix());
    }
    return this.basePoseMatrix;
  }
  getXRPose(coordinateSystem, poseType) {
    this.updateBasePoseMatrix();
    switch(poseType) {
      case "target-ray":
        coordinateSystem._transformBasePoseMatrix(this.outputMatrix, this.basePoseMatrix);
        if (this.gamepad && this.gamepad[PRIVATE$24].targetRayTransform) {
          multiply(this.outputMatrix, this.outputMatrix, this.gamepad[PRIVATE$24].targetRayTransform);
        }
        break;
      case "grip":
        if (!this.nativeGamepad || !this.nativeGamepad.pose) {
          return null;
        }
        coordinateSystem._transformBasePoseMatrix(this.outputMatrix, this.basePoseMatrix);
        if (this.gamepad && this.gamepad[PRIVATE$24].gripTransform) {
          multiply(this.outputMatrix, this.outputMatrix, this.gamepad[PRIVATE$24].gripTransform);
        }
        break;
      default:
        return null;
    }
    coordinateSystem._adjustForOriginOffset(this.outputMatrix);
    return new XRPose(new XRRigidTransform(this.outputMatrix), this.emulatedPosition);
  }
}

let throttle = function(func, wait, leading=true, trailing=true) {
	var timeout, context, args, result;
	var previous = 0;
	var later = function() {
		previous = leading === false ? 0 : Date.now();
		timeout = null;
		result = func.apply(context, args);
		if (!timeout) context = args = null;
	};
	var throttled = function() {
		var now = Date.now();
		if (!previous && leading === false) previous = now;
		var remaining = wait - (now - previous);
		context = this;
		args = arguments;
		if (remaining <= 0 || remaining > wait) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
		previous = now;
		result = func.apply(context, args);
		if (!timeout) context = args = null;
		} else if (!timeout && trailing !== false) {
		timeout = setTimeout(later, remaining);
		}
		return result
	};
	throttled.cancel = function() {
		clearTimeout(timeout);
		previous = 0;
		timeout = context = args = null;
	};
	return throttled
};
let throttledConsoleLog = throttle(function(...params){
	console.log(...params);
}, 1000);

class ARKitWrapper extends EventTarget {
	constructor() {
		super();
		if (ARKitWrapper.HasARKit() === false) {
			throw new Error('ARKitWrapper will only work in Mozilla\'s ARDemo test app');
		}
		if (typeof ARKitWrapper.GLOBAL_INSTANCE !== 'undefined') {
			throw new Error('ARKitWrapper is a singleton. Use ARKitWrapper.GetOrCreate() to get the global instance.');
		}
		this._timestamp = 0;
		this._lightProbe = null;
		this._deviceId = null;
		this._isWatching = false;
		this._waitingForSessionStart = false;
		this._isInitialized = false;
		this._rawARData = null;
		this._rAF_callbacks = [];
		this._rAF_currentCallbacks = [];
		this._frameHandle = 1;
		this._requestedPermissions = {
			cameraAccess: false,
			worldAccess: false
		};
		this._currentPermissions = {
			cameraAccess:  false,
			worldAccess: false
		};
		this._worldSensingState = {
			meshDetectionState: false
		};
		this._worldInformation = null;
		this._projectionMatrix = new Float32Array(16);
		this._viewMatrix = new Float32Array(16);
		this._cameraTransform = new Float32Array(16);
		this._anchors = new Map();
		this._timeOffsets = [];
		this._timeOffset = 0;
		this._timeOffsetComputed = false;
		this._dataBeforeNext = 0;
		this._worldMappingStatus = ARKitWrapper.WEB_AR_WORLDMAPPING_NOT_AVAILABLE;
		this._defaultOptions = {
			location: true,
			camera: true,
			objects: true,
			light_intensity: true,
			computer_vision_data: false
		};
		const eventCallbacks = {
			arkitStartRecording: ARKitWrapper.RECORD_START_EVENT,
			arkitStopRecording: ARKitWrapper.RECORD_STOP_EVENT,
			arkitDidMoveBackground: ARKitWrapper.DID_MOVE_BACKGROUND_EVENT,
			arkitWillEnterForeground: ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT,
			arkitInterrupted: ARKitWrapper.INTERRUPTED_EVENT,
			arkitInterruptionEnded: ARKitWrapper.INTERRUPTION_ENDED_EVENT,
			arkitShowDebug: ARKitWrapper.SHOW_DEBUG_EVENT,
			arkitWindowResize: ARKitWrapper.WINDOW_RESIZE_EVENT,
			onError: ARKitWrapper.ON_ERROR,
			arTrackingChanged: ARKitWrapper.AR_TRACKING_CHANGED,
		};
		for (const key in eventCallbacks) {
			window[key] = (detail) => {
				detail = detail || null;
				try {
					this.dispatchEvent(
						eventCallbacks[key],
						new CustomEvent(
							eventCallbacks[key],
							{
								source: this,
								detail: detail
							}
						)
					);
				} catch(e) {
					console.error(key + ' callback error', e);
				}
			};
		}
		window['onComputerVisionData'] = (detail) => {
			this._onComputerVisionData(detail);
		};
		window['setNativeTime'] = (detail) => {
			this._timeOffsets.push((performance || Date).now() - detail.nativeTime);
			this._timeOffsetComputed = true;
			this._timeOffset = 0;
			for (let i = 0; i < this._timeOffsets.length; i++) {
				this._timeOffset += this._timeOffsets[i];
			}
			this._timeOffset = this._timeOffset / this._timeOffsets.length;
		};
		window['userGrantedComputerVisionData'] = (detail) => {
			this._sessionCameraAccess |= detail.granted;
		};
		window['userGrantedWorldSensingData'] = (detail) => {
			this._sessionWorldAccess |= detail.granted;
		};
		window['userStoppedAR'] = (detail) => {
			this._handleStopped();
			try {
				this.dispatchEvent(
					ARKitWrapper.USER_STOPPED_AR,
					new CustomEvent(ARKitWrapper.USER_STOPPED_AR, { })
				);
			} catch(e) {
				console.error('USER_STOPPED_AR event error', e);
			}
		};
	}
	static GetOrCreate(options=null) {
		if (typeof ARKitWrapper.GLOBAL_INSTANCE === 'undefined') {
			const instance = new ARKitWrapper();
			ARKitWrapper.GLOBAL_INSTANCE = instance;
			options = (options && typeof(options) === 'object') ? options : {};
			const defaultUIOptions = {
				browser: true,
				points: true,
				focus: false,
				rec: true,
				rec_time: true,
				mic: false,
				build: false,
				plane: true,
				warnings: true,
				anchors: false,
				debug: true,
				statistics: false
			};
			const uiOptions = (typeof(options.ui) === 'object') ? options.ui : {};
			options.ui = Object.assign(defaultUIOptions, uiOptions);
			options.geometry_arrays = true;
			XRMesh.setUseGeomArrays();
			console.log('----INIT');
			instance._initAR(options).then((deviceId) => {
				instance._deviceId = deviceId;
				instance._isInitialized = true;
				try {
					instance.dispatchEvent(
						ARKitWrapper.INIT_EVENT,
						new CustomEvent(ARKitWrapper.INIT_EVENT, {
							source: instance
						})
					);
				} catch(e) {
					console.error('INIT_EVENT event error', e);
				}
			});
		}
		return ARKitWrapper.GLOBAL_INSTANCE;
	}
	static HasARKit() {
		return typeof window.webkit !== 'undefined';
	}
	get deviceId() { return this._deviceId; }
	get hasSession() { return this._isWatching; }
	get isInitialized() { return this._isInitialized; }
	_sendMessage(actionName, options={}, mustBeInitialized=true, callback=true) {
		return new Promise((resolve, reject) => {
			if (mustBeInitialized && !this._isInitialized) {
				reject(new Error('ARKit is not initialized'));
				return;
			}
			const extraOptions = {};
			if (callback) {
				const callbackName = 'arkitCallback_' + actionName + '_' + new Date().getTime() +
					'_' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER));
				window[callbackName] = (data) => {
					delete window[callbackName];
					resolve(data);
				};
				extraOptions.callback = callbackName;
			}
			let handler = window.webkit.messageHandlers[actionName];
			handler.postMessage(Object.assign({}, options, extraOptions));
			if (!callback) { resolve(); }
		});
	}
	_initAR(options) {
		return this._sendMessage('initAR', {
			options: options
		}, false);
	}
	_requestSession(options, dataCallbackName) {
		return this._sendMessage('requestSession', {
			options: options,
			data_callback: dataCallbackName
		});
	}
	_hitTest(x, y, types) {
		return this._sendMessage('hitTest', {
			x: x,
			y: y,
			type: types
		});
	}
	_addAnchor(uid, transform) {
		return this._sendMessage('addAnchor', {
			uuid: uid,
			transform: transform
		});
	}
	_removeAnchors(uids) {
		return new Promise((resolve) => {
			window.webkit.messageHandlers.removeAnchors.postMessage(uids);
			resolve();
		});
	}
	_createDetectionImage(uid, buffer, width, height, physicalWidthInMeters) {
		return this._sendMessage('createImageAnchor', {
			uid: uid,
			buffer: base64.encode(buffer),
			imageWidth: width,
			imageHeight: height,
			physicalWidth: physicalWidthInMeters
		});
	}
	_destroyDetectionImage(uid) {
		return this._sendMessage('destroyImageAnchor', {
			uid: uid
		});
	}
	_activateDetectionImage(uid, trackable = false) {
		return this._sendMessage('activateDetectionImage', {
			uid: uid,
			trackable: trackable
		});
	}
	_deactivateDetectionImage(uid) {
		return this._sendMessage('deactivateDetectionImage', {
			uid: uid,
		});
	}
	_setNumberOfTrackedImages(count) {
		this._sendMessage('setNumberOfTrackedImages', {
			numberOfTrackedImages: typeof(count) === 'number' ? count : 0
		}, true, false);
	}
	_getWorldMap() {
		return this._sendMessage('getWorldMap');
	}
	_setWorldMap(worldMap) {
		return this._sendMessage('setWorldMap', {
			worldMap: worldMap.worldMap
		});
	}
	_stop() {
		return this._sendMessage('stopAR');
	}
	_setUIOptions(options) {
		return this._sendMessage('setUIOptions', options, true, false);
	}
	_onUpdate() {
		return window.webkit.messageHandlers.onUpdate.postMessage({});
	}
	_requestComputerVisionData() {
		return this._sendMessage('requestComputerVisionData', {}, true, false);
	}
	_startSendingComputerVisionData() {
		return this._sendMessage('startSendingComputerVisionData', {}, true, false);
	}
	_stopSendingComputerVisionData() {
		return this._sendMessage('stopSendingComputerVisionData', {}, true, false);
	}
	_onData(data) {
		this._rawARData = data;
		this._worldInformation = null;
		this._timestamp = this._adjustARKitTime(data.timestamp);
		this._lightProbe = new XRLightProbe({
			indirectIrradiance: data.light_intensity / 1000
		});
		copy$5(this._cameraTransform, data.camera_transform);
		copy$5(this._viewMatrix, data.camera_view);
		copy$5(this._projectionMatrix, data.projection_camera);
		this._worldMappingStatus = data.worldMappingStatus;
		if (data.newObjects.length) {
			for (let i = 0; i < data.newObjects.length; i++) {
				const element = data.newObjects[i];
				const anchor = this._anchors.get(element.uuid);
				if (anchor && anchor.deleted) {
					anchor.deleted = false;
				}
				this._createOrUpdateAnchorObject(element);
			}
		}
		if (data.removedObjects.length) {
			for (let i = 0; i < data.removedObjects.length; i++) {
				const element = data.removedObjects[i];
				const anchor = this._anchors.get(element);
				if (anchor) {
					anchor.notifyOfRemoval();
					this._anchors.delete(element);
				} else {
					console.error("app signalled removal of non-existant anchor/plane");
				}
			}
		}
		if (data.objects.length) {
			for (let i = 0; i < data.objects.length; i++) {
				const element = data.objects[i];
				this._createOrUpdateAnchorObject(element);
			}
		}
		try {
			this.dispatchEvent(
				ARKitWrapper.WATCH_EVENT,
				new CustomEvent(ARKitWrapper.WATCH_EVENT, {
					source: this,
					detail: this
				})
			);
		} catch(e) {
			console.error('WATCH_EVENT event error', e);
		}
		if (this._rAF_callbacks.length > 0) {
			this._do_rAF();
		}
		this._dataBeforeNext++;
	}
	_onComputerVisionData(detail) {
		if (!detail) {
			console.error("detail passed to _onComputerVisionData is null");
			this._requestComputerVisionData();
			return;
		}
		if (!detail.frame || !detail.frame.buffers || detail.frame.buffers.length <= 0) {
			console.error("detail passed to _onComputerVisionData is bad, no buffers");
			this._requestComputerVisionData();
			return;
		}
		detail.camera.arCamera = true;
		const orientation = detail.camera.interfaceOrientation;
		detail.camera.viewMatrix = detail.camera.inverse_viewMatrix;
		switch (orientation) {
			case 1:
				detail.camera.cameraOrientation = -90;
				break;
			case 2:
				detail.camera.cameraOrientation = 90;
				break;
			case 3:
				detail.camera.cameraOrientation = 0;
				break;
			case 4:
				detail.camera.cameraOrientation = 180;
				break;
		}
		switch(detail.frame.pixelFormatType) {
			case "kCVPixelFormatType_420YpCbCr8BiPlanarFullRange":
				detail.frame.pixelFormat = "YUV420P";
				break;
			default:
				detail.frame.pixelFormat = detail.frame.pixelFormatType;
				break;
		}
		const xrVideoFrame = new XRVideoFrame(detail.frame.buffers, detail.frame.pixelFormat, this._adjustARKitTime(detail.frame.timestamp), detail.camera);
		try {
			this.dispatchEvent(
				ARKitWrapper.COMPUTER_VISION_DATA,
				new CustomEvent(
					ARKitWrapper.COMPUTER_VISION_DATA,
					{
						source: this,
						detail: xrVideoFrame
					}
				)
			);
		} catch(e) {
			console.error('COMPUTER_VISION_DATA event error', e);
		}
	}
	_do_rAF() {
		const callbacks = this._rAF_callbacks;
		this._rAF_currentCallbacks = this._rAF_currentCallbacks.concat(this._rAF_callbacks);
		this._rAF_callbacks = [];
		return window.requestAnimationFrame((...params) => {
			this.startingRender();
			for (let i = 0; i < callbacks.length; i++) {
				let queuedCallbacks = this._rAF_currentCallbacks;
				let index = queuedCallbacks.findIndex(d => d && d.handle === callbacks[i].handle);
				if (index > -1) {
					queuedCallbacks.splice(index, 1);
				}
				try {
					if (!callbacks[i].cancelled && typeof callbacks[i].callback === 'function') {
						callbacks[i].callback(...callbacks[i].params);
					}
				} catch(err) {
					console.error(err);
				}
			}
			this.finishedRender();
		});
	}
	_createOrUpdateAnchorObject(element) {
		if (element.plane_center) {
			const anchor = this._anchors.get(element.uuid);
			if (!anchor || anchor.placeholder) {
				const planeObject = new XRPlaneMesh(element.transform,
					element.plane_center,
					[element.plane_extent.x, element.plane_extent.z],
					element.plane_alignment,
					element.geometry,
					element.uuid, this._timestamp);
				if (anchor) {
					try {
						anchor.dispatchEvent("replaceAnchor",
							new CustomEvent("replaceAnchor", {
								source: anchor,
								detail: planeObject
							})
						);
					} catch(e) {
						console.error('replaceAnchor event error', e);
					}
					console.log('replaced dummy anchor created from hit test with plane');
					this._anchors.delete(element.uuid);
				}
				this._anchors.set(element.uuid, planeObject);
				element.object = planeObject;
			} else if (anchor) {
				anchor.updatePlaneData(element.transform, element.plane_center, [element.plane_extent.x,element.plane_extent.y], element.plane_alignment, element.geometry, this._timestamp);
				element.object = anchor;
			}
		} else {
			const anchor = this._anchors.get(element.uuid);
			if (!anchor || anchor.placeholder) {
				let anchorObject;
				switch (element.type) {
					case ARKitWrapper.ANCHOR_TYPE_FACE:
						anchorObject = new XRFaceMesh(element.transform, element.geometry, element.blendShapes,  element.uuid, this._timestamp);
						break;
					case ARKitWrapper.ANCHOR_TYPE_ANCHOR:
						anchorObject = new XRAnchor(element.transform, element.uuid, this._timestamp);
						break;
					case ARKitWrapper.ANCHOR_TYPE_IMAGE:
						anchorObject = new XRImageAnchor(element.transform, element.uuid, this._timestamp);
						break;
				}
				if (anchor) {
					try {
						anchor.dispatchEvent("replaceAnchor",
							new CustomEvent("replaceAnchor", {
								source: anchor || mesh,
								detail: anchorObject
							})
						);
					} catch(e) {
						console.error('replaceAnchor event error', e);
					}
					console.log('replaced dummy anchor created from hit test with new anchor');
				}
				this._anchors.set(element.uuid, anchorObject);
				element.object = anchorObject;
			} else {
				switch (element.type) {
					case ARKitWrapper.ANCHOR_TYPE_FACE:
						anchor.updateFaceData(element.transform, element.geometry, element.blendShapes, this._timestamp);
						break;
					default:
						anchor.updateModelMatrix(element.transform, this._timestamp);
						break;
				}
				element.object = anchor;
			}
		}
	}
	_adjustARKitTime(time) {
		if (this._timeOffsetComputed) {
			return time + this._timeOffset;
		} else {
			return (performance || Date).now();
		}
	}
	get hasData() { return this._rawARData !== null; }
	getData(key=null) {
		if (!key) {
			return this._rawARData;
		}
		if (this._rawARData && typeof this._rawARData[key] !== 'undefined') {
			return this._rawARData[key];
		}
		return null;
	}
	waitForInit() {
		return new Promise((resolve, reject) => {
			if (this._isInitialized) {
				resolve();
				return;
			}
			const callback = () => {
				this.removeEventListener(ARKitWrapper.INIT_EVENT, callback, false);
				resolve();
			};
			this.addEventListener(ARKitWrapper.INIT_EVENT, callback, false);
		});
	}
	pickBestHit(hits) {
		if (hits.length === 0) { return null; }
		const planeResults = hits.filter(
			hitTestResult => hitTestResult.type != ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT
		);
		const planeExistingUsingExtentResults = planeResults.filter(
			hitTestResult => hitTestResult.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT
		);
		const planeExistingResults = planeResults.filter(
			hitTestResult => hitTestResult.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE
		);
		if (planeExistingUsingExtentResults.length) {
			planeExistingUsingExtentResults = planeExistingUsingExtentResults.sort((a, b) => a.distance - b.distance);
			return planeExistingUsingExtentResults[0];
		} else if (planeExistingResults.length) {
			planeExistingResults = planeExistingResults.sort((a, b) => a.distance - b.distance);
			return planeExistingResults[0];
		} else if (planeResults.length) {
			planeResults = planeResults.sort((a, b) => a.distance - b.distance);
			return planeResults[0];
		} else {
			return hits[0];
		}
		return null;
	}
	createAnchorFromHit(hit) {
		return new Promise((resolve, reject) => {
			if (hit.anchor_transform) {
				let anchor = this._anchors.get(hit.uuid);
				if (!anchor) {
					anchor = new XRAnchor(hit.anchor_transform, hit.uuid, this._timestamp);
					console.log('created dummy anchor from hit test');
					anchor.placeholder = true;
					this._anchors.set(hit.uuid, anchor);
				} else if (anchor.placeholder) {
					anchor.updateModelMatrix(hit.anchor_transform, this._timestamp);
				}
				const anchorOffset = new XRAnchorOffset(anchor, hit.local_transform);
				resolve(anchorOffset);
			} else {
				let anchor = this._anchors.get(hit.uuid);
				if (!anchor) {
					anchor = new XRAnchor(hit.world_transform, hit.uuid);
					console.log('created dummy anchor (not a plane) from hit test');
					anchor.placeholder = true;
					this._anchors.set(hit.uuid, anchor);
				} else {
					anchor.placeholder = false;
					anchor.deleted = false;
					console.log('hit test resulted in a hit on an existing anchor, without an offset');
				}
				resolve(anchor);
			}
		});
	}
	requestAnimationFrame(callback, ...params) {
    	const handle = ++this._frameHandle;
	    this._rAF_callbacks.push({
			  handle,
			  callback,
			  params,
      		  cancelled: false
		});
		if (!this._isWatching || this._dataBeforeNext > 0) {
			this._do_rAF();
		}
		return handle;
	}
	cancelAnimationFrame(handle) {
		let callbacks = this._rAF_callbacks;
		let index = callbacks.findIndex(d => d && d.handle === handle);
		if (index > -1) {
			callbacks[index].cancelled = true;
			callbacks.splice(index, 1);
		}
		callbacks = this._rAF_currentCallbacks;
		if (callbacks) {
			index = callbacks.findIndex(d => d && d.handle === handle);
			if (index > -1) {
				callbacks[index].cancelled = true;
			}
		}
	}
	startingRender() {
		if (this._dataBeforeNext > 1) {
		}
	}
	finishedRender() {
		this._dataBeforeNext = 0;
		this._anchors.forEach(anchor => {
			anchor.clearChanged();
		});
		this._onUpdate();
	}
	watch(options=null) {
		return new Promise((resolve, reject) => {
			if (!this._isInitialized) {
				reject("ARKitWrapper hasn't been initialized yet");
				return;
			}
			if (this._waitingForSessionStart) {
				reject("ARKitWrapper startSession called, waiting to finish");
				return;
			}
			if (this._isWatching) {
				resolve({
					"cameraAccess": this._sessionCameraAccess,
					"worldAccess": this._sessionWorldAccess,
					"webXRAccess": true
				});
				return;
			}
			this._waitingForSessionStart = true;
			let newOptions = Object.assign({}, this._defaultOptions);
			if (options !== null) {
				newOptions = Object.assign(newOptions, options);
			}
			this._requestedPermissions.cameraAccess = newOptions.videoFrames;
			this._requestedPermissions.worldAccess = newOptions.worldSensing;
			if (newOptions.videoFrames) {
				delete newOptions.videoFrames;
				newOptions.computer_vision_data = true;
			}
			console.log('----WATCH');
			const callbackName = 'arkitCallbackOnData';
			if (window[callbackName] === undefined) {
				window[callbackName] = (result) => {
					this._onData(result);
				};
			}
			this._requestSession(newOptions, callbackName).then((results) => {
				if (!results.webXRAccess) {
					reject(new Error('user did not give permission to start a webxr session'));
					return;
				}
				this._waitingForSessionStart = false;
				this._isWatching = true;
				this._currentPermissions.cameraAccess = results.cameraAccess;
				this._currentPermissions.worldAccess = results.worldAccess;
				resolve(results);
			});
		});
	}
	stop() {
		return new Promise((resolve, reject) => {
			if (!this._isWatching) {
				resolve();
				return;
			}
			console.log('----STOP');
			this._stop().then((results) => {
				this._handleStopped();
				resolve(results);
			});
		});
	}
	_handleStopped() {
		this._isWatching = false;
		if (this._rAF_callbacks.length > 0) {
			this._do_rAF();
		}
	}
	hitTest(x, y, types=ARKitWrapper.HIT_TEST_TYPE_ALL) {
		return this._hitTest(x, y, types);
	}
	createAnchor(anchorInWorldMatrix) {
		return new Promise((resolve, reject) => {
			const tempAnchor = new XRAnchor(anchorInWorldMatrix, null, this._timestamp);
			this._addAnchor(tempAnchor.uid, anchorInWorldMatrix).then(detail => {
				if (detail.error) {
					reject(detail.error);
					return;
				}
				const anchor = this._anchors.get(detail.uuid);
				if (!anchor) {
					this._anchors.set(detail.uuid, tempAnchor);
					resolve(tempAnchor);
				} else {
					anchor.placeholder = false;
					anchor.deleted = false;
					anchor.updateModelMatrix(detail.transform, this._timestamp);
					resolve(anchor);
				}
			}).catch((...params) => {
				console.error('could not create anchor', ...params);
				reject();
			});
		});
	}
	removeAnchor(anchor) {
		let _anchor = this._anchors.get(anchor.uid);
		if (_anchor.placeholder) {
			this._anchors.delete(anchor.uid);
			return;
		}
		if (_anchor) {
			_anchor.deleted = true;
		}
		if (!anchor instanceof XRAnchorOffset) {
			this._removeAnchors([anchor.uid]);
		}
	}
	createDetectionImage(uid, buffer, width, height, physicalWidthInMeters) {
		return new Promise((resolve, reject) => {
			this._createDetectionImage(uid, buffer, width, height, physicalWidthInMeters).then(detail => {
				if (detail.error) {
					reject(detail.error);
					return;
				}
				if (!detail.created) {
					reject(null);
					return;
				}
				resolve();
			}).catch((...params) => {
				console.error('could not create image', ...params);
				reject();
			});
		});
	}
	destroyDetectionImage(uid) {
		return new Promise((resolve, reject) => {
			this._destroyDetectionImage(uid).then(detail => {
				if (detail.error) {
					reject(detail.error);
					return;
				}
				resolve();
			}).catch((...params) => {
				console.error('could not destroy image', ...params);
				reject();
			});
		});
	}
	activateDetectionImage(uid, trackable = false) {
		return new Promise((resolve, reject) => {
			const anchor = this._anchors.get(uid);
			if (anchor && !anchor.deleted) {
				resolve(anchor);
				return;
			}
			this._activateDetectionImage(uid, trackable).then(detail => {
				if (detail.error) {
					reject(detail.error);
					reject();
				}
				if (!detail.activated) {
					reject(null);
					return;
				}
				this._createOrUpdateAnchorObject(detail.imageAnchor);
				detail.imageAnchor.object.deleted = false;
				resolve(detail.imageAnchor.object);
			}).catch((...params) => {
				console.error('could not activate image', ...params);
				reject();
			});
		});
	}
	deactivateDetectionImage(uid) {
		return new Promise((resolve, reject) => {
			this._deactivateDetectionImage(uid).then(detail => {
				if (detail.error) {
					reject(detail.error);
					
				}
				const anchor = this._anchors.get(uid);
				if (anchor) {
					console.warn("anchor for image target '" + uid + "' still exists after deactivation");
					this.removeAnchor(anchor);
				}
				resolve();
			}).catch((...params) => {
				console.error('could not activate image', ...params);
				reject();
			});
		});
	}
	setNumberOfTrackedImages(count) {
		return this._setNumberOfTrackedImages(count);
	}
	getWorldMap() {
		return new Promise((resolve, reject) => {
			this._getWorldMap().then(ARKitWorldMap => {
				if (ARKitWorldMap.saved === true) {
					resolve(ARKitWorldMap.worldMap);
				} else if (ARKitWorldMap.error !== null) {
					reject(ARKitWorldMap.error);
					return;
				} else {
					reject(null);
					return;
				}
			}).catch((...params) => {
				console.error('could not get world map', ...params);
				reject();
			});
		});
	}
	setWorldMap(worldMap) {
		return this._setWorldMap(worldMap);
	}
	getLightProbe() {
		return new Promise((resolve, reject) => {
			if (this._lightProbe) {
				resolve(this._lightProbe);
			} else {
				reject(new Error('Not populated yet'));
			}
		});
	}
	setUIOptions(options) {
		return this._setUIOptions(options);
	}
	updateWorldSensingState(options) {
		if (options.hasOwnProperty("meshDetectionState") && this._currentPermissions.worldAccess) {
			this._worldSensingState.meshDetectionState = options.meshDetectionState.enabled || false;
		} else {
			this._worldSensingState.meshDetectionState = false;
		}
		return this._worldSensingState;
	}
	getWorldInformation() {
		if (this._worldInformation) {
			return this._worldInformation;
		}
		let state = {};
		if (this._worldSensingState.meshDetectionState) {
			state.meshes = [];
			this._anchors.forEach(anchor => {
				if (anchor.isMesh() && !anchor.deleted && !anchor.placeholder) {
					state.meshes.push(anchor);
				}
			});
		}
		this._worldInformation = state;
		return state;
	}
}
ARKitWrapper.INIT_EVENT = 'arkit-init';
ARKitWrapper.WATCH_EVENT = 'arkit-watch';
ARKitWrapper.RECORD_START_EVENT = 'arkit-record-start';
ARKitWrapper.RECORD_STOP_EVENT = 'arkit-record-stop';
ARKitWrapper.DID_MOVE_BACKGROUND_EVENT = 'arkit-did-move-background';
ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT = 'arkit-will-enter-foreground';
ARKitWrapper.INTERRUPTED_EVENT = 'arkit-interrupted';
ARKitWrapper.INTERRUPTION_ENDED_EVENT = 'arkit-interruption-ended';
ARKitWrapper.SHOW_DEBUG_EVENT = 'arkit-show-debug';
ARKitWrapper.WINDOW_RESIZE_EVENT = 'arkit-window-resize';
ARKitWrapper.ON_ERROR = 'on-error';
ARKitWrapper.USER_STOPPED_AR = 'user-stopped-ar';
ARKitWrapper.AR_TRACKING_CHANGED = 'ar_tracking_changed';
ARKitWrapper.COMPUTER_VISION_DATA = 'cv_data';
ARKitWrapper.USER_GRANTED_COMPUTER_VISION_DATA = 'user-granted-cv-data';
ARKitWrapper.USER_GRANTED_WORLD_SENSING_DATA = 'user-granted-world-sensing-data';
ARKitWrapper.ORIENTATION_UP = 1;
ARKitWrapper.ORIENTATION_UP_MIRRORED = 2;
ARKitWrapper.ORIENTATION_DOWN = 3;
ARKitWrapper.ORIENTATION_DOWN_MIRRORED = 4;
ARKitWrapper.ORIENTATION_LEFT_MIRRORED = 5;
ARKitWrapper.ORIENTATION_RIGHT = 6;
ARKitWrapper.ORIENTATION_RIGHT_MIRRORED = 7;
ARKitWrapper.ORIENTATION_LEFT = 8;
ARKitWrapper.WEB_AR_WORLDMAPPING_NOT_AVAILABLE = "ar_worldmapping_not_available";
ARKitWrapper.WEB_AR_WORLDMAPPING_LIMITED       = "ar_worldmapping_limited";
ARKitWrapper.WEB_AR_WORLDMAPPING_EXTENDING     = "ar_worldmapping_extending";
ARKitWrapper.WEB_AR_WORLDMAPPING_MAPPED        = "ar_worldmapping_mapped";
ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT = 1;
ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE = 2;
ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_VERTICAL_PLANE = 4;
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE = 8;
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT = 16;
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_GEOMETRY = 32;
ARKitWrapper.HIT_TEST_TYPE_ALL = ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT;
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANES = ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT;
ARKitWrapper.ANCHOR_TYPE_PLANE = 'plane';
ARKitWrapper.ANCHOR_TYPE_FACE = 'face';
ARKitWrapper.ANCHOR_TYPE_ANCHOR = 'anchor';
ARKitWrapper.ANCHOR_TYPE_IMAGE = 'image';

class ARKitWatcher {
	constructor(arKitWrapper) {
		this._subscribed = false;
		this._arKitWrapper = arKitWrapper;
		this.subscribe();
	}
	subscribe(){
		if (this._subscribed) { return; }
		this._subscribed = true;
		this._arKitWrapper.addEventListener(ARKitWrapper.INIT_EVENT, this.handleARKitInit.bind(this));
		this._arKitWrapper.addEventListener(ARKitWrapper.WATCH_EVENT, this.handleARKitUpdate.bind(this));
		this._arKitWrapper.addEventListener(ARKitWrapper.WINDOW_RESIZE_EVENT, this.handleARKitWindowResize.bind(this));
		this._arKitWrapper.addEventListener(ARKitWrapper.ON_ERROR, this.handleOnError.bind(this));
		this._arKitWrapper.addEventListener(ARKitWrapper.AR_TRACKING_CHANGED, this.handleArTrackingChanged.bind(this));
		this._arKitWrapper.addEventListener(ARKitWrapper.COMPUTER_VISION_DATA, this.handleComputerVisionData.bind(this));
		this._arKitWrapper.addEventListener(ARKitWrapper.USER_STOPPED_AR, this.handleUserStoppedAR.bind(this));
	}
	handleARKitInit() {}
	handleARKitUpdate() {}
	handleARKitWindowResize() {}
	handleOnError() {}
	handleArTrackingChanged() {}
	handleComputerVisionData() {}
	handleUserStoppedAR() {}
}

class ARKitDevice extends XRDevice {
	constructor(global){
		super(global);
		this._throttledLogPose = throttle(this.logPose, 1000);
		this._sessions = new Map();
		this._activeSession = null;
		this._frameSession = null;
		this._wrapperDiv = document.createElement('div');
		this._wrapperDiv.setAttribute('class', 'arkit-device-wrapper');
		const insertWrapperDiv = () => {
			document.body.insertBefore(this._wrapperDiv, document.body.firstChild || null);
		};
		if (document.body) {
			insertWrapperDiv();
		} else {
			document.addEventListener('DOMContentLoaded', insertWrapperDiv);
		}
		this._headModelMatrix = create$5();
		this._headModelMatrixInverse = create$5();
		this._projectionMatrix = create$5();
		this._deviceProjectionMatrix = create$5();
		this._eyeLevelMatrix = identity$3(create$5());
		this._stageMatrix = identity$3(create$5());
		this._stageMatrix[13] = 1.3;
		this._identityMatrix = identity$3(create$5());
		this._baseFrameSet = false;
		this._frameOfRefRequestsWaiting = [];
		this._depthNear = 0.1;
		this._depthFar = 1000;
		try {
			this._arKitWrapper = ARKitWrapper.GetOrCreate();
			this._arWatcher = new ARWatcher(this._arKitWrapper, this);
		} catch (e) {
			console.error('Error initializing the ARKit wrapper', e);
			this._arKitWrapper = null;
			this._arWatcher = null;
		}
		this._hitTestSources = [];
		this._hitTestResults = new Map();
		this._hitTestResultsForNextFrame = new Map();
		this._domOverlayRoot = null;
		this._topMostDomElement = null;
		this._activeXRSession = null;
		this._gamepads = [];
		this._gamepadInputSources = [];
		this._touches = [];
		const primaryButtonIndex = 0;
		this._gamepads.push(createGamepad('', 'right', 1, true));
		this._gamepadInputSources.push(new GamepadXRInputSource(this, {}, 0));
		this._gamepadInputSources[0]._active = false;
		this._touches.push({x: -1, y: -1});
		const getTopMostDomElement = (x, y) => {
			if (!this._domOverlayRoot) {
				return null;
			}
			const elements = document.elementsFromPoint(x, y);
			for (const element of elements) {
				if (this._domOverlayRoot.contains(element)) {
					return element;
				}
			}
			return null;
		};
		document.addEventListener('touchstart', event => {
			if (!event.touches || event.touches.length == 0) {
				return;
			}
			const touch = event.touches[0];
			const x = touch.clientX;
			const y = touch.clientY;
			this._topMostDomElement = getTopMostDomElement(x, y);
			this._touches[0].x = x;
			this._touches[0].y = y;
			const button = this._gamepads[0].buttons[primaryButtonIndex];
			button.pressed = true;
			button.value = 1.0;
		});
		document.addEventListener('touchmove', event => {
			if (!event.touches || event.touches.length == 0) {
				return;
			}
			const touch = event.touches[0];
			const x = touch.clientX;
			const y = touch.clientY;
			this._topMostDomElement = getTopMostDomElement(x, y);
			this._touches[0].x = x;
			this._touches[0].y = y;
		});
		document.addEventListener('touchend', event => {
			const x = this._touches[0].x;
			const y = this._touches[0].y;
			this._topMostDomElement = getTopMostDomElement(x, y);
			const button = this._gamepads[0].buttons[primaryButtonIndex];
			button.pressed = false;
			button.value = 0.0;
			this._touches[0].x = -1;
			this._touches[0].y = -1;
		});
	}
	static initStyles() {
		const init = () => {
			const styleEl = document.createElement('style');
			document.head.appendChild(styleEl);
			const styleSheet = styleEl.sheet;
			styleSheet.insertRule('.arkit-device-wrapper { z-index: -1; display: none; }', 0);
			styleSheet.insertRule('.arkit-device-wrapper, .xr-canvas { background-color: transparent; position: absolute; top: 0; left: 0; bottom: 0; right: 0; }', 0);
			styleSheet.insertRule('.arkit-device-wrapper, .arkit-device-wrapper canvas { width: 100%; height: 100%; padding: 0; margin: 0; -webkit-user-select: none; user-select: none; }', 0);
		};
		if (document.body) {
			init();
		} else {
			window.addEventListener('DOMContentLoaded', init);
		}
	}
	logPose() {
		console.log('pose',
			getTranslation$1(new Float32Array(3), this._headModelMatrix),
			getRotation$1(new Float32Array(4), this._headModelMatrix)
		);
	}
	addHitTestSource(source) {
		if (!this._hitTestSources.includes(source)) {
			this._hitTestSources.push(source);
		}
	}
	_runHitTest() {
		this._hitTestResults.clear();
		let sourceNum = 0;
		for (let i = 0; i < this._hitTestSources.length; i++) {
			const source = this._hitTestSources[i];
			if (source._active) {
				if (source._session[PRIVATE$15].ended) {
					source.cancel();
				} else {
					this._hitTestSources[sourceNum++] = source;
					if (this._hitTestResultsForNextFrame.has(source)) {
						this._hitTestResults.set(source, this._hitTestResultsForNextFrame.get(source));
					}
				}
			}
		}
		this._hitTestSources.length = sourceNum;
		this._hitTestResultsForNextFrame.clear();
		if (!this._arKitWrapper) {
			console.error('Hit test requires ARKitWrapper.');
			return;
		}
		for (const source of this._hitTestSources) {
			const proj = create$6();
			proj[0] = source._offsetRay.direction.x;
			proj[1] = source._offsetRay.direction.y;
			proj[2] = source._offsetRay.direction.z;
			transformMat4$2(proj, proj, this._arKitWrapper._projectionMatrix);
			const x = (proj[0] + 1.0) * 0.5;
			const y = (-proj[1] + 1.0) * 0.5;
			this._arKitWrapper.hitTest(x, y, ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_GEOMETRY).then(hits => {
				if (!this._hitTestResultsForNextFrame.has(source)) {
					this._hitTestResultsForNextFrame.set(source, []);
				}
				const results = this._hitTestResultsForNextFrame.get(source);
				for (const hit of hits) {
					results.push(new XRRigidTransform(new Float32Array(hit.world_transform)));
				}
			});
		}
	}
	getHitTestResults(source) {
		return this._hitTestResults.has(source) ? this._hitTestResults.get(source) : [];
	}
	setDomOverlayRoot(root) {
		this._domOverlayRoot = root;
	}
	setActiveXRSession(xrSession) {
		this._activeXRSession = xrSession;
	}
	_shouldSuppressSelectEvents() {
		if (this._topMostDomElement && this._topMostDomElement.dispatchEvent) {
			const event = new XRSessionEvent('beforexrselect', {session: this._activeXRSession, cancelable: true});
			this._topMostDomElement.dispatchEvent(event);
			if (event.defaultPrevented) {
				return true;
			}
		}
		return false;
	}
	setProjectionMatrix(matrix) {
		copy$5(this._deviceProjectionMatrix, matrix);
	}
	setBaseViewMatrix(matrix) {
		copy$5(this._headModelMatrixInverse, matrix);
		invert$3(this._headModelMatrix, this._headModelMatrixInverse);
		if (!this._baseFrameSet) {
			this._baseFrameSet = true;
			for (let i = 0; i < this._frameOfRefRequestsWaiting.length; i++) {
				const callback = this._frameOfRefRequestsWaiting[i];
				try {
					callback();
				} catch(e) {
					console.error("finalization of reference frame requests failed: ", e);
				}
			}
			this._frameOfRefRequestsWaiting.length = 0;
		}
	}
	get depthNear() { return this._depthNear; }
	set depthNear(val) { this._depthNear = val; }
	get depthFar() { return this._depthFar; }
	set depthFar(val) { this._depthFar = val; }
	isSessionSupported(mode) {
		return mode === 'immersive-ar' || mode === 'inline';
	}
	isFeatureSupported(featureDescriptor) {
		switch(featureDescriptor) {
			case 'viewer': return true;
			case 'local': return true;
			case 'local-floor': return true;
			case 'bounded': return false;
			case 'unbounded': return false;
			case 'worldSensing': return true;
			case 'computerVision': return true;
			case 'alignEUS': return true;
			case 'hit-test': return true;
			case 'dom-overlay': return true;
			default: return false;
		}
	}
	doesSessionSupportReferenceSpace(sessionId, type) {
		const session = this._sessions.get(sessionId);
		if (session.ended) {
			return false;
		}
		if (!session.enabledFeatures.has(type)) {
			return false;
		}
		switch(type) {
			case 'viewer': return true;
			case 'local': return true;
			case 'local-floor': return true;
			case 'bounded': return false;
			case 'unbounded': return false;
			default: return false;
		}
	}
	async requestSession(mode, enabledFeatures) {
		if (!this.isSessionSupported(mode)) {
			console.error('Invalid session mode', mode);
			return Promise.reject();
		}
		if (mode === 'inline') {
			const session = new Session(mode, enabledFeatures);
			this._sessions.set(session.id, session);
			return Promise.resolve(session.id);
		}
		if (!this._arKitWrapper) {
			console.error('Session requested without an ARKitWrapper');
			return Promise.reject();
		}
		if (this._activeSession !== null) {
			console.error('Tried to start a second active session');
			return Promise.reject();
		}
		const ARKitOptions = {};
		if (enabledFeatures.has("worldSensing")) {
			ARKitOptions.worldSensing = true;
		}
		if (enabledFeatures.has("computerVision")) {
			ARKitOptions.videoFrames = true;
		}
		if (enabledFeatures.has("alignEUS")) {
			ARKitOptions.alignEUS = true;
		}
		await this._arKitWrapper.waitForInit().then(() => {}).catch((...params) => {
			console.error("app failed to initialize: ", ...params);
			return Promise.reject();
		});
		const watchResult = await this._arKitWrapper.watch(ARKitOptions).then((results) => {
			const session = new Session(mode, enabledFeatures);
			this._sessions.set(session.id, session);
			this._activeSession = session;
			this.dispatchEvent('@@webxr-polyfill/vr-present-start', session.id);
			return Promise.resolve(session.id);
		}).catch((...params) => {
			console.error("session request failed: ", ...params);
			return Promise.reject();
		});
		return watchResult;
	}
	onBaseLayerSet(sessionId, layer) {
		const session = this._sessions.get(sessionId);
		const canvas = layer.context.canvas;
		const oldLayer = session.baseLayer;
		session.baseLayer = layer;
		if (!session.immersive) {
			return;
		}
		if (oldLayer !== null) {
			const oldCanvas = oldLayer.context.canvas;
			this._wrapperDiv.removeChild(oldCanvas);
			oldCanvas.style.width = session.canvasWidth;
			oldCanvas.style.height = session.canvasHeight;
			oldCanvas.style.display = session.canvasDisplay;
			oldCanvas.style.backgroundColor = session.canvasBackground;
		}
		session.bodyBackgroundColor = document.body.style.backgroundColor;
		session.bodyBackgroundImage = document.body.style.backgroundImage;
		document.body.style.backgroundColor = "transparent";
		document.body.style.backgroundImage = "none";
		var children = document.body.children;
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child != this._wrapperDiv && child != canvas &&
				(!this._domOverlayRoot || !this._domOverlayRoot.contains(child))) {
				var display = child.style.display;
				child._displayChanged = true;
				child._displayWas = display;
				child.style.display = "none";
			}
		}
		session.canvasParent = canvas.parentNode;
		session.canvasNextSibling = canvas.nextSibling;
		session.canvasDisplay = canvas.style.display;
		canvas.style.display = "block";
		session.canvasBackground = canvas.style.backgroundColor;
		canvas.style.backgroundColor = "transparent";
		session.canvasWidth = canvas.style.width;
		session.canvasHeight = canvas.style.height;
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		this._wrapperDiv.appendChild(canvas);
		this._wrapperDiv.style.display = "block";
	}
	userEndedSession() {
		if (this._activeSession) {
			let session = this._activeSession;
			if (session.immersive && !session.ended) {
				this.endSession(session.id);
				this.dispatchEvent('@@webxr-polyfill/vr-present-end', session.id);
			}
		}
	}
	endSession(sessionId) {
		const session = this._sessions.get(sessionId);
		if (!session || session.ended) { return; }
		session.ended = true;
		if (this._activeSession === session) {
			if (session.baseLayer !== null) {
				var children = document.body.children;
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					if (child != this._wrapperDiv) {
						if (child._displayChanged) {
							child.style.display = child._displayWas;
							child._displayWas = "";
							child._displayChanged = false;
						}
					}
				}
				const canvas = session.baseLayer.context.canvas;
				this._wrapperDiv.removeChild(canvas);
				if (!session.canvasNextSibling) {
					if (session.canvasParent) {
						session.canvasParent.appendChild(canvas);
					} else {
					}
				} else {
					session.canvasNextSibling.before(canvas);
				}
				session.canvasParent = null;
				session.canvasNextSibling = null;
				canvas.style.width = session.canvasWidth;
				canvas.style.height = session.canvasHeight;
				canvas.style.display = session.canvasDisplay;
				canvas.style.backgroundColor = session.canvasBackground;
				document.body.style.backgroundColor = session.bodyBackgroundColor;
				document.body.style.backgroundImage = session.bodyBackgroundImage;
			}
			this._wrapperDiv.style.display = "none";
			this._activeSession = null;
			identity$3(this._headModelMatrix);
			this._arKitWrapper.stop();
			this._domOverlayRoot = null;
			this._topMostDomElement = null;
			this._activeXRSession = null;
		}
		this._frameSession = null;
	}
	requestAnimationFrame(callback, ...params) {
			return this._arKitWrapper.requestAnimationFrame(callback, params);
	}
	cancelAnimationFrame(handle) {
		return this._arKitWrapper.cancelAnimationFrame(handle);
	}
	onFrameStart(sessionId, renderState) {
		const session = this._sessions.get(sessionId);
		this._frameSession = session;
		if (session.immersive) {
			copy$5(this._projectionMatrix, this._deviceProjectionMatrix);
			if (session.baseLayer) {
				const context = session.baseLayer.context;
				const currentClearColor = context.getParameter(context.COLOR_CLEAR_VALUE);
				const currentClearDepth = context.getParameter(context.DEPTH_CLEAR_VALUE);
				const currentClearStencil = context.getParameter(context.STENCIL_CLEAR_VALUE);
				context.clearColor(0.0, 0.0, 0.0, 0.0);
				context.clearDepth(1,0);
				context.clearStencil(0.0);
				context.clear(context.DEPTH_BUFFER_BIT | context.COLOR_BUFFER_BIT | context.STENCIL_BUFFER_BIT );
				context.clearColor(currentClearColor[0], currentClearColor[1], currentClearColor[2], currentClearColor[3]);
				context.clearDepth(currentClearDepth);
				context.clearStencil(currentClearStencil);
			}
		} else {
			if (session.baseLayer) {
				const canvas = session.baseLayer.context.canvas;
				perspective$1(this._projectionMatrix,
					renderState.inlineVerticalFieldOfView,
					canvas.width/canvas.height,
					renderState.depthNear,
					renderState.depthFar);
			}
		}
		if (session.immersive) {
			for (let i = 0; i < this._gamepads.length; ++i) {
				const gamepad = this._gamepads[i];
				const inputSourceImpl = this._gamepadInputSources[i];
				inputSourceImpl.updateFromGamepad(gamepad);
				inputSourceImpl.targetRayMode = 'screen';
				if (inputSourceImpl.primaryButtonIndex !== -1) {
					const primaryActionPressed = gamepad.buttons[inputSourceImpl.primaryButtonIndex].pressed;
					if (primaryActionPressed && !inputSourceImpl.primaryActionPressed) {
						this._gamepadInputSources[0]._active = true;
					} else if (!primaryActionPressed && inputSourceImpl.primaryActionPressed) {
						if (!this._shouldSuppressSelectEvents()) {
							this.dispatchEvent('@@webxr-polyfill/input-select-end', { sessionId: session.id, inputSource: inputSourceImpl.inputSource });
						}
						this._gamepadInputSources[0]._active = false;
					}
				}
			}
		}
		this._runHitTest();
	}
	onFrameEnd(sessionId) {
		const session = this._sessions.get(sessionId);
		if (session.immersive) {
			for (let i = 0; i < this._gamepads.length; ++i) {
				const gamepad = this._gamepads[i];
				const inputSourceImpl = this._gamepadInputSources[i];
				if (inputSourceImpl.primaryButtonIndex !== -1) {
					const primaryActionPressed = gamepad.buttons[inputSourceImpl.primaryButtonIndex].pressed;
					if (primaryActionPressed && !inputSourceImpl.primaryActionPressed && !this._shouldSuppressSelectEvents()) {
						this.dispatchEvent('@@webxr-polyfill/input-select-start', { sessionId: session.id, inputSource: inputSourceImpl.inputSource });
					}
					inputSourceImpl.primaryActionPressed = primaryActionPressed;
				}
			}
		}
		this._frameSession = null;
	}
	requestFrameOfReferenceTransform(type, options) {
		return new Promise((resolve, reject) => {
			const enqueueOrExec = (callback) => {
				if (this._baseFrameSet) {
					callback();
				} else {
					this._frameOfRefRequestsWaiting.push(callback);
				}
			};
			switch (type) {
				case 'viewer':
					enqueueOrExec(() => {
						resolve(this._headModelMatrix);
					});
					return;
				case 'local':
					enqueueOrExec(() => {
						resolve(this._eyeLevelMatrix);
					});
					return;
				case 'local-floor':
					enqueueOrExec(() => {
						resolve(this._stageMatrix);
					});
					return;
				case 'bounded-floor':
				case 'unbounded':
					reject(new Error('not supported ' + type));
					return;
				default:
					reject(new Error('Unsupported frame of reference type ' + type));
					return;
			}
		});
	}
	getViewport(sessionId, eye, layer, target) {
		const { width, height } = layer.context.canvas;
		target.x = 0;
		target.y = 0;
		target.width = width;
		target.height = height;
		return true;
	}
	getProjectionMatrix(eye) {
		return this._projectionMatrix;
	}
	getBasePoseMatrix() {
		if (this._frameSession.immersive) {
			return this._headModelMatrix;
		} else {
			return this._identityMatrix;
		}
	}
	getBaseViewMatrix(eye) {
		if (this._frameSession.immersive) {
			return this._headModelMatrix;
		} else {
			return this._identityMatrix;
		}
	}
	requestStageBounds() {
		return null;
	}
	getInputSources() {
		const inputSources = [];
		for (const inputSourceImpl of this._gamepadInputSources) {
			if (inputSourceImpl._active) {
				inputSources.push(inputSourceImpl.inputSource);
			}
		}
		return inputSources;
	}
	getInputPose(inputSource, coordinateSystem, poseType) {
		for (let i = 0; i < this._gamepadInputSources.length; i++) {
			const inputSourceImpl = this._gamepadInputSources[i];
			if (inputSourceImpl._active && inputSourceImpl.inputSource === inputSource) {
				const fov = 2.0 * Math.atan(1.0 / this._projectionMatrix[5]);
				const halfFov = fov * 0.5;
				const near = this._projectionMatrix[14] / (this._projectionMatrix[10] - 1.0);
				const aspect = this._projectionMatrix[5] / this._projectionMatrix[0];
				const deviceWidth = document.documentElement.clientWidth;
				const deviceHeight = document.documentElement.clientHeight;
				const clientX = this._touches[i].x;
				const clientY = this._touches[i].y;
				const normalizedX = (clientX / deviceWidth) * 2.0 - 1.0;
				const normalizedY = -(clientY / deviceHeight) * 2.0 + 1.0;
				const viewMatrixInverse = invert$3(create$5(), this._headModelMatrix);
				coordinateSystem._transformBasePoseMatrix(viewMatrixInverse, viewMatrixInverse);
				const matrix = identity$3(create$5());
				rotateY$3(matrix, matrix, -normalizedX * halfFov * aspect);
				rotateX$3(matrix, matrix, normalizedY * halfFov);
				matrix[12] = normalizedX * Math.tan(halfFov) * near * aspect;
				matrix[13] = normalizedY * Math.tan(halfFov) * near;
				matrix[14] = -near;
				multiply$5(matrix, viewMatrixInverse, matrix);
				const gamepad = this._gamepads[i];
				const gamepadPose = gamepad.pose;
				getTranslation$1(gamepadPose.position, matrix);
				getRotation$1(gamepadPose.orientation, matrix);
				const pose = inputSourceImpl.getXRPose(coordinateSystem, poseType);
				fromRotationTranslation$1(pose.transform.matrix, gamepadPose.orientation, gamepadPose.position);
				invert$3(pose.transform.inverse.matrix, pose.transform.matrix);
				return pose;
			}
		}
		return null;
	}
	onWindowResize() {
		this._sessions.forEach((value, key) => {
		});
	}
}
const createGamepad = (id, hand, buttonNum, hasPosition) => {
	const buttons = [];
	for (let i = 0; i < buttonNum; i++) {
		buttons.push({
			pressed: false,
			touched: false,
			value: 0.0
		});
	}
	return {
		id: id || '',
		pose: {
			hasPosition: hasPosition,
			position: new Float32Array([0, 0, 0]),
			orientation: new Float32Array([0, 0, 0, 1])
		},
		buttons: buttons,
		hand: hand,
		mapping: 'xr-standard',
		axes: [0, 0]
	};
};
let SESSION_ID = 100;
class Session {
	constructor(mode, enabledFeatures) {
		this.mode = mode;
		this.enabledFeatures = enabledFeatures;
		this.immersive = mode == 'immersive-ar';
		this.ended = null;
		this.baseLayer = null;
		this.id = ++SESSION_ID;
	}
}
class ARWatcher extends ARKitWatcher {
	constructor(arKitWrapper, arKitDevice) {
		super(arKitWrapper);
		this._arKitDevice = arKitDevice;
	}
	handleARKitUpdate(event) {
		this._arKitDevice.setBaseViewMatrix(this._arKitWrapper._cameraTransform);
		this._arKitDevice.setProjectionMatrix(this._arKitWrapper._projectionMatrix);
	}
	handleOnError(...args) {
		console.error('ARKit error', ...args);
	}
	handleUserStoppedAR(event) {
		this._arKitDevice.userEndedSession();
	}
}

const _workingMatrix = create$5();
const _workingMatrix2 = create$5();
WebXRPolyfill.prototype._patchNavigatorXR = function() {
	this.xr = new XRSystem(Promise.resolve(new ARKitDevice(this.global)));
	this.xr._mozillaXRViewer = true;
	Object.defineProperty(this.global.navigator, 'xr', {
		value: this.xr,
		configurable: true,
	});
};
const mobileIndex =  navigator.userAgent.indexOf("Mobile/");
const isWebXRViewer = navigator.userAgent.indexOf("WebXRViewer") !== -1 ||
			((navigator.userAgent.indexOf("iPhone") !== -1 || navigator.userAgent.indexOf("iPad") !== -1)
				&& mobileIndex !== -1 && navigator.userAgent.indexOf("AppleWebKit") !== -1
				&& navigator.userAgent.indexOf(" ", mobileIndex) === -1);
const xrPolyfill =  !isWebXRViewer ? null : new WebXRPolyfill(null, {
	webvr: false,
	cardboard: false
});
let _arKitWrapper = null;
const installAnchorsExtension = () => {
	if (window.XRFrame === undefined) { return; }
	XRFrame.prototype.addAnchor = async function addAnchor(value, referenceSpace) {
		if (!this.session[PRIVATE$15].immersive) {
			return Promise.reject();
		}
		const workingMatrix1 = create$5();
		if (value instanceof Float32Array) {
			return new Promise((resolve, reject) => {
				let localReferenceSpace = this.session[PRIVATE$15]._localSpace;
				copy$5(_workingMatrix, this.getPose(localReferenceSpace, referenceSpace).transform.matrix);
				const anchorInWorldMatrix = multiply$5(create$5(), _workingMatrix, value);
				_arKitWrapper.createAnchor(anchorInWorldMatrix)
					.then(resolve)
					.catch((...params) => {
						console.error('could not create anchor', ...params);
						reject();
					});
			});
		} else {
			return Promise.reject('invalid value passed to addAnchor ' + value);
		}
	};
	XRAnchor.prototype.detach = async function removeAnchor() {
		return new Promise((resolve, reject) => {
			_arKitWrapper.removeAnchor(this);
			resolve();
		});
	};
};
const installHitTestingExtension = () => {
	if (window.XRSession === undefined) { return }
	XRSession$1.prototype.requestHitTestSource = function requestHitTestSource(options = {}) {
		const source = new XRHitTestSource(this, options);
		const device = this[PRIVATE$15].device;
		device.addHitTestSource(source);
		return Promise.resolve(source);
	};
	XRSession$1.prototype.requestHitTestSourceForTransientInput = function requestHitTestSourceForTransientInput() {
		throw new Error('requestHitTestSourceForTransientInput() is not supported yet.');
	};
	XRFrame.prototype.getHitTestResults = function getHitTestResults(hitTestSource) {
		const device = this.session[PRIVATE$15].device;
		const transforms = device.getHitTestResults(hitTestSource);
		const results = [];
		for (const transform of transforms) {
			results.push(new XRHitTestResult(this, transform));
		}
		return results;
	};
	XRFrame.prototype.geetTransientInputHitTestResult = function geetTransientInputHitTestResult() {
		throw new Error('geetTransientInputHitTestResult() is not supported yet.');
	};
};
const installRealWorldGeometryExtension = () => {
	if (window.XRFrame === undefined || window.XRSession === undefined) { return; }
	Object.defineProperty(XRFrame.prototype, 'worldInformation', {
		get: function getWorldInformation() {
			if (!this.session[PRIVATE$15].immersive) {
				throw new Error('Not implemented');
			}
			return  _arKitWrapper.getWorldInformation();
		}
	});
	XRSession$1.prototype.updateWorldSensingState = function UpdateWorldSensingState(options) {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.updateWorldSensingState(options);
	};
};
const installLightingEstimationExtension = () => {
	if (window.XRFrame === undefined) { return; }
	XRFrame.prototype.getGlobalLightEstimate = function () {
		if (!this.session[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.getLightProbe();
	};
	XRFrame.prototype.getGlobalReflectionProbe = function () {
		throw new Error('Not implemented');
	};
};
const installNonstandardExtension = () => {
	if (window.XRSession === undefined) { return; }
	XRSession$1.prototype.nonStandard_setNumberOfTrackedImages = function setNumberOfTrackedImages(count) {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.setNumberOfTrackedImages(count);
	};
	XRSession$1.prototype.nonStandard_createDetectionImage = function createDetectionImage(uid, buffer, width, height, physicalWidthInMeters) {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.createDetectionImage(uid, buffer, width, height, physicalWidthInMeters);
	};
	XRSession$1.prototype.nonStandard_destroyDetectionImage = function destroyDetectionImage(uid) {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.createDetectionImage(uid);
	};
	XRSession$1.prototype.nonStandard_activateDetectionImage = function activateDetectionImage(uid) {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return  _arKitWrapper.activateDetectionImage(uid);
	};
	XRSession$1.prototype.nonStandard_deactivateDetectionImage = function deactivateDetectionImage(uid) {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return  _arKitWrapper.deactivateDetectionImage(uid);
	};
	XRSession$1.prototype.nonStandard_getWorldMap = function getWorldMap() {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.getWorldMap();
	};
	XRSession$1.prototype.nonStandard_setWorldMap = function setWorldMap(worldMap) {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.setWorldMap(worldMap);
	};
	XRSession$1.prototype.nonStandard_getWorldMappingStatus = function getWorldMappingStatus() {
		if (!this[PRIVATE$15].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper._worldMappingStatus;
	};
};
if (xrPolyfill && xrPolyfill.injected && navigator.xr) {
	_arKitWrapper = ARKitWrapper.GetOrCreate();
	ARKitDevice.initStyles();
	if(window.XRSystem) {
		XRSystem.prototype._isSessionSupported = XRSystem.prototype.isSessionSupported;
		XRSystem.prototype._requestSession = XRSystem.prototype.requestSession;
		XRSystem.prototype.isSessionSupported = function (mode) {
			if (!(mode === 'immersive-ar' || mode === 'inline')) return Promise.resolve(false);
			return this._isSessionSupported(mode);
		};
		XRSystem.prototype.requestSession = async function (mode, xrSessionInit) {
			if (!(mode === 'immersive-ar' || mode === 'inline')) {
				throw new DOMException('Polyfill Error: only immersive-ar or inline mode is supported.');
			}
			let session = await this._requestSession(mode, xrSessionInit);
			if (mode === 'immersive-ar') {
				session[PRIVATE$15]._localSpace = await session.requestReferenceSpace('local');
			}
			if (xrSessionInit && xrSessionInit.domOverlay && xrSessionInit.domOverlay.root) {
				session.domOverlayState = {type: 'screen'};
				const device = session[PRIVATE$15].device;
				device.setDomOverlayRoot(xrSessionInit.domOverlay.root);
				device.setActiveXRSession(session);
			}
			return session
		};
	}
	installAnchorsExtension();
	installHitTestingExtension();
	installRealWorldGeometryExtension();
	installLightingEstimationExtension();
	installNonstandardExtension();
	for (const className of Object.keys(API$1)) {
		if (window[className] !== undefined) {
			console.warn(`${className} already defined on global.`);
		} else {
			window[className] = API$1[className];
		}
	}
}

})));
