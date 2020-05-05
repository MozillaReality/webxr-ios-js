/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4';
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3';

import XRDevice from 'webxr-polyfill/src/devices/XRDevice';
import GamepadXRInputSource from 'webxr-polyfill/src/devices/GamepadXRInputSource';
import {PRIVATE as XRSESSION_PRIVATE} from 'webxr-polyfill/src/api/XRSession';

import {throttle} from '../lib/throttle.js';

import ARKitWrapper from './ARKitWrapper.js';
import ARKitWatcher from './ARKitWatcher.js';

export default class ARKitDevice extends XRDevice {
	constructor(global){
		super(global);
		this._throttledLogPose = throttle(this.logPose, 1000);

		this._sessions = new Map();
		this._activeSession = null;     // active ARKit session
		this._frameSession = null;	// session for the current frame

		// A div prepended to body children that will contain the session layer
		this._wrapperDiv = document.createElement('div');
		this._wrapperDiv.setAttribute('class', 'arkit-device-wrapper');

		const insertWrapperDiv = () => {
			document.body.insertBefore(this._wrapperDiv, document.body.firstChild || null);
		};

		if (document.body) {
			insertWrapperDiv();
		} else {
			document.addEventListener('DOMContentLoaded', insertWrapperDiv);
		}

		this._headModelMatrix = mat4.create(); // Model and view matrix are the same
		this._headModelMatrixInverse = mat4.create();

		this._projectionMatrix = mat4.create();
		this._deviceProjectionMatrix = mat4.create();
		this._eyeLevelMatrix = mat4.identity(mat4.create());
		this._stageMatrix = mat4.identity(mat4.create());
		this._stageMatrix[13] = 1.3;
		this._identityMatrix = mat4.identity(mat4.create());
		this._baseFrameSet = false;
		this._frameOfRefRequestsWaiting = [];

		this._depthNear = 0.1;
		this._depthFar = 1000;

		try {
			this._arKitWrapper = ARKitWrapper.GetOrCreate();
			this._arWatcher = new ARWatcher(this._arKitWrapper, this);
		} catch (e) {
			console.error('Error initializing the ARKit wrapper', e);
			this._arKitWrapper = null;
			this._arWatcher = null;
		}

		// hit test

		this._hitTestSources = [];
		this._hitTestResults = new Map();
		this._hitTestResultsForNextFrame = new Map();

		// Input set up
		// Note: This touch input event is not AR kit specifi so that
		// should we move this logic out of ARKitDevice?

		this._gamepads = [];
		this._gamepadInputSources = [];
		this._touches = [];

		const primaryButtonIndex = 0;
		this._gamepads.push(createGamepad('', 'right', 1, true));
		this._gamepadInputSources.push(new GamepadXRInputSource(this, {}, 0));
		// Add active property to handle input as trasient input.
		// Set true only when the screen is touched.
		this._gamepadInputSources[0].active = false;
		this._touches.push({x: -1, y: -1});

		document.addEventListener('touchstart', event => {
			if (!event.touches || event.touches.length == 0) {
				return;
			}
			const touch = event.touches[0];
			this._touches[0].x = touch.clientX;
			this._touches[0].y = touch.clientY;

			const button = this._gamepads[0].buttons[primaryButtonIndex];
			button.pressed = true;
			button.value = 1.0;
		});

		document.addEventListener('touchmove', event => {
			if (!event.touches || event.touches.length == 0) {
				return;
			}
			const touch = event.touches[0];
			this._touches[0].x = touch.clientX;
			this._touches[0].y = touch.clientY;
		});

		document.addEventListener('touchend', event => {
			const button = this._gamepads[0].buttons[primaryButtonIndex];
			button.pressed = false;
			button.value = 0.0;
			this._touches[0].x = -1;
			this._touches[0].y = -1;
		});
	}

	// ARKitDevice specific methods

	static initStyles() {
		const init = () => {
			const styleEl = document.createElement('style');
			document.head.appendChild(styleEl);
			const styleSheet = styleEl.sheet;
			styleSheet.insertRule('.arkit-device-wrapper { z-index: -1; display: none; }', 0);
			styleSheet.insertRule('.arkit-device-wrapper, .xr-canvas { background-color: transparent; position: absolute; top: 0; left: 0; bottom: 0; right: 0; }', 0);
			styleSheet.insertRule('.arkit-device-wrapper, .arkit-device-wrapper canvas { width: 100%; height: 100%; padding: 0; margin: 0; -webkit-user-select: none; user-select: none; }', 0);
		};

		if (document.body) {
			init();
		} else {
			window.addEventListener('DOMContentLoaded', init);
		}
	}

