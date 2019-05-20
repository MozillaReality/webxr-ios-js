/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */

import WebXRPolyfill from 'webxr-polyfill/src/WebXRPolyfill'
import {PRIVATE} from 'webxr-polyfill/src/api/XRFrameOfReference'

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'

import API from './extensions/index';

import ARKitDevice from './arkit/ARKitDevice'
import ARKitWrapper from './arkit/ARKitWrapper'

import XRHitResult from './extensions/XRHitResult'

const _workingMatrix = mat4.create()
const _workingMatrix2 = mat4.create()

// Monkey patch the WebXR polyfill so that it only loads our special XRDevice
WebXRPolyfill.prototype._patchRequestDevice = function(){
	  var _arKitDevice = new ARKitDevice(this.global)
		this.xr = new XR(new XRDevice(_arKitDevice))
		this.xr._mozillaXRViewer = true
    Object.defineProperty(this.global.navigator, 'xr', {
      value: this.xr,
      configurable: true,
    })
}

let mobileIndex =  navigator.userAgent.indexOf("Mobile/") 
let isWebXRViewer = navigator.userAgent.indexOf("WebXRViewer") !== -1 ||
			((navigator.userAgent.indexOf("iPhone") !== -1 ||  navigator.userAgent.indexOf("iPad") !== -1) 
				&& mobileIndex !== -1 && navigator.userAgent.indexOf("AppleWebKit") !== -1 
				&& navigator.userAgent.indexOf(" ", mobileIndex) === -1)

// Install the polyfill IF AND ONLY IF we're running in the WebXR Viewer
const xrPolyfill =  !isWebXRViewer ? null : new WebXRPolyfill(null, {
	webvr: false,
	cardboard: false
})

/*
Now install a few proposed AR extensions to the WebXR Device API:
- hit-testing: https://github.com/immersive-web/hit-test/
- anchors: https://github.com/immersive-web/anchors
*/

// Note from BLAIR:
// I'm ALMOST POSITIVE this is wrong:  we can't assume frames of reference have
// transforms, it's just that we are always giving absolute transforms in this patched
// polyfill, and NOT treating "eye-level" and "head-model" the way they should be.
// All of this will change when the polyfill is updated to the final spec.
function _xrFrameOfReferenceGetTransformTo(otherFoR, out){
	return _getTransformTo(this[PRIVATE].transform, otherFoR[PRIVATE].transform, out)
}

function _getTransformTo(sourceMatrix, destinationMatrix, out){
	mat4.invert(_workingMatrix, destinationMatrix)
	//let out = mat4.identity(mat4.create())
	//mat4.multiply(out, _workingMatrix, out)
	return mat4.multiply(out, sourceMatrix, _workingMatrix)
}

function _updateWorldSensingState (options) {
	return _arKitWrapper.updateWorldSensingState(options)
}

function _getWorldInformation () {
	 return  _arKitWrapper.getWorldInformation()
}

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

		//console.log('and back', ...normalizedScreenCoordinates)

		// Perform the hit test
		_arKitWrapper.hitTest(...normalizedScreenCoordinates, ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_GEOMETRY).then(hits => {
			if(hits.length === 0) resolve([])
			// Hit results are in the tracker (aka eye-level) coordinate system, so transform them back to head-model since the passed origin and results must be in the same coordinate system

			// uncomment if you want one hit, and get rid of map below
			// const hit = _arKitWrapper.pickBestHit(hits)

			this.requestFrameOfReference('eye-level').then(eyeLevelFrameOfReference => {
				eyeLevelFrameOfReference.getTransformTo(coordinateSystem, _workingMatrix)
				//console.log('eye to head', mat4.getTranslation(vec3.create(), csTransform), mat4.getRotation(new Float32Array(4), csTransform))
				resolve(hits.map(hit => {
					mat4.multiply(_workingMatrix2, _workingMatrix, hit.world_transform)
					//console.log('world transform', mat4.getTranslation(vec3.create(), hit.world_transform), mat4.getRotation(new Float32Array(4), hit.world_transform))
					//console.log('head transform', mat4.getTranslation(vec3.create(), hitInHeadMatrix), mat4.getRotation(new Float32Array(4), hitInHeadMatrix))
					return new XRHitResult(_workingMatrix2, hit, _arKitWrapper._timestamp)
				}))
			}).catch((...params) => {
				console.error('Error testing for hits', ...params)
				reject()
			})
		}).catch((...params) => {
			console.error('Error testing for hits', ...params)
			reject()
		})
	})
}

