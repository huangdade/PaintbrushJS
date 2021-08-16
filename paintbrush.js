// --------------------------------------------------
//
// paintbrush.js, v0.3
// A browser-based image processing library for HTML5 canvas
// Developed by Dave Shea, http://www.mezzoblue.com/
//
// This project lives on GitHub:
//    http://github.com/mezzoblue/PaintbrushJS
//
// Except where otherwise noted, PaintbrushJS is licensed under the MIT License:
//    http://www.opensource.org/licenses/mit-license.php
//
// --------------------------------------------------


/*
* img: 输入图片
* filterType: 滤镜类别
* params: 滤镜参数
* buffer/c: 画布，计算所使用的容器
*/
function processFilters(img, filterType, params, buffer, c) {
	// 根据图片尺寸设置画布尺寸
	buffer.width = img.width;
	buffer.height = img.height;
	// 绘制图片到画布中去，并返回像素数据
	let pixels = initializeBuffer(c, img);

	// 根据不同的滤镜类别分别处理
	// 高斯模糊
	if (filterType == "filter-blur") {
		pixels = gaussianBlur(img, pixels, params.blurAmount);
	}

	// 通用的通道算法
	if (filterType == "filter-edges") {
		let matrix = [
			0, 1, 0,
			1, -4, 1,
			0, 1, 0
		];
		pixels = applyMatrix(img, pixels, matrix, params.edgesAmount);
	}
	if (filterType == "filter-emboss") {
		let matrix = [
			-2, -1, 0,
			-1, 1, 1,
			0, 1, 2
		];
		pixels = applyMatrix(img, pixels, matrix, params.embossAmount);
	}
	if (filterType == "filter-matrix") {
		// 3x3 matrix can be any combination of digits, though to maintain brightness they should add up to 1
		// (-1 x 8 + 9 = 1)
		let matrix = [
			// box blur default
			0.111, 0.111, 0.111,
			0.111, 0.111, 0.111,
			0.111, 0.111, 0.111
		];

		pixels = applyMatrix(img, pixels, matrix, params.matrixAmount);
	}
	if (filterType == "filter-sharpen") {
		let matrix = [
			-1, -1, -1,
			-1, 9, -1,
			-1, -1, -1
		];
		pixels = applyMatrix(img, pixels, matrix, params.sharpenAmount);
	}

	// we need to figure out RGB values for tint, let's do that ahead and not waste time in the loop
	let dest;
	if (filterType == "filter-tint") {
		let src = parseInt(createColor(params.tintColor), 16);
		dest = { r: ((src & 0xFF0000) >> 16), g: ((src & 0x00FF00) >> 8), b: (src & 0x0000FF) };
	}

	// 通用的处理手段：applyFilters，逐像素的处理
	if ((filterType != "filter-blur")
		&& (filterType != "filter-emboss")
		&& (filterType != "filter-edges")
		&& (filterType != "filter-matrix")
		&& (filterType != "filter-sharpen")
	) {
		// the main loop through every pixel to apply the simpler effects
		// (data is per-byte, and there are 4 bytes per pixel, so lets only loop through each pixel and save a few cycles)
		for (let i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
			let index = i << 2;

			// get each colour value of current pixel
			let thisPixel = { r: data[index], g: data[index + 1], b: data[index + 2] };

			// the biggie: if we're here, let's get some filter action happening
			pixels = applyFilters(img, filterType, params, pixels, index, thisPixel, dest);
		}
	}

	// redraw the pixel data back to the working buffer
	c.putImageData(pixels, 0, 0);
}



