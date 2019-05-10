/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import * as mat4 from "gl-matrix/src/gl-matrix/mat4";
import * as quat from "gl-matrix/src/gl-matrix/quat";
import * as vec3 from "gl-matrix/src/gl-matrix/vec3";
import * as glMatrix from "gl-matrix/src/gl-matrix/common";

/**
* The result of a raycast into the AR world encoded as a transform matrix.
* This structure has a single property - modelMatrix - which encodes the
* translation of the intersection of the hit in the form of a 4x4 matrix.
* @constructor
*/
const VRHit = class {
	constructor(){
		this.modelMatrix = new Float32Array(16);
	}
}

/**
* Get intersection array with planes ARKit detected for the screen coords.
*
* @param {number} x The x coordinate in normalized screen space [0,1].
* @param {number} y The y coordinate in normalized screen space [0,1].
*
* @return {!Array<VRHit>} The array of hits sorted based on distance.
*/
function hitTestNoAnchor(x, y, planes, projectionMatrix, viewMatrix) {
	// Coordinates must be in normalized screen space.
	if (x < 0 || x > 1 || y < 0 || y > 1) {
		throw new Error("hitTest - x and y values must be normalized [0,1]!")
	}

	var hits = [];
	// If there are no anchors detected, there will be no hits.
	if (!planes || planes.length == 0) {
		return hits;
	}

	// Create a ray in screen space for the hit test ([-1, 1] with y flip).
	vec3.set(hitVars.rayStart, 2 * x - 1, 2 * (1 - y) - 1, 0);
	vec3.set(hitVars.rayEnd, 2 * x - 1, 2 * (1 - y) - 1, 1);

	// Set the projection matrix.
	setMat4FromArray(hitVars.projectionMatrix, projectionMatrix);

	// Set the model view matrix.
	setMat4FromArray(hitVars.modelViewMatrix, viewMatrix);

	// Combine the projection and model view matrices.
	mat4.multiply(
		hitVars.projViewMatrix,
		hitVars.projectionMatrix,
		hitVars.modelViewMatrix
	);
	// Invert the combined matrix because we need to go from screen -> world.
	mat4.invert(hitVars.projViewMatrix, hitVars.projViewMatrix);

	// Transform the screen-space ray start and end to world-space.
	vec3.transformMat4(
		hitVars.worldRayStart,
		hitVars.rayStart,
		hitVars.projViewMatrix
	);
	vec3.transformMat4(
		hitVars.worldRayEnd,
		hitVars.rayEnd,
		hitVars.projViewMatrix
	);

	// Subtract start from end to get the ray direction and then normalize.
	vec3.subtract(
		hitVars.worldRayDir,
		hitVars.worldRayEnd,
		hitVars.worldRayStart
	);
	vec3.normalize(hitVars.worldRayDir, hitVars.worldRayDir);

	// Go through all the anchors and test for intersections with the ray.
	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i];
		// Get the anchor transform.
		setMat4FromArray(hitVars.planeMatrix, plane.modelMatrix);

		// Get the position of the anchor in world-space.
		vec3.set(
			hitVars.planeCenter,
			plane.center.x,
			plane.center.y,
			plane.center.z
		);
		vec3.transformMat4(
			hitVars.planePosition,
			hitVars.planeCenter,
			hitVars.planeMatrix
		);

		hitVars.planeAlignment = plane.alignment

		// Get the plane normal.
		if (hitVars.planeAlignment === 0) {
			vec3.set(hitVars.planeNormal, 0, 1, 0);
		} else {
			vec3.set(hitVars.planeNormal, hitVars.planeMatrix[4], hitVars.planeMatrix[5], hitVars.planeMatrix[6]);
		}

		// Check if the ray intersects the plane.
		var t = rayIntersectsPlane(
			hitVars.planeNormal,
			hitVars.planePosition,
			hitVars.worldRayStart,
			hitVars.worldRayDir
		);

		// if t < 0, there is no intersection.
		if (t < 0) {
			continue;
		}

		// Calculate the actual intersection point.
		vec3.scale(hitVars.planeIntersection, hitVars.worldRayDir, t);
		vec3.add(
			hitVars.planeIntersection,
			hitVars.worldRayStart,
			hitVars.planeIntersection
		);
		// Get the plane extents (extents are in plane local space).
		vec3.set(hitVars.planeExtent, plane.extent[0], 0, plane.extent[1]);

		////////////////////////////////////////////////
		mat4.getRotation(hitVars.planeQuaternion, hitVars.planeMatrix)

		// Test by converting intersection into plane-space.

		mat4.invert(hitVars.planeMatrix, hitVars.planeMatrix);
		vec3.transformMat4(
			hitVars.planeIntersectionLocal,
			hitVars.planeIntersection,
			hitVars.planeMatrix
		);

		// Check if intersection is outside of the extent of the anchor.
		// Tolerance is added to match the behavior of the native hitTest call.
		var tolerance = 0.0075;
		if (
			Math.abs(hitVars.planeIntersectionLocal[0]) >
			hitVars.planeExtent[0] / 2 + tolerance
		) {
			continue;
		}
		if (
			Math.abs(hitVars.planeIntersectionLocal[2]) >
			hitVars.planeExtent[2] / 2 + tolerance
		) {
			continue;
		}

		////////////////////////////////////////////////

		// The intersection is valid - create a matrix from hit position.
		//mat4.fromTranslation(hitVars.planeHit, hitVars.planeIntersection);
		mat4.fromRotationTranslation(hitVars.planeHit, hitVars.planeQuaternion, hitVars.planeIntersection);
		var hit = new VRHit();
		for (var j = 0; j < 16; j++) {
			hit.modelMatrix[j] = hitVars.planeHit[j];
		}
		hit.i = i;
		hits.push(hit);
	}

	// Sort the hits by distance.
	hits.sort(sortFunction);
	return hits;
}