async function /*  Promise<XRAnchor> */ _addAnchor(value, frameOfReference) {
	// value is either
	//  	Float32Array modelMatrix, 
	//		XRHitResult hitResult
	// XRFrameOfReference frameOfReference
	  if (value instanceof XRHitResult) {
			return _arKitWrapper.createAnchorFromHit(value._hit)
			// const hit = value._hit;
			// // if it's a plane
			// if (hit.anchor_transform) {
			// 	// Use the first hit to create an XRAnchorOffset, creating the ARKit XRAnchor as necessary

			// 	let anchor = this._getAnchor(hit.uuid)
			// 	if(anchor === null){
			// 		anchor = new XRAnchor(hit.anchor_transform, hit.uuid)
			// 		this._setAnchor(anchor)
			// 	}

			// 	const offsetPosition = [
			// 		hit.world_transform[12] - hit.anchor_transform[12],
			// 		hit.world_transform[13] - hit.anchor_transform[13],
			// 		hit.world_transform[14] - hit.anchor_transform[14]
			// 	]
			// 	const worldRotation = quat.fromMat3(quat.create(), mat3.fromMat4(mat3.create(), hit.world_transform))
			// 	const q = quat.create();
			// 	const inverseAnchorRotation = quat.invert(q, quat.fromMat3(q, mat3.fromMat4(mat3.create(), hit.anchor_transform)))
			// 	const offsetRotation = quat.multiply(q, worldRotation, inverseAnchorRotation)
			// 	const offset = mat4.fromRotationTranslation(mat4.create(), offsetRotation, offsetPosition)
			// 	const anchorOffset = new XRAnchorOffset(anchor, offset)
			// 	return anchorOffset
			// } else {
			// 	const anchor = new XRAnchor(hit.world_transform, hit.uuid)
			// 	this._setAnchor(anchor)
			// 	return anchor
			// }

		} else if (value instanceof Float32Array) {
			return new Promise((resolve, reject) => {
				// need to get the data in eye-level reference frame.  In this polyfill,
				// 
				this.requestFrameOfReference('eye-level').then(eyeLevelFrameOfReference => {
					frameOfReference.getTransformTo(eyeLevelFrameOfReference, _workingMatrix)
					const anchorInWorldMatrix = mat4.multiply(mat4.create(), _workingMatrix, value)

					_arKitWrapper.createAnchor(anchorInWorldMatrix).then(anchor => {
						resolve(anchor)

					// var anchor = new XRAnchor(anchorInWorldMatrix)
					// _arKitWrapper.addAnchor(anchor.uid, anchor.modelMatrix()).then(detail => { 
					// 	anchor.modelMatrix = detail.transform
					// 	this._setAnchor(anchor)
					// 	resolve(anchor)
					}).catch((...params) => {
						console.error('could not create anchor', ...params)
						reject()
					})
				}).catch((...params) => {
					console.error('could not create eye-level frame of reference', ...params)
					reject()
				})
			});
		}	else {
			return Promise.reject('invalid value passed to addAnchor', value)	
		}
}

async function /*Promise<XRAnchor>*/ _removeAnchor(anchor) {
	return new Promise((resolve, reject) => {
		_arKitWrapper.removeAnchor(anchor);
		resolve();
	})
}


/************************** 
 * iOS specific things, not sure where to put these yet
*/

function _setNumberOfTrackedImages (count) {
	return _arKitWrapper.setNumberOfTrackedImages(count)
}

