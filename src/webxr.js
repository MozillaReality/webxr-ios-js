import WebXRPolyfill from 'webxr-polyfill'
import ARKitDevice from './arkit/ARKitDevice.js'

// Monkey patch the polyfill so that it only loads our special XRDevice
WebXRPolyfill.prototype._patchRequestDevice = function(){
    this.xr = new XR(new ARKitDevice(this.global))
    Object.defineProperty(this.global.navigator, 'xr', {
      value: this.xr,
      configurable: true,
    })
}

const xrPolyfill = new WebXRPolyfill(null, {
	webvr: false,
	cardboard: false
})
