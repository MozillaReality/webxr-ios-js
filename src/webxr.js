import WebXRPolyfill from 'webxr-polyfill/src/WebXRPolyfill'
import {PRIVATE} from 'webxr-polyfill/src/api/XRFrameOfReference'

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

import XRHitResult from './extensions/XRHitResult.js'

import ARKitDevice from './arkit/ARKitDevice.js'
import ARKitWrapper from './arkit/ARKitWrapper.js'

const workingMatrix = mat4.create()

// Monkey patch the WebXR polyfill so that it only loads our special XRDevice
WebXRPolyfill.prototype._patchRequestDevice = function(){
    this.xr = new XR(new XRDevice(new ARKitDevice(this.global)))
    Object.defineProperty(this.global.navigator, 'xr', {
      value: this.xr,
      configurable: true,
    })
}

// Install the polyfill
const xrPolyfill = new WebXRPolyfill(null, {
	webvr: false,
	cardboard: false
})

/*
Now install a few proposed AR extensions to the WebXR Device API:
- hit-testing: https://github.com/immersive-web/hit-test/
- anchors: https://github.com/immersive-web/anchors
*/

function xrFrameOfReferenceGetTransformTo(otherFoR){
	console.log('other', otherFoR, PRIVATE, otherFoR[PRIVATE])
	mat4.invert(workingMatrix, otherFoR[PRIVATE].transform)
	let out = mat4.identity(mat4.create())
	mat4.multiply(out, workingMatrix, out)
	return mat4.multiply(out, this[PRIVATE].transform, out)
}

const arKitWrapper = ARKitWrapper.GetOrCreate()

// This will be XRSession.requestHitTest
async function xrSessionRequestHitTest(origin, direction, coordinateSystem) {
	// Promise<FrozenArray<XRHitResult>> requestHitTest(Float32Array origin, Float32Array direction, XRCoordinateSystem coordinateSystem);
	return new Promise((resolve, reject) => {
		// TODO calculate the real normalized screen coordinates
		arKitWrapper.hitTest(0, 0, ARKitWrapper.HIT_TEST_TYPE_ALL).then(hits => {
			console.log('hitso', hits)
			if(coordinateSystem.type === 'stage'){
				resolve(hits.map(hit => {
					return new XRHitResult(hit.world_transform)
				}))
			} else {
				this.requestFrameOfReference('stage').then(stageFoR => {
					const csTransform = stageFoR.getTransformTo(coordinateSystem)
					resolve(hits.map(hit => {
						return new XRHitResult(mat4.multiply(mat4.create(), hit.world_transform, csTransform))
					}))
				}).catch(err => {
					console.error('No stage frame of reference', err)
					reject()
				})
			}
		}).catch((...params) => {
			console.error('Error testing for hits', ...params)
			reject()
		})
	})
}



function installExtensions(){
	if(!navigator.xr) return

	if(window.XRSession){
		XRSession.prototype.requestHitTest = xrSessionRequestHitTest
	}
	if(window.XRFrameOfReference){
		XRFrameOfReference.prototype.getTransformTo = xrFrameOfReferenceGetTransformTo
	}
}

installExtensions()


