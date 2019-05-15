/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

import XRAnchor from './XRAnchor.js'

/*
XRAnchorOffset represents a pose in relation to an XRAnchor
*/
export default class XRAnchorOffset extends XRAnchor {
	constructor(anchor, offset=null){
		super(offset, null)
		this._anchor = anchor
		this._timestamp = anchor.timeStamp
		this._tempArray = new Float32Array(16)
		this._offsetMatrix = mat4.create()
		if (offset) {
			mat4.copy(this._offsetMatrix, offset)
		}
		mat4.multiply(this._transform, anchor.modelMatrix, this._offsetMatrix)

		this._handleAnchorUpdateListener = this._handleAnchorUpdate.bind(this)
		this._notifyOfRemovalListener = this.notifyOfRemoval.bind(this)
		this._handleReplaceAnchorListener = this._handleReplaceAnchor.bind(this)

		anchor.addEventListener("update", this._handleAnchorUpdateListener)
		// just pass removal up the chain
		anchor.addEventListener("removal", this._notifyOfRemovalListener)

		anchor.addEventListener("replaceAnchor", this._handleReplaceAnchorListener)
	}

	// when we create an anchorOffset from a hitTest, the iOS app may not yet have
	// sent the underlying Anchor up in the frame update (i.e., could be a race condition if
	// the hit and plane are created at the same time, perhaps?)
	// so a dummy anchor will be created, and if/when a real one shows up with the same UID
	// we'll update this node
	_handleReplaceAnchor(detail) {
		this._anchor.removeEventListener("update", this._handleAnchorUpdateListener)
		this._anchor.removeEventListener("removal", this._notifyOfRemovalListener)
		this._anchor.removeEventListener("replaceAnchor", this._handleReplaceAnchorListener)

		this._anchor = detail

		this._anchor.addEventListener("update", this._handleAnchorUpdateListener)
		this._anchor.addEventListener("removal", this._notifyOfRemovalListener)
		this._anchor.addEventListener("replaceAnchor", this._handleReplaceAnchorListener)
	}

	_handleAnchorUpdate() {
		mat4.multiply(this._tempArray, this._anchor.modelMatrix, this._offsetMatrix)
		this.updateModelMatrix(this._tempArray, Math.max(this._anchor.timeStamp, this._timestamp))
	}

	get modelMatrix () { return this._transform }

	clearChanged() {
		super.clearChanged();
	}

	get anchor(){ return this._anchor }

	/* A Float32Array(16) representing a column major affine transform matrix */
	get offsetMatrix(){ return this._offsetMatrix }
	set offsetMatrix(array16){
		mat4.copy(this._offsetMatrix, array16)
		this._handleAnchorUpdate()
	}
}
