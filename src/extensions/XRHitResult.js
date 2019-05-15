/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

export default class XRHitResult {
	constructor(hitMatrix=null, hit=null, ts){
		// store the hit object so we can create an Anchor from it later
		this._hit = hit;  
		this._timestamp = ts
		this._hitMatrix = mat4.clone(hitMatrix)
	}

	get hitMatrix(){
		// readonly attribute Float32Array hitMatrix;
		return this._hitMatrix
	}

	get timeStamp() { return this._timestamp }
}