// calculate gaussian blur
// adapted from http://pvnick.blogspot.com/2010/01/im-currently-porting-image-segmentation.html
function gaussianBlur(img, pixels, amount) {

	var width = img.width;
	var width4 = width << 2;
	var height = img.height;

	if (pixels) {
		var data = pixels.data;

		// compute coefficients as a function of amount
		var q;
		if (amount < 0.0) {
			amount = 0.0;
		}
		if (amount >= 2.5) {
			q = 0.98711 * amount - 0.96330;
		} else if (amount >= 0.5) {
			q = 3.97156 - 4.14554 * Math.sqrt(1.0 - 0.26891 * amount);
		} else {
			q = 2 * amount * (3.97156 - 4.14554 * Math.sqrt(1.0 - 0.26891 * 0.5));
		}

		//compute b0, b1, b2, and b3
		var qq = q * q;
		var qqq = qq * q;
		var b0 = 1.57825 + (2.44413 * q) + (1.4281 * qq) + (0.422205 * qqq);
		var b1 = ((2.44413 * q) + (2.85619 * qq) + (1.26661 * qqq)) / b0;
		var b2 = (-((1.4281 * qq) + (1.26661 * qqq))) / b0;
		var b3 = (0.422205 * qqq) / b0;
		var bigB = 1.0 - (b1 + b2 + b3);

		// horizontal
		for (var c = 0; c < 3; c++) {
			for (var y = 0; y < height; y++) {
				// forward 
				var index = y * width4 + c;
				var indexLast = y * width4 + ((width - 1) << 2) + c;
				var pixel = data[index];
				var ppixel = pixel;
				var pppixel = ppixel;
				var ppppixel = pppixel;
				for (; index <= indexLast; index += 4) {
					pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
					data[index] = pixel;
					ppppixel = pppixel;
					pppixel = ppixel;
					ppixel = pixel;
				}
				// backward
				index = y * width4 + ((width - 1) << 2) + c;
				indexLast = y * width4 + c;
				pixel = data[index];
				ppixel = pixel;
				pppixel = ppixel;
				ppppixel = pppixel;
				for (; index >= indexLast; index -= 4) {
					pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
					data[index] = pixel;
					ppppixel = pppixel;
					pppixel = ppixel;
					ppixel = pixel;
				}
			}
		}

		// vertical
		for (var c = 0; c < 3; c++) {
			for (var x = 0; x < width; x++) {
				// forward 
				var index = (x << 2) + c;
				var indexLast = (height - 1) * width4 + (x << 2) + c;
				var pixel = data[index];
				var ppixel = pixel;
				var pppixel = ppixel;
				var ppppixel = pppixel;
				for (; index <= indexLast; index += width4) {
					pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
					data[index] = pixel;
					ppppixel = pppixel;
					pppixel = ppixel;
					ppixel = pixel;
				}
				// backward
				index = (height - 1) * width4 + (x << 2) + c;
				indexLast = (x << 2) + c;
				pixel = data[index];
				ppixel = pixel;
				pppixel = ppixel;
				ppppixel = pppixel;
				for (; index >= indexLast; index -= width4) {
					pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
					data[index] = pixel;
					ppppixel = pppixel;
					pppixel = ppixel;
					ppixel = pixel;
				}
			}
		}

		return (pixels);
	}
}


// the function that actually manipulates the pixels
function applyFilters(img, filterType, params, pixels, index, thisPixel, dest) {

	// speed up access
	var data = pixels.data, val;
	var imgWidth = img.width;

	// figure out which filter to apply, and do it	
	switch (filterType) {

		case "filter-greyscale":
			val = (thisPixel.r * 0.21) + (thisPixel.g * 0.71) + (thisPixel.b * 0.07);
			data = setRGB(data, index,
				findColorDifference(params.greyscaleOpacity, val, thisPixel.r),
				findColorDifference(params.greyscaleOpacity, val, thisPixel.g),
				findColorDifference(params.greyscaleOpacity, val, thisPixel.b));
			break;

		case "filter-mosaic":
			// a bit more verbose to reduce amount of math necessary
			var pos = index >> 2;
			var stepY = Math.floor(pos / imgWidth);
			var stepY1 = stepY % params.mosaicSize;
			var stepX = pos - (stepY * imgWidth);
			var stepX1 = stepX % params.mosaicSize;

			if (stepY1) pos -= stepY1 * imgWidth;
			if (stepX1) pos -= stepX1;
			pos = pos << 2;

			data = setRGB(data, index,
				findColorDifference(params.mosaicOpacity, data[pos], thisPixel.r),
				findColorDifference(params.mosaicOpacity, data[pos + 1], thisPixel.g),
				findColorDifference(params.mosaicOpacity, data[pos + 2], thisPixel.b));
			break;

		case "filter-noise":
			val = noise(params.noiseAmount);

			if ((params.noiseType == "mono") || (params.noiseType == "monochrome")) {
				data = setRGB(data, index,
					checkRGBBoundary(thisPixel.r + val),
					checkRGBBoundary(thisPixel.g + val),
					checkRGBBoundary(thisPixel.b + val));
			} else {
				data = setRGB(data, index,
					checkRGBBoundary(thisPixel.r + noise(params.noiseAmount)),
					checkRGBBoundary(thisPixel.g + noise(params.noiseAmount)),
					checkRGBBoundary(thisPixel.b + noise(params.noiseAmount)));
			}
			break;

		case "filter-posterize":
			data = setRGB(data, index,
				findColorDifference(params.posterizeOpacity, parseInt(params.posterizeValues * parseInt(thisPixel.r / params.posterizeAreas)), thisPixel.r),
				findColorDifference(params.posterizeOpacity, parseInt(params.posterizeValues * parseInt(thisPixel.g / params.posterizeAreas)), thisPixel.g),
				findColorDifference(params.posterizeOpacity, parseInt(params.posterizeValues * parseInt(thisPixel.b / params.posterizeAreas)), thisPixel.b));
			break;

		case "filter-sepia":
			data = setRGB(data, index,
				findColorDifference(params.sepiaOpacity, (thisPixel.r * 0.393) + (thisPixel.g * 0.769) + (thisPixel.b * 0.189), thisPixel.r),
				findColorDifference(params.sepiaOpacity, (thisPixel.r * 0.349) + (thisPixel.g * 0.686) + (thisPixel.b * 0.168), thisPixel.g),
				findColorDifference(params.sepiaOpacity, (thisPixel.r * 0.272) + (thisPixel.g * 0.534) + (thisPixel.b * 0.131), thisPixel.b));
			break;

		case "filter-tint":
			data = setRGB(data, index,
				findColorDifference(params.tintOpacity, dest.r, thisPixel.r),
				findColorDifference(params.tintOpacity, dest.g, thisPixel.g),
				findColorDifference(params.tintOpacity, dest.b, thisPixel.b));
			break;


	}
	return (pixels);
}


