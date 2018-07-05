import XRCoordinateSystem from 'webxr-polyfill/src/api/XRCoordinateSystem'

/*
XRAnchors provide per-frame coordinates which the system attempts to pin "in place".
They may change pose on a per-frame bases as the system refines its map.
*/
export default class XRAnchor extends XRCoordinateSystem {
	constructor(transform, uid=null){
		this._uid = uid || XRAnchor._generateUID()
		this._transform = transform
	}

	get uid(){ return this._uid }

	static _generateUID(){
		return 'anchor-' + new Date().getTime() + '-' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
	}
}