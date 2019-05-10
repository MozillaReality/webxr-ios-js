/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import XRMesh from './XRMesh.js'
import * as vec4 from "gl-matrix/src/gl-matrix/vec4";
import * as vec3 from "gl-matrix/src/gl-matrix/vec3";
import * as glMatrix from "gl-matrix/src/gl-matrix/common";

/*
 * XRPlaneMesh represents flat surfaces like floors, table tops, or walls.
*/
export default class XRPlaneMesh extends XRMesh {
	constructor(transform, center, extent, alignment, geometry, uid=null, timestamp=0) {
		super(transform, null, uid, timestamp)
		this._center = center	 // [x, y, z] relative to origin of plane
		this._extent = extent    // [x, 0, z] of size in plane coordinates
		this._alignment = alignment

		this._planeFeatureChanged = true  // center, extent changed

		this._yAxis = vec4.fromValues(0,1,0, 0)
        this._normal = vec4.create()

		/* Plane geometry comes with the usual, plus:
        
		boundaryVertexCount
		boundaryVertices:  array[boundaryVertexCount] of [x,y,z] elements
		*/		
		this._boundaryVerticesChanged = true
		this._boundaryVertices = []

		// call here, we want our method called, and 
		this._geometry = geometry
		this._updateGeometry(this._geometry)
	}

    get changed () { return super.changed || this._planeFeatureChanged }

	clearChanged() {
		super.clearChanged()
		this._planeFeatureChanged = false;
	}	

	updatePlaneData(transform, center, extent, alignment, geometry, timestamp) {
		super.updateModelMatrix(transform, timestamp)
		if (!vec3.equals(this._center, center) || !vec3.equals(this._extent, extent) || 
		 	this._alignment) {
			this._center = center
			this._extent = extent
			this._alignment = alignment
			this._planeFeatureChanged = true
		}
		this._updateGeometry(geometry)
	}

	get center() { return this._center }
	get extent() { return this._extent }
	get alignment() { return this._alignment }

	get boundaryVertices () { return this._boundaryVertices }
	get boundaryVerticesChanged () { return this._boundaryVerticesChanged }
	get boundaryVertexCount () { return this._boundaryVertices.length }

	_updateGeometry(geometry) {
		super._updateGeometry(geometry)
		let g = geometry

		// compute normals from face normal
		const n = vec4.transformMat4(this._normal, this._yAxis, this._transform)
		const nx = n[0], ny = n[1], nz = n[2]			

		let currentVertexIndex = 0
		if (this._boundaryVertices.length != g.boundaryVertexCount * 3) {
			this._boundaryVerticesChanged = true
			this._boundaryVertices = new Float32Array( g.vertexCount * 3 );

			this._vertexNormalsChanged = true
			this._vertexNormals = new Float32Array( g.vertexCount * 3 );
		} else {
			this._vertexNormalsChanged = (Math.abs(this._vertexNormals[0] - nx) > glMatrix.EPSILON || 
					Math.abs(this._vertexNormals[1] - ny) > glMatrix.EPSILON || 
					Math.abs(this._vertexNormals[2] - nz) > glMatrix.EPSILON) 

			if (this._useGeomArrays) {
                this._vertexPositionsChanged = !XRMesh.arrayFuzzyEquals(this._boundaryVertices, g.boundaryVertices)
            } else {
                this._boundaryVerticesChanged = false
                currentVertexIndex = 0
                for ( var i = 0, l = g.vertexCount; i < l; i++ ) {
                    if (Math.abs(this._boundaryVertices[currentVertexIndex++] - g.boundaryVertices[i].x) > glMatrix.EPSILON ||
                        Math.abs(this._boundaryVertices[currentVertexIndex++] - g.boundaryVertices[i].y) > glMatrix.EPSILON ||
                        Math.abs(this._boundaryVertices[currentVertexIndex++] - g.boundaryVertices[i].z) > glMatrix.EPSILON) 
                    {
                        this._boundaryVerticesChanged = true
                        break
                    }
				}
			}
		}

		if (this._boundaryVerticesChanged) {
            if (this._useGeomArrays) {
                this._boundaryVertices.set(g.boundaryVertices)
            } else {
				currentVertexIndex = 0
				for (let vertex of g.boundaryVertices) {
					this._boundaryVertices[currentVertexIndex++] = vertex.x
					this._boundaryVertices[currentVertexIndex++] = vertex.y
					this._boundaryVertices[currentVertexIndex++] = vertex.z
				}
			}
		} 

		if (this._vertexNormalsChanged) {
			currentVertexIndex = 0
			for (var i = 0; i < g.vertexCount; i++) {
				this._vertexNormals[currentVertexIndex++] = nx
				this._vertexNormals[currentVertexIndex++] = ny
				this._vertexNormals[currentVertexIndex++] = nz
			}
		}
	}
}
