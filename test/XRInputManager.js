
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
}