function _createDetectionImage(uid, buffer, width, height, physicalWidthInMeters) {
	return _arKitWrapper.createDetectionImage(uid, buffer, width, height, physicalWidthInMeters)
}

function _destroyDetectionImage(uid) {
	return _arKitWrapper.createDetectionImage(uid)
}

function _activateDetectionImage(uid) {
	return  _arKitWrapper.activateDetectionImage(uid)
}

function _deactivateDetectionImage(uid) {
	return  _arKitWrapper.deactivateDetectionImage(uid)
}

function _getWorldMap() {
	return _arKitWrapper.getWorldMap()
}

function _setWorldMap(worldMap) {
	return _arKitWrapper.setWorldMap(worldMap)
}

function _getWorldMappingStatus() {
	return _arKitWrapper._worldMappingStatus;
}

// function _getAnchor(uid) {
// 	if (!this._anchors) { return null}
// 	return this._anchors.get(uid) || null
// }

// function _setAnchor(anchor) {
// 	if (!this._anchors) { this._anchors = new Map()	}
// 	this._anchors.set(anchor.uid, anchor)
// }

// function _deleteAnchor(anchor){
// 	if (!this._anchors) { return }
// 	this._anchors.delete(anchor.uid)
// }

/**
Take a vec3 direction vector through the screen and return normalized x,y screen coordinates
@param ray {vec3}
@param projectionMatrix {mat4}
@return [x,y] in range [0,1]
*/
function _convertRayToARKitScreenCoordinates(ray, projectionMatrix){
	var proj = vec3.transformMat4(vec3.create(), ray, projectionMatrix)
	//console.log('project', ...proj)

	let x = (proj[0] + 1)/2;
	let y = (-proj[1] + 1)/2;

	return [x, y]
}

var _arKitWrapper = null

function _installExtensions(){
	if(!navigator.xr) return

	// install our ARKitWrapper
	_arKitWrapper = ARKitWrapper.GetOrCreate()

	ARKitDevice.initStyles()

	if(window.XRSession){
		XRSession.prototype.requestHitTest = _xrSessionRequestHitTest
		XRSession.prototype.updateWorldSensingState = _updateWorldSensingState
		XRSession.prototype.addAnchor = _addAnchor
		// XRSession.prototype._setAnchor = _setAnchor
		// XRSession.prototype._getAnchor = _getAnchor
		// XRSession.prototype._deleteAnchor = _deleteAnchor
		XRSession.prototype.removeAnchor = _removeAnchor


		// use "nonStandard" to signify these are unlikely to be standardized 
		XRSession.prototype.nonStandard_createDetectionImage = _createDetectionImage
		XRSession.prototype.nonStandard_destroyDetectionImage = _destroyDetectionImage
		XRSession.prototype.nonStandard_activateDetectionImage = _activateDetectionImage
		XRSession.prototype.nonStandard_deactivateDetectionImage = _deactivateDetectionImage
		XRSession.prototype.nonStandard_setNumberOfTrackedImages = _setNumberOfTrackedImages
		XRSession.prototype.nonStandard_getWorldMap = _getWorldMap
		XRSession.prototype.nonStandard_setWorldMap = _setWorldMap
		XRSession.prototype.nonStandard_getWorldMappingStatus = _getWorldMappingStatus
	}
	
	if(window.XRFrame) {
		Object.defineProperty(XRFrame.prototype, 'worldInformation', { get: _getWorldInformation });
	}
	if(window.XRFrameOfReference){
		XRFrameOfReference.prototype.getTransformTo = _xrFrameOfReferenceGetTransformTo
	}

	// inject Polyfill globals {
	// Apply classes as globals
	for (const className of Object.keys(API)) {
		if (window[className] !== undefined) {
			console.warn(`${className} already defined on global.`);
		} else {
			window[className] = API[className];
		}
	}

}

if (xrPolyfill && xrPolyfill.injected) {
	_installExtensions()
}
