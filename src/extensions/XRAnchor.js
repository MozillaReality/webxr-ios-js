import EventTarget from 'webxr-polyfill/src/lib/EventTarget'
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'

/*
XRAnchors provide per-frame coordinates which the system attempts to pin "in place".
They may change pose on a per-frame bases as the system refines its map.
*/
export default class XRAnchor extends EventTarget {
	constructor(transform, uid=null, timestamp = 0){
		super();
		this._uid = uid || XRAnchor._generateUID()
		this._transform = mat4.clone(transform)
		this._timestamp = timestamp
		this._poseChanged = true
	}

	get timeStamp () { return this._timestamp }
	get changed () { return this._poseChanged }
	
	clearChanged() {
		this._poseChanged = false;
	}

	get modelMatrix () {  return this._transform };

	updateModelMatrix (transform, timestamp) { 
		this._timestamp = timestamp

		if (!mat4.equals(this._transform, transform)) {
			this._poseChanged = true

			// don't know if the transform is a FloatArray32
			for ( var i = 0; i < 16; i ++ ) {
				this._transform[ i ] = transform[ i ];
			}
			try {
				this.dispatchEvent( "update", { source: this })
			} catch(e) {
				console.error('XRAnchor update event error', e)
			}
		}	
	}

	notifyOfRemoval() {
		try {
			this.dispatchEvent( "remove", { source: this })
		} catch(e) {
			console.error('XRAnchor removed event error', e)
		}
	}

	/* returns a Float32Array(3) representing an x, y, z position from this.poseMatrix */
	get position(){
		return mat4.getTranslation(new Float32Array(3), this._poseMatrix)
	}

	/* returns a Float32Array(4) representing x, y, z, w of a quaternion from this.poseMatrix */
	get orientation(){
		return mat4.getRotation(new Float32Array(4), this._poseMatrix)
	}

	get uid(){ return this._uid }

	static _generateUID(){
		return 'anchor-' + new Date().getTime() + '-' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
	}
}

// need to implement events
	// // Events
	// attribute EventHandler onupdate;
