import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

import XRAnchor from './XRAnchor.js'

/*
XRAnchorOffset represents a pose in relation to an XRAnchor
*/
export default class XRAnchorOffset extends XRAnchor {
	constructor(anchor, offset=null){
		super(offset)
		this._anchor = anchor
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
		this._anchor = detail

		this._anchor.deleteEv("update", this._handleAnchorUpdateListener)
		this._anchor.addEventListener("removal", this._notifyOfRemovalListener)
		this._anchor.addEventListener("replaceAnchor", this._handleReplaceAnchorListener)

		this._anchor.addEventListener("update", this._handleAnchorUpdateListener)
		this._anchor.addEventListener("removal", this._notifyOfRemovalListener)
		this._anchor.addEventListener("replaceAnchor", this._handleReplaceAnchorListener)
	}

	_handleAnchorUpdate() {
		mat4.multiply(this._tempArray, anchor.modelMatrix, this._offsetMatrix)
		this.modelMatrix = this._tempArray
		// pass update up the chain
		this.notifyOfRemoval()
	}

	get modelMatrix () { return this._transform }
	set modelMatrix (transform) { 
		throw new Error("can't set the modelMatrix on XRAnchorOffset")
	}

	get anchor(){ return this._anchor }

	/* A Float32Array(16) representing a column major affine transform matrix */
	get offsetMatrix(){ return this._offsetMatrix }
	set offsetMatrix(array16){
		mat4.copy(this._offsetMatrix, array16)
	}
}
