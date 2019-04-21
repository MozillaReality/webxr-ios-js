import XRAnchor from './XRAnchor.js'

/*
XRPlaneAnchor represents flat surfaces like floors, table tops, or walls.
*/
export default class XRFaceAnchor extends XRAnchor {
    constructor(transform, uid=null, geometry, blendShapeArray) {
        super(transform, uid)
        this._geometry = geometry
        this._blendShapes = {}
        this.updateBlendShapes(blendShapeArray)
    }

    updateBlendShapes(blendShapeArray) {
        for (let i = 0; i < blendShapeNames.length; i++) {
            this._blendShapes[blendShapeNames[i]] = blendShapeArray[i]
        }
    }

	updateFaceData(geometry, blendShapeArray) {
        this._geometry = geometry
        this.updateBlendShapes(blendShapeArray)
	}

	get blendShapes() { return this._blendShapes }
	get geometry() { return this._geometry }
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