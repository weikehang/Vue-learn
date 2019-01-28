(function(global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
		typeof define === 'function' && define.amd ? define(factory) :
		(global.Vue = factory());
})(this, function() {
	var warn = function(msg) {
		console.error("[Vue Warn]: " + msg);
	}
	var LIFECYCLE_HOOKS = [
		'beforeCreate',
		'created',
		'beforeMount',
		'mounted',
		'beforeUpdate',
		'updated',
		'beforeDestroy',
		'destroyed',
		'activated', //内置组件  激活 keep-alive
		'deactivated', // 停用 keep-alive
		'errorCaptured'
	];

	var ASSET_TYPES = [ //选项components   directives  filters
		'component',
		'directive',
		'filter'
	];

	var methods = [
		'push',
		'pop',
		'shift',
		'unshift',
		'splice',
		'sort',
		'reverse'
	];

	//代理原型
	var cacheArrProto = Array.prototype;
	var shell = Object.create(cacheArrProto); //shell 借壳

	methods.forEach(function(method) {
		var cacheMethod = cacheArrProto[method]; //{}.splice();  
		def(shell, method, function() {
			//抄袭   原创
			var args = [],
				len = arguments.length;
			while (len--) args[len] = arguments[len];

			var result = cacheMethod.apply(this, args);
            console.log(this)
			var ob = this.__ob__;
			var inserted;
			switch (method) {
				case "push":
				case "unshift":
					inserted = args;
					break;
				case "splice":
					inserted = args.slice(2);
			}
			if (inserted) {
				//监听新添加的数据 加入响应式系统中
				console.log(ob)
				ob.observeArray(inserted);
			}
			console.log("haha.. 此数组的依赖全部通知,数据更新了");
			ob.dep.notify(); //通知依赖更新
			return result;
		});
	});
	
     var arrayKeys = Object.getOwnPropertyNames(shell);

	var isOjbect = function(obj) {
		return obj !== null && typeof obj === "object";
	}
    var hasProto = "__proto__" in {};
	var shouldObserve = true;

	function toggleObserving(value) { //false
		shouldObserve = value;
	}

	function def(obj, key, val) {
		Object.defineProperty(obj, key, { //data.__ob__  =实例对象
			value: val,
			enumerable: false, //不可枚举
			configrable: true
		})
	}

	var noop = function() {

	}

	function Dep() {
		this.subs = [];
	}
	Dep.prototype.addSub = function(sub) { //sub Watch的实例对象
		this.subs.push(sub);
	}
	Dep.prototype.depend = function() {
		console.log("收集依赖"); //Watch 观察者
	}
	Dep.prototype.notify = function() {
		var subs = this.subs.slice();
		for (var i = 0; i < subs.length; i++) {
			subs[i].updata(); //  数据更新的操作   Watch
		}
	};
	Dep.target = null;

	function Observe(value) {
		this.value = value;
		this.vmCount = 0;
		this.dep = new Dep(); //回调列表   依赖?  依赖在什么情况下调用
		def(value, "__ob__", this);
		//响应式数据之数组的处理
		if (Array.isArray(value)) {
			  var  augment = hasProto ? protoAugment : copyAugment;
			  augment(value, shell, arrayKeys);
		} else {
			this.walk(value);
		}
	}

	Observe.prototype.walk = function walk(obj) {
		var keys = Object.keys(obj);
		for (var i = 0, j = keys.length; i < j; i++) {
			defineReactive(obj, keys[i]);
		}
	}
	Observe.prototype.observeArray = function(items) {
		for (var i = 0, j = items.length; i < j; i++) {
			observe(items[i]);
		}
	}
	//响应式系统的入口  data
	function observe(value, asRootData) {
		if (!isOjbect(value)) {
			return;
		}
		var ob;
		if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
			ob = value.__ob__;
		} else if (shouldObserve &&
			(Array.isArray(value) || isPlainObject(value)) &&
			Object.isExtensible(value) &&
			!value._isVue) {
			ob = new Observe(value);
		}
		if (ob && asRootData) {
			ob.vmCount++;
		}
		return ob;
	}
	//目标源  代理原型对象
	function protoAugment(target, src){
		target.__proto__ = src;
	}
	
	//一个个方法来绑定   //兼容浏览器
	function copyAugment(target, src, keys){
		console.log(11)
	    for(var i =0, j=keys.length; i<j; i++){
			var key = keys[i];
			def(target, key, src[key]);
		}	
	}

	//响应式系统的核心  将数据对象的属性转化成访问器属性 getter setter
	function defineReactive(obj, key, val, shallow) {
		var dep = new Dep(); //收集依赖  回调列表
		var property = Object.getOwnPropertyDescriptor(obj, key);
		var getter = property && property.get;
		var setter = property && property.set;

		if ((!getter || setter) && arguments.length === 2) {
			val = obj[key]; //深度的观测   list
		}
		var childOb = !shallow && observe(val); //1 val  object对象  数组对象
		Object.defineProperty(obj, key, { //data test
			get: function() { //依赖收集
				var value = getter ? getter.call(obj) : val;
				if (Dep.target) { //要被收集的依赖
					dep.depend(); //依赖的收集
					if (childOb) {
						childOb.dep.depend(); //依赖的收集
					}
				}
				return value;
			},
			set: function(newVal) { //调用依赖项
				var value = getter ? getter.call(obj) : val;
				//NaN  !== NaN
				if (newVal == value || (value !== value && newVal !== newVal)) {
					return;
				}
				if (setter) {
					setter.call(obj, newVal);
				} else {
					val = newVal;
				}
				childOb = !shallow && observe(val);
				dep.notify(); //通知依赖更新
			}
		})
	}

	function isPlainObject(obj) {
		return toString.call(obj) === "[object Object]";
	}

	function assertObjectType(name, vaule, vm) {
		if (!isPlainObject(vaule)) {
			warn("选项" + name + "的值无效：必须是个对象");
		}
	}

	function extend(to, _from) { //childVal
		for (var key in _from) {
			to[key] = _from[key];
		}
		return to;
	}
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var hasOwn = function(obj, key) {
		return hasOwnProperty.call(obj, key);
	}
	var uid = 0;

	function resolveConstructorOptions(Con) {
		var options = Con.options;
		/*
		判断  Con.super   ==  Vue
		*/
		return options;
	}

	function checkComponents(options) {
		for (var key in options.components) {
			validataComponentName(key);
		}
	}
	//检测key 是否在makeMap
	function makeMap(str, toLowerCase) {
		var map = {};
		var list = str.split(","); //["slot","component"]
		for (var i = 0; i < list.length; i++) {
			map[list[i]] = true;
		}

		return toLowerCase ? function(val) {
			return map[val.toLowerCase()];
		} : function(val) {
			return map[val];
		}
	}
	var isHTMLTag = makeMap(
		'html,body,base,head,link,meta,style,title,' +
		'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
		'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
		'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
		's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
		'embed,object,param,source,canvas,script,noscript,del,ins,' +
		'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
		'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
		'output,progress,select,textarea,' +
		'details,dialog,menu,menuitem,summary,' +
		'content,element,shadow,template,blockquote,iframe,tfoot'
	);

	//保留标签不能注册为组件
	var isSVG = makeMap(
		'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
		'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
		'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
		true
	);
	
	Vue.options = {
		components: { 
			keepAlive: {},
			transition: {},
			transitionGroup: {}
		},
		directives: {},
		_base: Vue
	}
	
	//配置对象
	var config = {
		//自定义的策略
		optionMergeStrategies: {}
	}
	var strats = config.optionMergeStrategies;
	strats.el = function(parent, child, vm, key) {
		if (!vm) {
			warn("选项" + key + "只能Vue在实例中使用");
		}
		return defaultStrat(parent, child);
	}

	function mergeData(to, form) {
		if (!form) {
			return to;
		}
		//终极合并  待续：
	}

	function mergeDataorFn(parentVal, childVal, vm) {
		if (!vm) {
			//合并处理  parentVal   childVal 对应的值都应该是函数
			if (!childVal) {
				return parentVal;
			}
			if (!parentVal) {
				return childVal;
			}
			return function mergeDataFn(parentVal, childVal, vm) { //只是一个函数   什么样的情况下调用 加入响应式系统 
				//合并 子组件data对应的函数  父组件data对应的函数
				return mergeData(
					typeof childVal === "function" ? childVal.call(this, this) : childVal,
					typeof parentVal === "function" ? parentVal.call(this, this) : parentVal
				);
			}
		} else { //Vue的实例
			return function mergedInstanceDataFn() {
				var instenceData = typeof childVal === "function" ? childVal.call(vm, vm) : childVal;
				var dafaultData = typeof parentVal === "function" ? parentVal.call(vm, vm) : parentVal;
				if (instenceData) {
					return mergeData(instenceData, dafaultData);
				} else {
					return dafaultData;
				}
			}
		}
	}
	//自定义策略    Vue.options.data    options   vm
	strats.data = function(parentVal, childVal, vm) {
		if (!vm) { //子组件  子类
			if (childVal && typeof childVal !== "function") {
				warn("data选项的值应该为function 返回组件中每个实例值");
			}
			return mergeDataorFn(parentVal, childVal); //数据的合并
		}
		return mergeDataorFn(parentVal, childVal, vm);
	}

	function mergeHook(parentVal, childVal) { //undefined  function
		return childVal ?
			parentVal ? //有值数组
			parentVal.concat(childVal) :
			Array.isArray(childVal) ? childVal : [childVal] : parentVal;
	}

	// 钩子函数自定义策略
	LIFECYCLE_HOOKS.forEach(function(hook) {
		strats[hook] = mergeHook;
	})

	function mergeAssets(parentVal, childVal, vm, key) { //Vue.options.components
		var res = Object.create(parentVal || null);
		if (childVal) {
			assertObjectType(key, childVal, vm);
			return extend(res, childVal); //对象  res.__proto__   == Vue.options.components
		}
		return res;
	}

	//资源选项 自定义策略
	ASSET_TYPES.forEach(function(type) {
		strats[type + "s"] = mergeAssets;
	})

	//wacth选项自定义策略  
	strats.watch = function(parentVal, childVal, vm, key) {
		if (!childVal) {
			return Object.create(parentVal || null);
		}
		assertObjectType(key, childVal, vm);
		if (!parentVal) {
			return childVal;
		}
		var res = {};
		extend(res, parentVal); //rest.test
		for (var key in childVal) {
			var parent = res[key]; //a 为 undefined     test 有值
			var child = childVal[key];
			if (parent && !Array.isArray(parent)) {
				parent = [parent];
			}
			//rest.a = [function(){}]   rest.test= [function(){},function(){}]
			res[key] = parent ? parent.concat(child) : Array.isArray(child) ? child : [child]
		}
		return res;
	}

	//parentVal  message: {type: null}    childVal test {type: null} 
	strats.props =
		strats.methods =
		strats.computed = function(parentVal, childVal, vm, key) {
			if (!parentVal) {
				return childVal;
			}
			var res = Object.create(null);
			extend(res, parentVal);
			if (childVal) {
				extend(res, childVal);
			}
			return res;
		}
	//内置标签
	var isbuiltInTag = makeMap("slot,component", true);
	var isReservedTag = function(tag) {
		return isSVG(tag) || isHTMLTag(tag);
	}

	function defaultStrat(parent, child) {
		return child === undefined ? parent : child;
	}

	function validataComponentName(key) {
		//1：不能使用Vue内置标签 slot  component  2:  不能使用html || svg属性名称 
		//2: 规范组件的名称必须是由字母或中横线组成, 且必须是由字母开头
		if (!/^[a-zA-Z][\w-]*$/.test(key)) {
			warn("组件的名称必须是由字母或中横线组成, 且必须是由字母开头");
		}

		if (isbuiltInTag(key) || isReservedTag(key)) {
			warn("不要把内置组件或者保留的html ||svg 元素作为组件的id: " + key);
		}
	}

	var camelizeRE = /-(\w)/g;
	//将中横线转化为驼峰命名
	function camelize(str) {
		return str.replace(camelizeRE, function(_, c) {
			return c ? c.toUpperCase() : "";
		});
	}
	//props 规范
	function normalizeProps(options) {
		var props = options.props;
		if (!props) {
			return;
		}
		var res = {};
		var i, val, name;
		if (Array.isArray(props)) {
			i = props.length; //1
			while (i--) {
				val = props[i];
				if (typeof val === "string") {
					name = camelize(val);
					res[name] = { //res.myMessage
						type: null,
					}
				} else {
					warn("使用数组语法时: props的成员值必须为字符串");
				}
			}
		} else if (isPlainObject(props)) {
			for (var key in props) {
				val = props[key];
				name = camelize(key);
				res[name] = isPlainObject(val) ? val : {
					type: val
				};
			}
		} else {
			warn("选项props的值无效: 应该为数组或者对象");
		}
		options.props = res;
	}

	function normalizeDirectives(options) {
		var dirs = options.directives;
		if (dirs) {
			for (var key in dirs) {
				var def = dirs[key];
				if (typeof def === "function") {
					dirs[key] = {
						bind: def,
						updata: def
					}
				}
			}
		}
	}
	//选项合并 返回新的对象 
	function mergeOptions(parent, child, vm) {
		//规范的检测   components props inject  directives
		checkComponents(child);
		normalizeProps(child); //
		normalizeDirectives(child);
		var options = {};
		var key;
		for (key in parent) {
			mergeField(key); //components  directives  _base    
		}
		for (key in child) { //自定义的选项配置  created
			if (!hasOwn(parent, key)) {
				mergeField(key); //components el data  name
			}
		}

		//默认策略 自定义的策略 
		function mergeField(key) {
			//components  directives  _base  created
			var result = strats[key] || defaultStrat;
			options[key] = result(parent[key], child[key], vm, key); //  parent.options.created  1
		}
		return options;
	}

	function isReserved(str) {
		var c = (str).charCodeAt(0); //Unicode编码
		return c === 0x24 || c === 0x5F
	}
	//共享的访问器对象
	var sharedProperty = {
		enumerable: true,
		configurable: true,
		get: noop,
		set: noop
	};

	function proxy(target, data, key) { //vm
		sharedProperty.get = function() {
			return this[data][key]; //vm._data.test  getter
		}
		sharedProperty.set = function(val) {
			this[data][key] = val;
		}
		Object.defineProperty(target, key, sharedProperty); //vm.test  
	}

	function callHook(vm, hook) {
		var handlers = vm.$options[hook];
		if (handlers) {
			for (var i = 0, j = handlers.length; i < j; i++) {
				handlers[i].call(vm);
			}
		}
	}

	function getDate(data, vm) {
		return data.call(vm, vm);
	}

	function initData(vm) {
		var data = vm.$options.data;
		data = vm._data = typeof data === "function" ? getDate(data, vm) : data || {};
		if (!isPlainObject(data)) {
			data = {};
			warn("data选项值应该是object对象");
		}
		var keys = Object.keys(data);
		var methods = vm.$options.methods;
		var props = vm.$options.props;
		var i = keys.length;
		while (i--) {
			var key = keys[i];
			if (methods && hasOwn(methods, key)) {
				warn("methods: " + key + "选项已经定义为data的属性.");
			}
			if (props && hasOwn(props, key)) {
				warn("props " + key + "选项已经定义为data的属性.");
			} else if (!isReserved(key)) {
				proxy(vm, "_data", key);
			}
		}
		observe(data, true);
	}
	var allowedGlobals = makeMap(
		'Infinity,undefined,NaN,isFinite,isNaN,' +
		'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
		'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
		'require' // for Webpack/Browserify
	);

	function warnNonPresent(target, key) {
		warn("属性或方法" + key + "未在实例对象上定义 渲染功能正在尝试访问这个不存在的属性");
	}

	function isNative(Ctor) {
		return typeof Ctor === "function" && /native code/.test(Proxy.toString());
	}
	var hasProxy = typeof Proxy !== "undefined" && isNative(Proxy);

	var hasHandler = {
		has: function(target, key) { // test
			var has = key in target; //true
			//key 是否是全局对象   渲染函数 内置方法 _
			var isAllowed = allowedGlobals(key) || (typeof key === "string" && key.charAt(0) === "_");
			if (!has && !isAllowed) { //has 
				warnNonPresent(target, key);
			}
			return has; //true  false
		}
	}

	var getHandler = {
		get: function(target, key) { //代理对象   key   target in key
			if (typeof key === "string" && !(key in target)) {
				warnNonPresent(target, key);
			}
			return target[key];
		}
	}

	function initProxy(vm) {
		//  es6  proxy  检测	hasProxy
		if (hasProxy) {
			var options = vm.$options;
			//渲染函数    拦截哪些操作
			var Handlers = options.render && options.render._withStripped ?
				getHandler :
				hasHandler;
			vm._renderProxy = new Proxy(vm, Handlers);
		} else {
			vm._renderProxy = vm;
		}
	}

	function initLifecycle(vm) {
		var options = vm.$options;
		//parent   父实例引用  父组件
		var parent = options.parent; //组件的实例对象
		//获取父组件   当前的组件不是抽象组件  
		if (parent && !options.abstract) {
			//第一个非抽象组件的父组件  true   parent.$parent
			while (parent.$options.abstract && parent.$parent) {
				parent = parent.$parent;
			}
			parent.$children.push(vm); //自动侦测过程
		}
		vm.$parent = parent; // $parent 的值指向父级
		//设置$root  
		vm.$root = parent ? parent.$root : vm;

		vm.$children = []; //当前实例的子组件实例数组
		vm.$refs = {};

		vm._watcher = null;
		vm._inactive = null;
		vm._directInactive = false;
		vm._isMounted = false; //是否挂载
		vm._isDestroyed = false; //是否销毁
		vm._isBeingDestroyed = false; //是否正在销毁

	}

	function initState(vm) {
		var opts = vm.$options;
		if (opts.props) {
			initProps(vm, opts.props);
		}
		if (opts.methods) {
			initMethods(vm, opts.methods);
		}
		if (opts.computed) {
			initComputed(vm, opts.computed);
		}
		if (opts.data) {
			initData(vm);
		} else {
			observe(vm._data = {}, true);
		}
	}

	function initMixin(Vue) {
		Vue.prototype._init = function(options) {
			var vm = this;
			//有多少个Vue的实例对象
			vm._uid = uid++;
			vm._isVue = true;
			//合并选项
			vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options, vm);
			//渲染函数的作用域代理
			initProxy(vm);
			//将当前实例添加到父实例的$children 属性中  并设置自身的 $parent 属性指向父实例
			initLifecycle(vm);
			callHook(vm, "beforeCreate");
			//数据初始化
			initState(vm);
			callHook(vm, "create");
			if (this.$options.el) {
				vm.$mount(this.$options.el);   //挂载组件
			}
		}
	}

	function Vue(options) {
		//安全机制
		if (!(this instanceof Vue)) {
			warn("Vue是一个构造函数 应该用new关键字调用")
		}
		this._init(options); //初始化
	}

	initMixin(Vue); //  初始化选项:  1:规范 2:合并策略

    
	//runtime  $mount   运行时构建  （不包含编译器）   独立构建
	Vue.prototype.$mount = function(el){
		//el = el && document.querySelector(el);
		//挂载组件  把渲染函数生成虚拟DOM 渲染成正真的DOM
		//return mountCompnonet(this, el);   
	}
	
	var mount = Vue.prototype.$mount;   //缓存起来
	
	//完整版  添加了模板编译的功能
	Vue.prototype.$mount = function(el){
		//el = el && document.querySelector(el);
		// 1: 使用template选项 或者 el挂载的DOM节点作为模板编译。
		// 2：模板编译成渲染函数
		//mount.call(this, el);
	}
	//初始化全局配置
	function initExtend(Vue) {
		Vue.extend = function(extendOptions) { //参数对象
			extendOptions = extendOptions || {};
			var Super = this; //Vue
			var Sub = function VueComponent(options) { //构造函数
				this._init(options); //Sub  实例对象
			}
			Sub.prototype = Object.create(Super.prototype);
			Sub.prototype.constructor = Sub;
			//第一次调用Super.options   == Vue.options
			//第二次调用Super.options    == sub.options    Super  === Sub
			Sub.options = mergeOptions(Super.options, extendOptions);
			Sub.extend = Super.extend;
			return Sub;
		}
	}
	initExtend(Vue);
	return Vue;
});
