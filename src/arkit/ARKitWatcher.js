import ARKitWrapper from './ARKitWrapper.js'

export default class ARKitWatcher {
	constructor(arKitWrapper){
		this._subscribed = false
		this._arKitWrapper = arKitWrapper
		this.subscribe()
	}

	subscribe(){
		if(this._subscribed) return
		this._subscribed = true
		this._arKitWrapper.addEventListener(ARKitWrapper.INIT_EVENT, this.handleARKitInit.bind(this))
		this._arKitWrapper.addEventListener(ARKitWrapper.WATCH_EVENT, this.handleARKitUpdate.bind(this))
		this._arKitWrapper.addEventListener(ARKitWrapper.WINDOW_RESIZE_EVENT, this.handleARKitWindowResize.bind(this))
		this._arKitWrapper.addEventListener(ARKitWrapper.ON_ERROR, this.handleOnError.bind(this))
		this._arKitWrapper.addEventListener(ARKitWrapper.AR_TRACKING_CHANGED, this.handleArTrackingChanged.bind(this))
		this._arKitWrapper.addEventListener(ARKitWrapper.COMPUTER_VISION_DATA, this.handleComputerVisionData.bind(this))
	}

	// Ancestor classes can override these functions to handle events
	handleARKitInit(){}
	handleARKitUpdate(){}
	handleARKitWindowResize(){}
	handleOnError(){}
	handleArTrackingChanged(){}
	handleComputerVisionData(){}
}