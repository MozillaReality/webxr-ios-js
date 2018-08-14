import WebXRPolyfill from 'webxr-polyfill/src/WebXRPolyfill'
import {PRIVATE} from 'webxr-polyfill/src/api/XRFrameOfReference'

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'

import XRHitResult from './extensions/XRHitResult.js'

import ARKitDevice from './arkit/ARKitDevice.js'
import ARKitWrapper from './arkit/ARKitWrapper.js'

const _workingMatrix = mat4.create()
const PI_OVER_180 = Math.PI / 180

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

function _xrFrameOfReferenceGetTransformTo(otherFoR){
	return _getTransformTo(this[PRIVATE].transform, otherFoR[PRIVATE].transform)
}

function _getTransformTo(sourceMatrix, destinationMatrix){
	mat4.invert(_workingMatrix, destinationMatrix)
	let out = mat4.identity(mat4.create())
	mat4.multiply(out, _workingMatrix, out)
	return mat4.multiply(out, sourceMatrix, out)
}

const _arKitWrapper = ARKitWrapper.GetOrCreate()

// This will be XRSession.requestHitTest
async function _xrSessionRequestHitTest(origin, direction, coordinateSystem) {
	// Promise<FrozenArray<XRHitResult>> requestHitTest(Float32Array origin, Float32Array direction, XRCoordinateSystem coordinateSystem);

	// ARKit only handles hit testing from the screen, so only head model FoR is accepted
	if(coordinateSystem.type !== 'head-model'){
		return Promise.reject('Only head-model hit testing is supported')
	}

	if(origin[0] != 0.0 && origin[1] != 0.0 && origin[2] != 0.0) {
		return Promise.reject('Platform only supports hit testing with ray origin = [0,0,0]')
	}

	return new Promise((resolve, reject) => {
		const normalizedScreenCoordinates = _convertRayToARKitScreenCoordinates(direction, _arKitWrapper._projectionMatrix)

		console.log('and back', ...normalizedScreenCoordinates)

		// Perform the hit test
		_arKitWrapper.hitTest(...normalizedScreenCoordinates, ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_GEOMETRY).then(hits => {
			if(hits.length === 0) resolve([])
			// Hit results are in the tracker (aka eye-level) coordinate system, so transform them back to head-model since the passed origin and results must be in the same coordinate system
			this.requestFrameOfReference('eye-level').then(eyeLevelFrameOfReference => {
				const csTransform = eyeLevelFrameOfReference.getTransformTo(coordinateSystem)
				//console.log('eye to head', mat4.getTranslation(vec3.create(), csTransform), mat4.getRotation(new Float32Array(4), csTransform))
				resolve(hits.map(hit => {
					const hitInHeadMatrix = mat4.multiply(mat4.create(), hit.world_transform, csTransform)
					console.log('world transform', mat4.getTranslation(vec3.create(), hit.world_transform), mat4.getRotation(new Float32Array(4), hit.world_transform))
					//console.log('head transform', mat4.getTranslation(vec3.create(), hitInHeadMatrix), mat4.getRotation(new Float32Array(4), hitInHeadMatrix))
					return new XRHitResult(hitInHeadMatrix)
				}))
			})
		}).catch((...params) => {
			console.error('Error testing for hits', ...params)
			reject()
		})
	})
}

/**
Take a vec3 direction vector through the screen and return normalized x,y screen coordinates
@param ray {vec3}
@param projectionMatrix {mat4}
@return [x,y] in range [0,1]
*/
function _convertRayToARKitScreenCoordinates(ray, projectionMatrix){
	var proj = vec3.transformMat4(vec3.create(), ray, projectionMatrix)
	console.log('project', ...proj)

	let x = (proj[0] + 1)/2;
	let y = (-proj[1] + 1)/2;

	return [x, y]
}

/**
function _installExtensions(){
	if(!navigator.xr) return

	if(window.XRSession){
		XRSession.prototype.requestHitTest = _xrSessionRequestHitTest
	}
	if(window.XRFrameOfReference){
		XRFrameOfReference.prototype.getTransformTo = _xrFrameOfReferenceGetTransformTo
	}
}

_installExtensions()


