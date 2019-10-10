const REALAPI_URL = 'https://raw.githack.com/takahirox/webxr-ios-js/PolyfillUpdateWIP/dist/webxr.js';

// @TODO: Delete FakeXR class definition when the polyfill is loaded (possible?)
class FakeXR {
	isSessionSupported(mode) {
		return Promise.resolve(mode === 'inline' || mode === 'immersive-ar');
	}
	requestSession(mode, opts) {
		console.log("going to load from ", REALAPI_URL)
		return new Promise((resolve, reject) => {
			delete window.navigator.xr;
			const script = document.createElement('script');
			script.setAttribute('src', REALAPI_URL);
			script.setAttribute('type', 'text/javascript');

			let loaded = false;
			const loadFunction = () => {
				if (loaded) return;
				loaded = true;
				console.log("now the script is really loaded", navigator.xr);
				navigator.xr.requestSession(mode, opts).then(resolve).catch(reject);
			};
			script.onload = loadFunction;
			script.onreadystatechange = loadFunction;
			document.getElementsByTagName("head")[0].appendChild(script);
		});
	}
}

window.navigator.xr = new FakeXR();
