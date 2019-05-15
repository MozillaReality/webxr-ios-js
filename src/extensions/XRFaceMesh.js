/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import XRMesh from './XRMesh.js'
import * as glMatrix from "gl-matrix/src/gl-matrix/common";

/*
 * XRFace Mesh represents flat surfaces like floors, table tops, or walls.
*/
export default class XRFaceMesh extends XRMesh {
    constructor(transform, geometry, blendShapeArray, uid=null, timestamp=0) {
        super(transform, geometry, uid, timestamp)
        this._blendShapes = {}
        this._blendShapesChanged = true
        this._updateBlendShapes(blendShapeArray)
    }
    
    get changed () { return super.changed || this._blendShapesChanged }
	clearChanged() {
		super.clearChanged()
		this._blendShapesChanged = false;
	}	

    _updateBlendShapes(blendShapeArray) {
        for (let i = 0; i < blendShapeNames.length; i++) {
            let j = blendShapeNames[i]
            var a0 = this._blendShapes[j] 
            var b0 = blendShapeArray[i]

            if (Math.abs(a0 - b0) > glMatrix.EPSILON) {
                this._blendShapesChanged = true
                this._blendShapes[j] = b0
            }
        }
    }

	updateFaceData(transform, geometry, blendShapeArray, timestamp) {
        super.updateModelMatrix(transform, timestamp)
        
        // updates to the face mesh only have "vertices" set in geometry.  
        // add vertexCount back
        if (typeof geometry.vertexCount === 'undefined') {
            geometry.vertexCount = geometry.vertices.length / (XRMesh.useGeomArrays() ? 3 : 1)
        }
        this._updateGeometry(geometry)
        this._updateBlendShapes(blendShapeArray)
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
]