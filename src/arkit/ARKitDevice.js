import PolyfilledXRDevice from 'webxr-polyfill/src/devices/PolyfilledXRDevice'

export default class ARKitDevice extends PolyfilledXRDevice {
	constructor(global) {
		super(global)
		this._name = 'ARKitDevice'
	}
}