import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

import PolyfilledXRDevice from 'webxr-polyfill/src/devices/PolyfilledXRDevice'

import ARKitWrapper from './ARKitWrapper.js'

let SESSION_ID = 100
class Session {
	constructor(outputContext){
		this.outputContext = outputContext
		this.ended = null
		this.baseLayer = null
		this.id = ++SESSION_ID
	}
}

export default class ARKitDevice extends PolyfilledXRDevice {
	constructor(global){
		super(global)

		this._sessions = new Map()
		this._exclusiveSession = null
		this._baseModelMatrix = mat4.create()
		this._gamepadInputSources = {}
		this._tempVec3 = new Float32Array(3)

		this._fovy = 70
		this._depthNear = 0.1
		this._depthFar = 1000

		try{
			this._arKitWrapper = ARKitWrapper.GetOrCreate()
		} catch (e){
			console.error('Error initializing the ARKit wrapper', e)
			this._arKitWrapper = null
		}

	}

	get depthNear(){ return this._depthNear }

	set depthNear(val){ this._depthNear = val }

	get depthFar(){ return this._depthFar }

	set depthFar(val){ this._depthFar = val }

	onBaseLayerSet(sessionId, layer){
		const session = this.sessions.get(sessionId)
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
		this.sessions.set(session.id, session)
		this.exclusiveSession = session

		// TODO start ARKit

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
		const session = this.sessions.get(sessionId);
		if (session.ended) return
		session.ended = true
		if(this._exclusiveSession === session){
			this._exclusiveSession = null
		}

		// TODO shut down ARKit
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

	getProjectionMatrix(eye){ throw new Error('Not implemented'); }

	getBasePoseMatrix(){ throw new Error('Not implemented'); }

	getBaseViewMatrix(eye){ throw new Error('Not implemented'); }

	getInputSources(){ throw new Error('Not implemented'); }

	getInputPose(inputSource, coordinateSystem){ throw new Error('Not implemented'); }

	onWindowResize(){
		console.log('resize')
	}
}