/**
* Cached vec3, mat4, and quat structures needed for the hit testing to
* avoid generating garbage.
* @type {Object}
*/
const hitVars = {
	rayStart: vec3.create(),
	rayEnd: vec3.create(),
	cameraPosition: vec3.create(),
	cameraQuaternion: quat.create(),	
	modelViewMatrix: mat4.create(),
	projectionMatrix: mat4.create(),
	projViewMatrix: mat4.create(),
	worldRayStart: vec3.create(),
	worldRayEnd: vec3.create(),
	worldRayDir: vec3.create(),
	planeMatrix: mat4.create(),
	planeExtent: vec3.create(),
	planePosition: vec3.create(),
	planeCenter: vec3.create(),
	planeNormal: vec3.create(),
	planeIntersection: vec3.create(),
	planeIntersectionLocal: vec3.create(),
	planeHit: mat4.create(),
	planeQuaternion: quat.create()
};

/**
* Sets the given mat4 from the given float[16] array.
*
* @param {!mat4} m The mat4 to populate with values.
* @param {!Array<number>} a The source array of floats (must be size 16).
*/
const setMat4FromArray = function(m, a) {
 mat4.set(m, ...a)
};

/**
* Tests whether the given ray intersects the given plane.
*
* @param {!vec3} planeNormal The normal of the plane.
* @param {!vec3} planePosition Any point on the plane.
* @param {!vec3} rayOrigin The origin of the ray.
* @param {!vec3} rayDirection The direction of the ray (normalized).
* @return {number} The t-value of the intersection (-1 for none).
*/
function rayIntersectsPlane(planeNormal, planePosition, rayOrigin, rayDirection){
	const rayToPlane = vec3.create();
	// assuming vectors are all normalized
	const denom = vec3.dot(planeNormal, rayDirection);
	vec3.subtract(rayToPlane, planePosition, rayOrigin);
	return vec3.dot(rayToPlane, planeNormal) / denom;
}

/**
* Sorts based on the distance from the VRHits to the camera.
*
* @param {!VRHit} a The first hit to compare.
* @param {!VRHit} b The second hit item to compare.
* @returns {number} -1 if a is closer than b, otherwise 1.
*/
function sortFunction(a, b) {
	// Get the matrix of hit a.
	setMat4FromArray(hitVars.planeMatrix, a.modelMatrix);
	// Get the translation component of a's matrix.
	mat4.getTranslation(hitVars.planeIntersection, hitVars.planeMatrix);
	// Get the distance from the intersection point to the camera.
	var distA = vec3.distance(
		hitVars.planeIntersection,
		hitVars.cameraPosition
	);

	// Get the matrix of hit b.
	setMat4FromArray(hitVars.planeMatrix, b.modelMatrix);
	// Get the translation component of b's matrix.
	mat4.getTranslation(hitVars.planeIntersection, hitVars.planeMatrix);
	// Get the distance from the intersection point to the camera.
	var distB = vec3.distance(
		hitVars.planeIntersection,
		hitVars.cameraPosition
	);

	// Return comparison of distance from camera to a and b.
	return distA < distB ? -1 : 1;
}

export { hitTestNoAnchor }
