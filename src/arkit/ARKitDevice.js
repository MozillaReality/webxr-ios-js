import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

import PolyfilledXRDevice from 'webxr-polyfill/src/devices/PolyfilledXRDevice'

import {throttle, throttledConsoleLog} from '../lib/throttle.js'

import ARKitWrapper from './ARKitWrapper.js'
import ARKitWatcher from './ARKitWatcher.js'

export default class ARKitDevice extends PolyfilledXRDevice {
	constructor(global){
		super(global)
		this._throttledLogPose = throttle(this.logPose, 1000)

		this._sessions = new Map()
		this._activeSession = null

		// A div prepended to body children that will contain the session layer
		this._wrapperDiv = document.createElement('div')
		this._wrapperDiv.setAttribute('class', 'arkit-device-wrapper')
		document.addEventListener('DOMContentLoaded', ev => {
			document.body.insertBefore(this._wrapperDiv, document.body.firstChild || null)
		})

		this._basePoseMatrix = mat4.create() // Model and view matrix are the same
		this._projectionMatrix = mat4.create()

		this._eyeLevelMatrix = mat4.create()

		this._depthNear = 0.1
		this._depthFar = 1000

		try{
			this._arKitWrapper = ARKitWrapper.GetOrCreate()
			this._arWatcher = new ARWatcher(this._arKitWrapper, this)
		} catch (e){
			console.error('Error initializing the ARKit wrapper', e)
			this._arKitWrapper = null
			this._arWatcher = null
		}
	}

	get depthNear(){ return this._depthNear }
	set depthNear(val){ this._depthNear = val }

	get depthFar(){ return this._depthFar }
	set depthFar(val){ this._depthFar = val }

	supportsSession(options={}){
		return options.exclusive === false
	}

	async requestSession(options={}){
		if(!this.supportsSession(options)){
			console.error('Invalid session options', options)
			return Promise.reject()
		}
		if(this._activeSession !== null){
			console.error('Tried to start a second active session')
			return Promise.reject()
		}

		const session = new Session(options.outputContext || null)
		this._sessions.set(session.id, session)
		this._activeSession = session
		this._arKitWrapper.waitForInit().then(() => {
			this._arKitWrapper.watch()
		})
		return Promise.resolve(session.id)
	}

	onBaseLayerSet(sessionId, layer){
		this._sessions.get(sessionId).baseLayer = layer // XRWebGLLayer
		this._wrapperDiv.appendChild(layer.context.canvas)
	}

	requestAnimationFrame(callback){
		return window.requestAnimationFrame(callback)
	}

	cancelAnimationFrame(handle){
		return window.cancelAnimationFrame(handle)
	}

	onFrameStart(sessionId){
		// TODO
		//this._throttledLogPose()
	}

	onFrameEnd(sessionId){
		// TODO
	}

	logPose(){
		console.log('pose', 
			mat4.getTranslation(new Float32Array(3), this._basePoseMatrix),
			mat4.getRotation(new Float32Array(4), this._basePoseMatrix)
		)
	}

	async requestFrameOfReferenceTransform(type, options){
		switch(type){
			case 'eyeLevel':
				return this._eyeLevelMatrix
			default:
				throw new Error('Unsupported frame of reference type', type)
		}
	}

	endSession(sessionId){
		const session = this._sessions.get(sessionId);
		if (session.ended) return
		session.ended = true
		if(this._activeSession === session){
			this._activeSession = null
			this._arKitWrapper.stop()
		}
		if(session.baseLayer !== null){
			this._wrapperDiv.removeChild(session.baseLayer.context.canvas)
		}
	}

	getViewport(sessionId, eye, layer, target){
		// A single viewport that covers the entire screen
		const { width, height } = layer.context.canvas
		target.x = 0
		target.y = 0
		target.width = width
		target.height = height
		return true
	}

	getProjectionMatrix(eye){
		return this._projectionMatrix
	}

	setProjectionMatrix(matrix){
		mat4.copy(this._projectionMatrix, matrix)
	}

	// The model and view matrices are the same
	getBasePoseMatrix(){
		return this._basePoseMatrix
	}
	getBaseViewMatrix(eye){
		return this._basePoseMatrix
	}

	setBaseViewMatrix(matrix){
		mat4.copy(this._basePoseMatrix, matrix)
	}

	requestStageBounds(){
		return null
	}

	getInputSources(){
		return []
	}

	getInputPose(inputSource, coordinateSystem){
		return null
	}

	onWindowResize(){}
}

let SESSION_ID = 100
class Session {
	constructor(outputContext){
		this.ended = null // boolean
		this.outputContext = outputContext // XRPresentationContext
		this.baseLayer = null // XRWebGLLayer
		this.id = ++SESSION_ID
	}
}

class ARWatcher extends ARKitWatcher {
	constructor(arKitWrapper, arKitDevice){
		super(arKitWrapper)
		this._arKitDevice = arKitDevice
	}
	handleARKitUpdate(event){
		const cameraTransformMatrix = this._arKitWrapper.getData('camera_transform')
		if (cameraTransformMatrix) {
			this._arKitDevice.setBaseViewMatrix(cameraTransformMatrix)
		} else {
			console.log('no camera transform', this._arKitWrapper.rawARData)
		}

		const cameraProjectionMatrix = this._arKitWrapper.getData('projection_camera')
		if(cameraProjectionMatrix){
			this._arKitDevice.setProjectionMatrix(cameraProjectionMatrix)
		} else {
			console.log('no projection camera', this._arKitWrapper.rawARData)
		}
	}
	handleOnError(...args){
		console.error('ARKit error', ...args)
	}
}

