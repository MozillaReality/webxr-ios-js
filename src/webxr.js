import WebXRPolyfill from 'webxr-polyfill'

import XRHitResult from './extensions/XRHitResult.js'

import ARKitDevice from './arkit/ARKitDevice.js'

// Monkey patch the WebXR polyfill so that it only loads our special XRDevice
WebXRPolyfill.prototype._patchRequestDevice = function(){
    this.xr = new XR(new XRDevice(new ARKitDevice(this.global)))
    Object.defineProperty(this.global.navigator, 'xr', {
      value: this.xr,
      configurable: true,
    })
}
const xrPolyfill = new WebXRPolyfill(null, {
	webvr: false,
	cardboard: false
})

/*
Now install a few proposed AR extensions to the WebXR Device API:
- hit-testing: https://github.com/immersive-web/hit-test/
- anchors: https://github.com/immersive-web/anchors
*/

// This will be XRSession.requestHitTest
async function xrSessionRequestHitTest(origin, direction, coordinateSystem){
	// Promise<FrozenArray<XRHitResult>> requestHitTest(Float32Array origin, Float32Array direction, XRCoordinateSystem coordinateSystem);
	console.log('TBD requesting hit test', origin, direction, coordinateSystem)
	return []
}

function installExtensions(){
	if(!navigator.xr) return

	if(!window.XRSession) return
	XRSession.prototype.requestHitTest = xrSessionRequestHitTest
	

}

installExtensions()

console.log('installed')
