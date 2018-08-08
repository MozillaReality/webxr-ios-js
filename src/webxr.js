import WebXRPolyfill from 'webxr-polyfill/src/WebXRPolyfill'
import {PRIVATE} from 'webxr-polyfill/src/api/XRFrameOfReference'

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'

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
	mat4.invert(workingMatrix, otherFoR[PRIVATE].transform)
	let out = mat4.identity(mat4.create())
	mat4.multiply(out, workingMatrix, out)
	return mat4.multiply(out, this[PRIVATE].transform, out)
}

const arKitWrapper = ARKitWrapper.GetOrCreate()

// This will be XRSession.requestHitTest
async function xrSessionRequestHitTest(origin, direction, coordinateSystem) {
	// Promise<FrozenArray<XRHitResult>> requestHitTest(Float32Array origin, Float32Array direction, XRCoordinateSystem coordinateSystem);

	// ARKit only handles hit testing from the screen, so only head model FoR is accepted
	if(coordinateSystem.type !== 'head-model'){
		return Promise.reject('Only head-model hit testing is supported')
	}
	return new Promise((resolve, reject) => {
		// TODO get the actual near plane and FOV
		// Calculate the screen coordinates from the origin
		const normalizedScreenCoordinates = convertRayOriginToScreenCoordinates(origin, 0.1, 0.7853981633974483)
		// Perform the hit test
		arKitWrapper.hitTest(...normalizedScreenCoordinates, ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANES).then(hits => {
			// Hit results are in the tracker (aka eye-level) coordinate system, so transform them back to head-model since the passed origin and results must be in the same coordinate system
			this.requestFrameOfReference('eye-level').then(eyeLevelFrameOfReference => {
				const csTransform = eyeLevelFrameOfReference.getTransformTo(coordinateSystem)
				resolve(hits.map(hit => {
					return new XRHitResult(mat4.multiply(mat4.create(), hit.world_transform, csTransform))
				}))
			})
		}).catch((...params) => {
			console.error('Error testing for hits', ...params)
			reject()
		})
	})
}

/**
Take a vec3 point on the screen in world space and return normalized x,y screen coordinates
@param rayOrigin {vec3}
@return [x,y] in range [-1,1]
*/
function convertRayOriginToScreenCoordinates(rayOrigin, near, fov){
	const nearLengthFromCenter = near * Math.tan(fov / 2)
	let x = rayOrigin[0] / nearLengthFromCenter
	let y = rayOrigin[1] / nearLengthFromCenter

	const width = document.documentElement.offsetWidth
	const height = document.documentElement.offsetHeight
	if(width < height){
		x *= height / width
	} else {
		y *= width / height
	}

	return [x, y]
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


