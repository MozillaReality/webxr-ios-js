import * as mat4 from '/test/libs/gl-matrix/mat4.js'
import * as vec3 from '/test/libs/gl-matrix/vec3.js'

const _workingMatrix1 = mat4.create()
const _workingMatrix2 = mat4.create()
const _workingMatrix3 = mat4.create()

export default class XRInputManager {
	constructor(listener=null, targetElement=document){
		this._listener = listener
		this._handleTouchEvent = this._handleTouchEvent.bind(this);
		targetElement.addEventListener("touchstart", this._handleTouchEvent);
	}

	_normalizeTouchCoordinates(clientX, clientY){
		return [
			clientX / document.documentElement.offsetWidth * 2 - 1,
			-(clientY / document.documentElement.offsetHeight) * 2 + 1
		]
	}

	_handleTouchEvent(ev){
		if(!ev.touches || ev.touches.length == 0) return
		if(!this._listener) return
		this._listener('normalized-touch', {
			normalizedCoordinates: this._normalizeTouchCoordinates(ev.touches[0].clientX, ev.touches[0].clientY)
		})
	}

	/**
	@return [origin {vec3}, direction {vec3}]
	*/
	static convertScreenCoordinatesToRay(normalizedX, normalizedY, near, far, fov){
		let dx = Math.tan(fov * 0.5) * normalizedX
		let dy = Math.tan(fov * 0.5) * normalizedY

		const width = document.documentElement.offsetWidth
		const height = document.documentElement.offsetHeight
		if(width < height){
			dx *= width / height
		} else {
			dy *= height / width
		}

		// Find the near plane intersection
		const nearPoint = [dx * near, dy * near, -1 * near]
		// Find the far plane intersection
		const farPoint = [dx * far,  dy * far,  -1 * far]

		// return the origin and direction
		return [nearPoint, vec3.normalize(farPoint, vec3.subtract(farPoint, farPoint, nearPoint))]
	}
}