	logPose() {
		console.log('pose', 
			mat4.getTranslation(new Float32Array(3), this._headModelMatrix),
			mat4.getRotation(new Float32Array(4), this._headModelMatrix)
		);
	}

	// HitTest

	addHitTestSource(source) {
		if (!this._hitTestSources.includes(source)) {
			this._hitTestSources.push(source);
		}
	}

	_runHitTest() {
		// - Clear _hitTestResults
		// - Remove inactive hit test sources
		// - Copy the results from _hitTestResultsForNextFrame to _hitTestResults
		//   for active hit test source
		// - Clear _hitTestResultsForNextFrame

		this._hitTestResults.clear();
		let sourceNum = 0;
		for (let i = 0; i < this._hitTestSources.length; i++) {
			const source = this._hitTestSources[i];
			if (source._active) {
				if (source._session[XRSESSION_PRIVATE].ended) {
					source.cancel();
				} else {
					this._hitTestSources[sourceNum++] = source;
					if (this._hitTestResultsForNextFrame.has(source)) {
						this._hitTestResults.set(source, this._hitTestResultsForNextFrame.get(source));
					}
				}
			}
		}
		this._hitTestSources.length = sourceNum;
		this._hitTestResultsForNextFrame.clear();

		if (!this._arKitWrapper) {
			console.error('Hit test requires ARKitWrapper.'); 
			return;
		}

		// Run hit test against all the registered active hit test sources

		for (const source of this._hitTestSources) {
			// Convert from ray direction to screen coordinates 0.0 - 1.0 for iOS HitTest API.
			const proj = vec3.create();
			proj[0] = source._offsetRay.direction.x;
			proj[1] = source._offsetRay.direction.y;
			proj[2] = source._offsetRay.direction.z;
			vec3.transformMat4(proj, proj, this._arKitWrapper._projectionMatrix);
			const x = (proj[0] + 1.0) * 0.5;
			const y = (-proj[1] + 1.0) * 0.5;

			// Perform the hit test.
			// Our hit test is async method so storing the hit test results for next release.
			// Then hit test will be one frame behind but we think it's acceptable so far.
			this._arKitWrapper.hitTest(x, y, ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_GEOMETRY).then(hits => {
				if (!this._hitTestResultsForNextFrame.has(source)) {
					this._hitTestResultsForNextFrame.set(source, []);
				}
				const results = this._hitTestResultsForNextFrame.get(source);
				for (const hit of hits) {
					results.push(new XRRigidTransform(new Float32Array(hit.world_transform)));
				}
			});
		}
	}

	getHitTestResults(source) {
		return this._hitTestResults.has(source) ? this._hitTestResults.get(source) : [];
	}

	// set methods called by ARWatcher when the device data is sent from Apple ARKit

	setProjectionMatrix(matrix) {
		mat4.copy(this._deviceProjectionMatrix, matrix);
	}

	setBaseViewMatrix(matrix) {
		mat4.copy(this._headModelMatrixInverse, matrix);
		mat4.invert(this._headModelMatrix, this._headModelMatrixInverse);

		if (!this._baseFrameSet) {
			this._baseFrameSet = true;
			for (let i = 0; i < this._frameOfRefRequestsWaiting.length; i++) {
				const callback = this._frameOfRefRequestsWaiting[i];
				try {
					callback();
				} catch(e) {
					console.error("finalization of reference frame requests failed: ", e);
				}
			}
			this._frameOfRefRequestsWaiting.length = 0;
		}
	}
		
	// XRDevice methods

	get depthNear() { return this._depthNear; }
	set depthNear(val) { this._depthNear = val; }

	get depthFar() { return this._depthFar; }
	set depthFar(val) { this._depthFar = val; }

	isSessionSupported(mode) {
		// Note: We support only immersive-ar mode for now.
		//       See https://github.com/MozillaReality/webxr-ios-js/pull/34#discussion_r334910337
		return mode === 'immersive-ar' || mode === 'inline';
	}

