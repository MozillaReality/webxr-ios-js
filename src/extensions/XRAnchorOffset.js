import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

import XRAnchor from './XRAnchor.js'

/*
XRAnchorOffset represents a pose in relation to an XRAnchor
*/
export default class XRAnchorOffset {
	constructor(anchorUID, poseMatrix=null){
		this._anchorUID = anchorUID
		this._tempArray = new Float32Array(16)
		this._poseMatrix = poseMatrix || mat4.create()
	}

	get anchorUID(){ return this._anchorUID }

	/* A Float32Array(16) representing a column major affine transform matrix */
	get poseMatrix(){ return this._poseMatrix }
	set poseMatrix(array16){
		mat4.copy(this._poseMatrix, array16)
	}

	/* returns a Float32Array(3) representing an x, y, z position from this.poseMatrix */
	get position(){
		return mat4.getTranslation(new Float32Array(3), this._poseMatrix)
	}

	/* returns a Float32Array(4) representing x, y, z, w of a quaternion from this.poseMatrix */
	get orientation(){
		return mat4.getRotation(new Float32Array(4), this._poseMatrix)
	}

	/* Return a transform matrix that is offset by this XRAnchorOffset.poseMatrix relative to coordinateSystem */
	getOffsetTransform(anchor, coordinateSystem){
		const transformToAnchor = coordinateSystem.getTransformTo(anchor)
		if(transformToAnchor === null) return null
		return mat4.multiply(this._tempArray, this._poseMatrix, transformToAnchor)
	}
}