// ensure that values in a matrix add up to 1
function normalizeMatrix(matrix) {
	var j = 0;
	for (var i = 0; i < matrix.length; i++) {
		j += matrix[i];
	}
	for (var i = 0; i < matrix.length; i++) {
		matrix[i] /= j;
	}
	return matrix;
}



// convert x/y coordinates to pixel index reference
function convertCoordinates(x, y, w) {
	return x + (y * w);
}

// calculate random noise. different every time!
function noise(noiseValue) {
	return Math.floor((noiseValue >> 1) - (Math.random() * noiseValue));
}

// ensure an RGB value isn't negative / over 255
function checkRGBBoundary(val) {
	if (val < 0) {
		return 0;
	} else if (val > 255) {
		return 255;
	} else {
		return val;
	}
}

// apply a convolution matrix
function applyMatrix(img, pixels, matrix, amount) {

	// create a second buffer to hold matrix results
	var buffer2 = document.createElement("canvas");
	// get the canvas context 
	var c2 = buffer2.getContext('2d');

	// set the dimensions
	c2.width = buffer2.width = img.width;
	c2.height = buffer2.height = img.height;

	// draw the image to the new buffer
	c2.drawImage(img, 0, 0, img.width, img.height);
	var bufferedPixels = c2.getImageData(0, 0, img.width, img.height)

	// speed up access
	var data = pixels.data, bufferedData = bufferedPixels.data, imgWidth = img.width;

	// make sure the matrix adds up to 1
	/* 		matrix = normalizeMatrix(matrix); */

	// calculate the dimensions, just in case this ever expands to 5 and beyond
	var matrixSize = Math.sqrt(matrix.length);

	// loop through every pixel
	for (var i = 1; i < imgWidth - 1; i++) {
		for (var j = 1; j < img.height - 1; j++) {

			// temporary holders for matrix results
			var sumR = sumG = sumB = 0;

			// loop through the matrix itself
			for (var h = 0; h < matrixSize; h++) {
				for (var w = 0; w < matrixSize; w++) {

					// get a refence to a pixel position in the matrix
					var r = convertCoordinates(i + h - 1, j + w - 1, imgWidth) << 2;

					// find RGB values for that pixel
					var currentPixel = {
						r: bufferedData[r],
						g: bufferedData[r + 1],
						b: bufferedData[r + 2]
					};

					// apply the value from the current matrix position
					sumR += currentPixel.r * matrix[w + h * matrixSize];
					sumG += currentPixel.g * matrix[w + h * matrixSize];
					sumB += currentPixel.b * matrix[w + h * matrixSize];
				}
			}

			// get a reference for the final pixel
			var ref = convertCoordinates(i, j, imgWidth) << 2;
			var thisPixel = {
				r: data[ref],
				g: data[ref + 1],
				b: data[ref + 2]
			};

			// finally, apply the adjusted values
			data = setRGB(data, ref,
				findColorDifference(amount, sumR, thisPixel.r),
				findColorDifference(amount, sumG, thisPixel.g),
				findColorDifference(amount, sumB, thisPixel.b));
		}
	}

	// code to clean the secondary buffer out of the DOM would be good here

	return (pixels);
}


function initializeBuffer(c, img) {
	c.clearRect(0, 0, img.width, img.height);
	c.drawImage(img, 0, 0, img.width, img.height);
	return c.getImageData(0, 0, img.width, img.height);
}


// parse a shorthand or longhand hex string, with or without the leading '#', into something usable
function createColor(src) {
	// strip the leading #, if it exists
	src = src.replace(/^#/, '');
	// if it's shorthand, expand the values
	if (src.length == 3) {
		src = src.replace(/(.)/g, '$1$1');
	}
	return (src);
}

// find a specified distance between two colours
function findColorDifference(dif, dest, src) {
	return (dif * dest + (1 - dif) * src);
}

// throw three new RGB values into the pixels object at a specific spot
function setRGB(data, index, r, g, b) {
	data[index] = r;
	data[index + 1] = g;
	data[index + 2] = b;
	return data;
}