	/**
	 * @param {string} featureDescriptor
	 * @return {boolean}
	 */
	isFeatureSupported(featureDescriptor) {
		switch(featureDescriptor) {
			case 'viewer': return true;
			case 'local': return true;

			// @TODO: need to support local-floor, bounded and unbounded
			case 'local-floor': return true;
			case 'bounded': return false;
			case 'unbounded': return false;

			case 'worldSensing': return true;
			case 'computerVision': return true;
			case 'alignEUS': return true;
			case 'hit-test': return true;

			default: return false;
		};
	}

	/**
	 * @param {number} sessionId
	 * @param {XRReferenceSpaceType} type
	 * @return {boolean}
	 */
	doesSessionSupportReferenceSpace(sessionId, type) {
		const session = this._sessions.get(sessionId);
		if (session.ended) {
			return false;
		}

		if (!session.enabledFeatures.has(type)) {
			// if the feature isn't supported on this session, return false
			return false;
		}

		// now check it's a valid reference space
		switch(type) {
			case 'viewer': return true;
			case 'local': return true;

			// @TODO: need to support local-floor, bounded and unbounded
			case 'local-floor': return true;
			case 'bounded': return false;
			case 'unbounded': return false;

			default: return false;
		}
	}

	async requestSession(mode, enabledFeatures) {
		if (!this.isSessionSupported(mode)) {
			console.error('Invalid session mode', mode);
			return Promise.reject();
		}

		if (mode === 'inline') {
			const session = new Session(mode, enabledFeatures);

			this._sessions.set(session.id, session);
	
			return Promise.resolve(session.id);
		}

		if (!this._arKitWrapper) {
			console.error('Session requested without an ARKitWrapper');
			return Promise.reject();
		}
		if (this._activeSession !== null) {
			console.error('Tried to start a second active session');
			return Promise.reject();
		}

		const ARKitOptions = {};
		if (enabledFeatures.has("worldSensing")) {
			ARKitOptions.worldSensing = true;
		}
		if (enabledFeatures.has("computerVision")) {
			ARKitOptions.videoFrames = true;
		}
		if (enabledFeatures.has("alignEUS")) {
			ARKitOptions.alignEUS = true;
		}

		await this._arKitWrapper.waitForInit().then(() => {}).catch((...params) => {
			console.error("app failed to initialize: ", ...params);
			return Promise.reject();
		});

		const watchResult = await this._arKitWrapper.watch(ARKitOptions).then((results) => {
			const session = new Session(mode, enabledFeatures);

			this._sessions.set(session.id, session);
			this._activeSession = session;

			this.dispatchEvent('@@webxr-polyfill/vr-present-start', session.id);

			return Promise.resolve(session.id);
		}).catch((...params) => {
			console.error("session request failed: ", ...params);
			return Promise.reject();
		});

		return watchResult;
	}

