
const PI_OVER_180 = Math.PI / 180

/*
A wrapper around the Three renderer and related classes, useful for quick testing.
*/
export default class XREngine {
	constructor(glCanvas, glContext){
		this._glCanvas = glCanvas
		this._glContext = glContext

		const aspectRatio = document.documentElement.offsetWidth / document.documentElement.offsetHeight

		// Dynamically calculate the FOV
		this._camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 10000)
		this._camera.matrixAutoUpdate = false
		this._scene = new THREE.Scene()
		this._scene.add(this._camera)
		this._renderer = new THREE.WebGLRenderer({
			canvas: this._glCanvas,
			context: this._glContext,
			antialias: false,
			alpha: false
		})
		this._renderer.autoClear = false
		this._renderer.setPixelRatio(1)
	}

	startFrame(){
		this._renderer.clear()
	}

	render(viewport, projectionMatrix, viewMatrix){
		this._camera.matrix.fromArray(viewMatrix)
		this._camera.updateMatrixWorld()
		this._camera.projectionMatrix.fromArray(projectionMatrix)

		this._renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
		this._renderer.clearDepth()
		this._renderer.render(this._scene, this._camera)
	}

	endFrame(){}

	get scene(){ return this._scene }
	get camera() { return this._camera }
	get renderer() { return this._renderer }

	get near(){ return this._camera.near }
	get far(){ return this._camera.far }
	get fov(){ return this._camera.fov * PI_OVER_180 }

	addDirectionalLight(color=0xffffff, intensity=0.7, position=[0, 10, 20]){
		const light = new THREE.DirectionalLight(color, intensity)
		light.position.set(...position)
		this._scene.add(light)
		this._scene.add(light.target)
		return light
	}

	addAmbientLight(color=0xffffff, intensity=0.2){
		const light = new THREE.AmbientLight(color, intensity)
		this._scene.add(light)
		return light
	}

	addSphere(position=[0,0,0], size=[0.1, 0.1, 0.1], color=0x00FF00){
		const sphere = new THREE.Mesh(
			new THREE.SphereBufferGeometry(...size),
			new THREE.MeshLambertMaterial({ color: color })
		)
		sphere.position.set(...position)
		this._scene.add(sphere)
		return sphere
	}

	addBox(position=[0,0,0], size=[0.1, 0.1, 0.1], color=0x00FF00){
		const box = new THREE.Mesh(
			new THREE.BoxBufferGeometry(...size),
			new THREE.MeshLambertMaterial({ color: color })
		)
		box.position.set(...position)
		this._scene.add(box)
		return box
	}
}