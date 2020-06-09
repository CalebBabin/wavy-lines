const config = {
	lines: 28,
	curves: 20, // setting this to a higher amount makes the lines more curvy, lower makes them straight
	points: 250, // the resolution the lines are rendered at, if you want the resolution of the curves to be 1:1, then this will need to be set to a value higher than the horizontal resolution of your screen
	curve_height: 0.4, // how tall the curves will be in relation to the height of the screen, 0.5 would be 50% of the screen, 0.1 would be 10%, 1 would be 100%
	curve_variance: 0.75, // how much the curve height will variate 
	curve_variance_x: 0.07, // how much the curve width will variate
	line_width: 0.02, //how thick the lines are
	line_width_variance: 0.5, // how much the thickness of the lines will variate, setting to 0 will make the lines be more consistent
	background: "#FD013D",
	line_color: "#000000",
	y_offset_1_scale: 0.7, // effects the size of sine waves
	y_variance_1_scale: 2, // effects the size of sine waves
	y_crossover_influence: 0.002, // how much the vertical position of a point will effect the horizontal position of a point

	// These "timer" variables dictate how fast the animation moves, setting a higher value will move the animation slower.
	timer_1: 10000, // controls how fast the overall up/down animation moves
	timer_2: 6500, // controls how fast the variation of the up/down animation moves
	timer_3: 7800, // controls how fast the left/right animation moves
	timer_4: 8800, // controls how fast the line width animation moves

	speed_scale: 1, // adjusts the overall speed of the animation
}

// The following code will allow us to use query variables to adjust our "config" object
// for example, adding "?background=#00ff00&line_color=#0000ff" will make everything look like shit
const query_vars = {};
const query_parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
	query_vars[key] = value;
});
for (const key in query_vars) {
	if (query_vars.hasOwnProperty(key) && config.hasOwnProperty(key)) {
		switch (typeof config[key]) {
			case "number":
				config[key] = Number(query_vars[key]);
			default:
				config[key] = query_vars[key];
		}
	}
}

for (const key in config) {
	if (config.hasOwnProperty(key)) {
		if (key.startsWith("timer_")){
			config[key] /= config.speed_scale;
		}
	}
}

const curve = function (points, ctx, y_offset = 0, direction = 1) {
	/*
	**
	** This function iterates through an array of points and draws a straight line through them using the canvas API
	** I originally intended to use bezier curves for simplicity and performance reasons, but I couldn't figure out the math
	**
	*/
	if (direction > 0) {
		for (let index = 0; index < points.length; index++) {
			ctx.lineTo(points[index].x, points[index].y + y_offset * points[index].y_offset_amount)
		}
	} else {
		for (let index = points.length - 1; index >= 0; index--) {
			ctx.lineTo(points[index].x, points[index].y + y_offset * points[index].y_offset_amount)
		}
	}
};

window.addEventListener("DOMContentLoaded", () => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	document.body.appendChild(canvas);

	//Set the background color
	canvas.style.background = config.background;

	const resize = () => {
		/*
		**
		** This function sets the resolution of our "canvas" to match the resolution of the screen
		** it will also match high DPI screens that have to use "sub-pixels" for web browsers to make it so you can read stuff on your phone or ipad or whatever
		**
		*/
		canvas.width = window.innerWidth * Math.max(1, window.devicePixelRatio);
		canvas.height = window.innerHeight * Math.max(1, window.devicePixelRatio);
	}
	window.addEventListener('resize', resize);
	resize();

	const compute_pos = (x_index, y_offset) => {
		/*
		**
		** This function takes in an x and y position, and will then use sine waves and shit to make it all curvy :)
		** 
		*/
		const y_offset_1 = Math.sin(Date.now() / config.timer_1 + x_index * config.y_offset_1_scale) * (config.curve_height * canvas.height);
		const y_variance_1 = (Math.sin(Date.now() / config.timer_2 + x_index / config.y_variance_1_scale) / 2 + 0.5) * config.curve_variance;

		const y = y_offset + y_offset_1 * y_variance_1;

		const x_offset_1 = Math.sin(Date.now() / config.timer_3 + ((x_index * 0.25) + y * config.y_crossover_influence)) * (config.curve_variance_x * canvas.width);
		return {
			x: (canvas.width / config.curves) * x_index + x_offset_1,
			y,
			y_offset_amount: 1 + config.line_width_variance * (Math.sin(Date.now() / config.timer_4 + (x_index * 0.25)) / 2 + 0.5),
		}
	}

	// Store the time since the last frame was rendered out
	let last_frame = Date.now();

	const draw = () => {
		/*
		**
		** This function is our main loop, it will run 60 times a second under normal conditions
		** 
		*/
		window.requestAnimationFrame(draw);

		// Get the seconds since the last frame was drawn, this value will usually be between 1 and 0
		const delta = (Date.now() - last_frame) / 1000;
		last_frame = Date.now();

		// Clear the canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Iterate through our vertical line count
		for (let y_index = 0; y_index < config.lines; y_index++) {
			// Figure out what our starting vertical position for this line should be
			let y_offset = (canvas.height / config.lines) * y_index / config.curve_height - (canvas.height / config.curve_height) / 4;

			ctx.beginPath();

			// the "history" array will store the points along our line, we keep an array so we can easily iterate in reverse through it for the rendering technique we're using for our lines
			const history = new Array();
			for (let i = 0; i < config.points; i++) {
				const computed = compute_pos(i * (config.curves / config.points), y_offset);

				// make sure that our lines overflow off the edges of the screen so we can't see where they start and end 
				computed.x *= 1 + config.curve_variance_x * 4;
				computed.x -= (config.curve_variance_x * 2) * canvas.width;

				history.push(computed);
			}

			curve(history, ctx, 0, 1);

			// create an offset between the top of the line and the bottom of the line, this is essentially our "thickness" measurement
			const width_offset = canvas.height * config.line_width;

			curve(history, ctx, width_offset, -1);


			//Set the color for the lines
			ctx.fillStyle = config.line_color;

			ctx.fill();
			//ctx.stroke();
			ctx.closePath();
		}
	}
	draw();

})