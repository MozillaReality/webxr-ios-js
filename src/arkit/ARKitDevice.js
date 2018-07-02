import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

import PolyfilledXRDevice from 'webxr-polyfill/src/devices/PolyfilledXRDevice'

import {throttledConsoleLog} from '../lib/throttle.js'

import ARKitWrapper from './ARKitWrapper.js'
import ARKitWatcher from './ARKitWatcher.js'

export default class ARKitDevice extends PolyfilledXRDevice {
	constructor(global){
		super(global)

		this._sessions = new Map()
		this._exclusiveSession = null
		this._gamepadInputSources = {}

		this._basePoseMatrix = mat4.create() // Model and view matrix are the same
		this._projectionMatrix = mat4.create()

		this._fovy = 70
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

	onBaseLayerSet(sessionId, layer){
		const session = this._sessions.get(sessionId)
        session.baseLayer = layer
	}

	supportsSession(options={}){
		return options.exclusive === true
	}

	async requestSession(options={}){
		if(!this.supportsSession(options)){
			console.error('Invalid session options', options)
			return Promise.reject()
		}
		if(this._exclusiveSession !== null){
			console.error('Tried to start a second exclusive session')
			return Promise.reject()
		}

		const session = new Session(options.outputContext || null)
		this._sessions.set(session.id, session)
		this.exclusiveSession = session
		this._arKitWrapper.waitForInit().then(() => {
			this._arKitWrapper.watch()
		})
		return Promise.resolve(session.id)
	}

	requestAnimationFrame(callback){
		window.requestAnimationFrame(callback)
	}

	cancelAnimationFrame(handle){
		window.cancelAnimationFrame(handle)
	}

	onFrameStart(sessionId){
		// TODO
	}

	onFrameEnd(sessionId){
		// TODO
	}

	requestStageBounds(){ return null }

	async requestFrameOfReferenceTransform(type, options){
		// TODO
	}

	endSession(sessionId){
		const session = this._sessions.get(sessionId);
		if (session.ended) return
		session.ended = true
		if(this._exclusiveSession === session){
			this._exclusiveSession = null
			this._arKitWrapper.stop()
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

	getInputSources(){ throw new Error('Not implemented'); }

	getInputPose(inputSource, coordinateSystem){ throw new Error('Not implemented'); }

	onWindowResize(){
		console.log('resize')
	}
}

let SESSION_ID = 100
class Session {
	constructor(outputContext){
		this.outputContext = outputContext
		this.ended = null
		this.baseLayer = null
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

