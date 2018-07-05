import XRAnchorOffset from './XRAnchorOffset.js'

export default class XRHitResult {
	constructor(hitMatrix, anchorOffset=null){
		this._hitMatrix = hitMatrix
		this._anchorOffset = anchorOffset
	}

	get hitMatrix(){
		// readonly attribute Float32Array hitMatrix;
		return this._hitMatrix
	}

	get anchorOffset(){
		// readonly attribute AnchorOffset? anchorOffset;
		return this._anchorOffset
	}
}