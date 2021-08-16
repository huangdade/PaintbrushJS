
let originImage = document.getElementById("original-image");
let resultImage = document.getElementById("result-image");

// 滤镜列表：用于创建下拉列表，以及建立与controls的对应关系
const filterControl = {
	"filters":	[
		{
			"name"			: "blur",
			"label"			: "高斯模糊",
			"filterClass"	: "filter-blur",
			"controlId"		: "controls-blur"
		},
		{
			"name"			: "edges",
			"label"			: "检测边缘",
			"filterClass"	: "filter-edges",
			"controlId"		: "controls-edges"
		},
		{
			"name"			: "emboss",
			"label"			: "浮凸",
			"filterClass"	: "filter-emboss",
			"controlId"		: "controls-emboss"
		},
		{
			"name"			: "greyscale",
			"label"			: "灰度化",
			"filterClass"	: "filter-greyscale",
			"controlId"		: "controls-greyscale"
		},
		{
			"name"			: "mosaic",
			"label"			: "马赛克",
			"filterClass"	: "filter-mosaic",
			"controlId"		: "controls-mosaic"
		},
		{
			"name"			: "noise",
			"label"			: "噪点",
			"filterClass"	: "filter-noise",
			"controlId"		: "controls-noise"
		},
		{
			"name"			: "posterize",
			"label"			: "色调分离",
			"filterClass"	: "filter-posterize",
			"controlId"		: "controls-posterize"
		},
		{
			"name"			: "sepia",
			"label"			: "老照片特效",
			"filterClass"	: "filter-sepia",
			"controlId"		: "controls-sepia"
		},
    	{
			"name"			: "sharpen",
			"label"			: "锐化",
			"filterClass"	: "filter-sharpen",
			"controlId"		: "controls-sharpen"
		},
		{
			"name"			: "tint",
			"label"			: "色调",
			"filterClass"	: "filter-tint",
			"controlId"		: "controls-tint"
		}
	]
};

// 切换控件显示
function displayControls() {
    // 查询当前选中项
    let selectedFilter = filterSelector.options[filterSelector.selectedIndex].value;
	let obj = filterControl.filters.find(item => item.name === selectedFilter);
    let current = obj.controlId;
    // 全部控件
	let controls = document.getElementsByClassName("controls");
	for (let i = 0; i < controls.length; i++) {
        let id = controls[i].id;
        if (id === current) {
            controls[i].style.display = "block";
        } else {
            controls[i].style.display = "none";
        }
    }
}

// 滤镜下拉列表
let filterSelector = document.getElementById("filter-selector");
for (let i = 0; i < filterControl.filters.length; i++) {
    let newOption = document.createElement("option");
    newOption.text = filterControl.filters[i].label;
    newOption.value = filterControl.filters[i].name;

    filterSelector.appendChild(newOption);
}

displayControls();
originImage.onload = updateFilters;
originImage.src = "images/500/stones.jpg";

// 给所有的控件添加监听事件，触发图片处理
for (let i = 0; i < filterControl.filters.length; i++) {
    let id = filterControl.filters[i].controlId;
    let control = document.getElementById(id);
    let inputs = control.getElementsByTagName("input");
	for (let j = 0; j < inputs.length; j++) {
        inputs[j].addEventListener("change", updateFilters);
	}
}
filterSelector.onchange = function () {
    displayControls();
    updateFilters();
}

// 对图片应用滤镜，并将结果展示出来
const processCanvas = document.createElement("canvas");
const processContext = processCanvas.getContext("2d");
function updateFilters() {
    // 提取当前滤镜类别
    let selectedFilter = filterSelector.options[filterSelector.selectedIndex].value;
	let obj = filterControl.filters.find(item => item.name === selectedFilter);
	processFilters(originImage, obj.filterClass, getParamters(), processCanvas, processContext);
    resultImage.src = processCanvas.toDataURL("image/png");
}

// 从控件中提取参数
function getParamters() {
    // 当前滤镜类别
    let selectedFilter = filterSelector.options[filterSelector.selectedIndex].value;
    // 获取对应的control
	let obj = filterControl.filters.find(item => item.name === selectedFilter);
    let currControl = document.getElementById(obj.controlId);
    // 提取该control中的input
	let inputs = currControl.getElementsByTagName("input");
    // 依次从input中提取参数
	let params = {};
	for (var i = 0; i < inputs.length; i++) {
        let name = inputs[i].name; // input的默认名称
        let name2 = name.substr(8); // 去掉前缀
        // 获取连字符下标
        let hyphenIndex = name2.indexOf('-');
        // 改成驼峰式
        name2 = name2.substr(0, hyphenIndex) + name2.charAt(hyphenIndex + 1).toUpperCase() + name2.substr(hyphenIndex + 2);
        let type = inputs[i].type.toLowerCase();
        // 提取值：range转成数值
		if (type === "range") {
            params[name2] = Number(inputs[i].value);
		} else if ((type === "text") || (type === "radio")) {
			params[name2] = inputs[i].value;
		}
	}

    if (obj.filterClass === "filter-posterize") {
        // 这两个参数换算一下，得到一个计算中间值，以便加快计算速度
        params['posterizeAreas'] = 256 / params.posterizeAmount;
        params['posterizeValues'] = 255 / (params.posterizeAmount - 1);
    }

    return params;
}

