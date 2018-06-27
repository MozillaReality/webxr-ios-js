
const XRInputSource = class {

	get handedness(){
		// readonly attribute XRHandedness handedness
		console.error('TODO')
	}

	get targetRayMode(){
		// readonly attribute XRTargetRayMode targetRayMode
		console.error('TODO')
	}
}

XRInputSource.LEFT = 'left'
XRInputSource.RIGHT = 'right'
XRInputSource.HANDEDNESS = ['', XRInputSource.LEFT_HANDED, XRInputSource.RIGHT_HANDED]

XRInputSource.GAZING = 'gazing'
XRInputSource.POINTING = 'pointing'
XRInputSource.TAPPING = 'tapping'
XRInputSource.TARGET_RAY_MODES = [XRInputSource.GAZING, XRInputSource.POINTING, XRInputSource.TAPPING]

export default XRInputSource


