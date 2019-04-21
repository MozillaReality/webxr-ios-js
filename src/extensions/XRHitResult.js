import XRAnchorOffset from './XRAnchorOffset.js'

export default class XRHitResult {
	constructor(hitMatrix=null, hit=null){
		// store the hit object so we can create an Anchor from it later
		this._hit = hit;  
		this._hitMatrix = hitMatrix || new Float32Array(16)
	}

	get hitMatrix(){
		// readonly attribute Float32Array hitMatrix;
		return this._hitMatrix
	}
}