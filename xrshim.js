{
	const REALAPI_URL = 'https://raw.githack.com/MozillaReality/webxr-ios-js/develop/dist/webxr.js';

	window.navigator.xr = {
		isSessionSupported: function(mode) {
			// Note: We support only immersive-ar mode for now.
			//       See https://github.com/MozillaReality/webxr-ios-js/pull/34#discussion_r334910337
			return Promise.resolve(mode === 'immersive-ar');
		},
		requestSession: function(mode, opts) {
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
	};
}
