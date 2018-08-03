import XRAnchorOffset from './XRAnchorOffset.js'

export default class XRHitResult {
	constructor(hitMatrix=null){
		this._hitMatrix = hitMatrix || new Float32Array(16)
	}

	get hitMatrix(){
		// readonly attribute Float32Array hitMatrix;
		return this._hitMatrix
	}
}