	onBaseLayerSet(sessionId, layer) {
		const session = this._sessions.get(sessionId);
		const canvas = layer.context.canvas;
		const oldLayer = session.baseLayer;

		session.baseLayer = layer; // XRWebGLLayer

		if (!session.immersive) {
			return;
		}

		if (oldLayer !== null) {
			const oldCanvas = oldLayer.context.canvas;
			this._wrapperDiv.removeChild(oldCanvas);

			oldCanvas.style.width = session.canvasWidth
			oldCanvas.style.height = session.canvasHeight
			oldCanvas.style.display = session.canvasDisplay
			oldCanvas.style.backgroundColor = session.canvasBackground
		}

		session.bodyBackgroundColor = document.body.style.backgroundColor;
		session.bodyBackgroundImage = document.body.style.backgroundImage;
		document.body.style.backgroundColor = "transparent";
		document.body.style.backgroundImage = "none";

		var children = document.body.children;
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child != this._wrapperDiv && child != canvas) {
				var display = child.style.display;
				child._displayChanged = true;
				child._displayWas = display
				child.style.display = "none"
			}
		}

		session.canvasParent = canvas.parentNode
		session.canvasNextSibling = canvas.nextSibling

		// if (canvas._displayChanged) {
		// 	session.canvasDisplay = canvas._displayWas
		// 	canvas._displayWas = ""
		// 	canvas._displayChanged = false;
		// } else {
			session.canvasDisplay = canvas.style.display
		// }
		canvas.style.display = "block"
		session.canvasBackground = canvas.style.backgroundColor
		canvas.style.backgroundColor = "transparent"

		session.canvasWidth = canvas.style.width
		session.canvasHeight = canvas.style.height
		canvas.style.width = "100%";
		canvas.style.height = "100%";

		this._wrapperDiv.appendChild(canvas);
		this._wrapperDiv.style.display = "block";


		// layer.width = layer.context.canvas.width = this._wrapperDiv.clientWidth * window.devicePixelRatio;
		// layer.height = layer.context.canvas.height = this._wrapperDiv.clientHeight * window.devicePixelRatio;
	}

	userEndedSession() {
		if (this._activeSession) {
			let session = this._activeSession
			
			if (session.immersive && !session.ended) {
				this.endSession(session.id)

				this.dispatchEvent('@@webxr-polyfill/vr-present-end', session.id);
			  }	  
		}
	}

	endSession(sessionId) {
		const session = this._sessions.get(sessionId);

		if (!session || session.ended) { return; }
		session.ended = true;

		if (this._activeSession === session) {
			if (session.baseLayer !== null) {
				var children = document.body.children;
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					if (child != this._wrapperDiv) {
						if (child._displayChanged) {
							child.style.display = child._displayWas;
							child._displayWas = "";
							child._displayChanged = false;
						}
					}
				}
		
				const canvas = session.baseLayer.context.canvas;
				this._wrapperDiv.removeChild(canvas);

				if (!session.canvasNextSibling) {
					if (session.canvasParent) {
						// was at the end
						session.canvasParent.appendChild(canvas)
					} else {
						// it wasn't in the hierarchy at all
					}
				} else {
					session.canvasNextSibling.before(canvas)
				}
				session.canvasParent = null;
				session.canvasNextSibling = null;

				canvas.style.width = session.canvasWidth;
				canvas.style.height = session.canvasHeight;
				canvas.style.display = session.canvasDisplay;
				canvas.style.backgroundColor = session.canvasBackground;

				document.body.style.backgroundColor = session.bodyBackgroundColor;
				document.body.style.backgroundImage = session.bodyBackgroundImage;
			}
	
			this._wrapperDiv.style.display = "none";

			this._activeSession = null;
			mat4.identity(this._headModelMatrix);
			this._arKitWrapper.stop();
		}
		this._frameSession = null;

	}

	requestAnimationFrame(callback, ...params) {
		// if (this._activeSession) {
			return this._arKitWrapper.requestAnimationFrame(callback, params);
		// } else {
		// 	return window.requestAnimationFrame(callback, params);
		// }
	}

	cancelAnimationFrame(handle) {
		return this._arKitWrapper.cancelAnimationFrame(handle);
	}

	onFrameStart(sessionId, renderState) {
		const session = this._sessions.get(sessionId);

		this._frameSession = session;

		// If the session is inline make sure the projection matrix matches the 
		// aspect ratio of the underlying WebGL canvas.
		if (session.immersive) {
			mat4.copy(this._projectionMatrix, this._deviceProjectionMatrix);
			// If session is not an inline session, XRWebGLLayer's composition disabled boolean
			// should be false and then framebuffer should be marked as opaque.
			// The buffers attached to an opaque framebuffer must be cleared prior to the
			// processing of each XR animation frame.
			if (session.baseLayer) {
				const context = session.baseLayer.context;
				const currentClearColor = context.getParameter(context.COLOR_CLEAR_VALUE);
				const currentClearDepth = context.getParameter(context.DEPTH_CLEAR_VALUE);
				const currentClearStencil = context.getParameter(context.STENCIL_CLEAR_VALUE);
				context.clearColor(0.0, 0.0, 0.0, 0.0);
				context.clearDepth(1,0);
				context.clearStencil(0.0);
				context.clear(context.DEPTH_BUFFER_BIT | context.COLOR_BUFFER_BIT | context.STENCIL_BUFFER_BIT );
				context.clearColor(currentClearColor[0], currentClearColor[1], currentClearColor[2], currentClearColor[3]);
				context.clearDepth(currentClearDepth);
				context.clearStencil(currentClearStencil);
			}
		} else {
			if (session.baseLayer) {
				const canvas = session.baseLayer.context.canvas;
				// Update the projection matrix.
				mat4.perspective(this._projectionMatrix, 	
					renderState.inlineVerticalFieldOfView, 
					canvas.width/canvas.height, 
					renderState.depthNear, 
					renderState.depthFar);
			}
		}

		// input event

		if (session.immersive) {
			for (let i = 0; i < this._gamepads.length; ++i) {
				const gamepad = this._gamepads[i];
				const inputSourceImpl = this._gamepadInputSources[i];
				inputSourceImpl.updateFromGamepad(gamepad);
				// @TODO: temporal workaround because the polyfill doesn't have a way to set 'screen'.
				//        We should send the feedback to the polyfill.
				inputSourceImpl.targetRayMode = 'screen';
				if (inputSourceImpl.primaryButtonIndex !== -1) {
					const primaryActionPressed = gamepad.buttons[inputSourceImpl.primaryButtonIndex].pressed;
					if (primaryActionPressed && !inputSourceImpl.primaryActionPressed) {
						this._gamepadInputSources[0].active = true;
						// select start event is fired in onFrameEnd().
						// See the comment there for the detail.
					} else if (!primaryActionPressed && inputSourceImpl.primaryActionPressed) {
						this.dispatchEvent('@@webxr-polyfill/input-select-end', { sessionId: session.id, inputSource: inputSourceImpl.inputSource });
						this._gamepadInputSources[0].active = false;
					}
					// New inputSourceImpl.primaryActionPressed is saved in onFrameEnd()
				}
			}
		}

		this._runHitTest();
	}

	onFrameEnd(sessionId) {
		const session = this._sessions.get(sessionId);
		// We handle input event as transient input event.
		// If primary action happens on transient input
		// 1. First fire intputsourceschange event
		// 2. And then fire select start event
		// But in webxr-polyfill.js, inputsourceschange event is fired
		// after onFrameStart() by making an input source active in onFrameStart().
		// So we need to postpone input select start event until onFrameEnd() here.
		// Regarding select and select end events, they should be fired
		// before inputsourceschange event, so ok to be in onFrameStart().
		if (session.immersive) {
			for (let i = 0; i < this._gamepads.length; ++i) {
				const gamepad = this._gamepads[i];
				const inputSourceImpl = this._gamepadInputSources[i];
				if (inputSourceImpl.primaryButtonIndex !== -1) {
					const primaryActionPressed = gamepad.buttons[inputSourceImpl.primaryButtonIndex].pressed;
					if (primaryActionPressed && !inputSourceImpl.primaryActionPressed) {
						this.dispatchEvent('@@webxr-polyfill/input-select-start', { sessionId: session.id, inputSource: inputSourceImpl.inputSource });
					}
					inputSourceImpl.primaryActionPressed = primaryActionPressed;
				}
			}
		}

		this._frameSession = null;
	}

	requestFrameOfReferenceTransform(type, options) {
		return new Promise((resolve, reject) => {
			const enqueueOrExec = (callback) => {
				if (this._baseFrameSet) {
					callback();
				} else {
					this._frameOfRefRequestsWaiting.push(callback);
				}
			};

			switch (type) {
				case 'viewer':
					enqueueOrExec(() => { 
						resolve(this._headModelMatrix);
					});
					return;
				case 'local':
					enqueueOrExec(() => { 
						resolve(this._eyeLevelMatrix);
					});
					return;
				case 'local-floor':
					enqueueOrExec(() => { 
						resolve(this._stageMatrix);
					});
					return;

				case 'bounded-floor':

				// @TODO: Support unbounded reference space.
				// @TODO: Support reset event.
				//        In ARKit, the native origin can change as the user moves around.
				//        In unbounded, the space origin can change. But in other space
				//        such as local and local-floor, if the origin changes, a reset event should
				//        be triggered on the coordinate system (per the spec).
				case 'unbounded':
					reject(new Error('not supported ' + type));
					return;
				default:
					reject(new Error('Unsupported frame of reference type ' + type));
					return;
			}
		});
	}

	getViewport(sessionId, eye, layer, target) {
		// A single viewport that covers the entire screen
		const { width, height } = layer.context.canvas;
		target.x = 0;
		target.y = 0;
		target.width = width;
		target.height = height;
		return true;
	}

	getProjectionMatrix(eye) {
		return this._projectionMatrix;
	}

	// The model and view matrices are the same head-model matrix
	getBasePoseMatrix() {
		if (this._frameSession.immersive) {
			return this._headModelMatrix;
		} else {
			return this._identityMatrix;
		}
	}

	getBaseViewMatrix(eye) {
		if (this._frameSession.immersive) {
			return this._headModelMatrix;
		} else {
			return this._identityMatrix;
		}
	}

	requestStageBounds() {
		return null;
	}

	getInputSources() {
		const inputSources = [];
		for (const inputSourceImpl of this._gamepadInputSources) {
			if (inputSourceImpl.active) {
				inputSources.push(inputSourceImpl.inputSource);
			}
		}
		return inputSources;
	}

	getInputPose(inputSource, coordinateSystem, poseType) {
		for (let i = 0; i < this._gamepadInputSources.length; i++) {
			const inputSourceImpl = this._gamepadInputSources[i];
			if (inputSourceImpl.active && inputSourceImpl.inputSource === inputSource) {
				// @TODO: Support Transient input
				const deviceWidth = document.documentElement.clientWidth;
				const deviceHeight = document.documentElement.clientHeight;
				const clientX = this._touches[i].x;
				const clientY = this._touches[i].y;
				// convert to -1.0 to 1.0
				const normalizedX = (clientX / deviceWidth) * 2.0 - 1.0;
				const normalizedY = -(clientY / deviceHeight) * 2.0 + 1.0;

				// @TODO: Add note about this matrix calculation
				// @TODO: Optimize if possible
				const viewMatrixInverse = mat4.invert(mat4.create(), this._headModelMatrix);
				coordinateSystem._transformBasePoseMatrix(viewMatrixInverse, viewMatrixInverse);
				const matrix = mat4.identity(mat4.create());
				// Assuming FOV is 90 degree @TODO: Remove this constraint
				const near = 0.1; // @TODO: Should be from render state
				const aspect = deviceWidth / deviceHeight;
				matrix[12] = normalizedX * near * aspect;
				matrix[13] = normalizedY * near;
				matrix[14] = -near;
				mat4.multiply(matrix, viewMatrixInverse, matrix);

				const gamepad = this._gamepads[i];
				const gamepadPose = gamepad.pose;
				mat4.getTranslation(gamepadPose.position, matrix);
				mat4.getRotation(gamepadPose.orientation, matrix);

				const pose = inputSourceImpl.getXRPose(coordinateSystem, poseType);
				mat4.fromRotationTranslation(pose.transform.matrix, gamepadPose.orientation, gamepadPose.position);
				mat4.invert(pose.transform.inverse.matrix, pose.transform.matrix);
				return pose;
			}
		}
		return null;
	}

	onWindowResize() {
		this._sessions.forEach((value, key) => {
			// var layer = value.baseLayer
			// layer.width = layer.context.canvas.width = this._wrapperDiv.clientWidth * window.devicePixelRatio;
			// layer.height = layer.context.canvas.height = this._wrapperDiv.clientHeight * window.devicePixelRatio;
		});
	}
}

