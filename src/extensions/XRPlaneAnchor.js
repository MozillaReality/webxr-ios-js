import XRAnchor from './XRAnchor.js'

/*
XRPlaneAnchor represents flat surfaces like floors, table tops, or walls.
*/
export default class XRPlaneAnchor extends XRAnchor {
	constructor(transform, uid=null, center, extent, alignment, geometry) {
		super(transform, uid)
		this._center = center
		this._extent = extent
		this._alignment = alignment
		this._geometry = geometry
	}

	get center() { return this._center }
	get extent() { return this._extent }
	get alignment() { return this._alignment }
	get geometry() { return this._geometry }
}