const createGamepad = (id, hand, buttonNum, hasPosition) => {
	const buttons = [];
	for (let i = 0; i < buttonNum; i++) {
		buttons.push({
			pressed: false,
			touched: false,
			value: 0.0
		});
	}
	return {
		id: id || '',
		pose: {
			hasPosition: hasPosition,
			position: new Float32Array([0, 0, 0]),
			orientation: new Float32Array([0, 0, 0, 1])
		},
		buttons: buttons,
		hand: hand,
		mapping: 'xr-standard',
		axes: [0, 0]
	};
};

let SESSION_ID = 100;
class Session {
	constructor(mode, enabledFeatures) {
		this.mode = mode;
		this.enabledFeatures = enabledFeatures;
		this.immersive = mode == 'immersive-ar';		
		this.ended = null; // boolean
		this.baseLayer = null; // XRWebGLLayer
		this.id = ++SESSION_ID;
	}
}

class ARWatcher extends ARKitWatcher {
	constructor(arKitWrapper, arKitDevice) {
		super(arKitWrapper);
		this._arKitDevice = arKitDevice;
	}

	handleARKitUpdate(event) {
		this._arKitDevice.setBaseViewMatrix(this._arKitWrapper._cameraTransform);
		this._arKitDevice.setProjectionMatrix(this._arKitWrapper._projectionMatrix);
	}

	handleOnError(...args) {
		console.error('ARKit error', ...args);
	}

	handleUserStoppedAR(event) {
		this._arKitDevice.userEndedSession()
	}
}