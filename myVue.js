(function (global, factory) {
    typeof exports === 'object' && typeof module != 'undefined' ?
        module.exports = factory() : typeof defind == 'function' && defind.amd ?
        defind(factory()) : (global.Vue = factory());
})(this, function () {
    //全局报错函数
    var warn = function (message) {
        console.error("[Vue Warn]:" + message);
    };
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
    
    var noop = function () {
        
    };

    function isPlainObject(value) {
        return toString.call(value) === '[object Object]'
    }

    function assetObjectType(name, value) {
        //判断是不是一个对象
        if (!isPlainObject(value)) {
            warn("选项" + name + "的值无效：必须是一个对象")
        }
    }

    function extend(to, _form) {
        for (var key in _form) {
            to[key] = _form[key]
        }
        return to;
    }

    //判断属性是否存在
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var hasOwn = function (obj, key) {
        return hasOwnProperty.call(obj, key);
    };
    var uid = 0;

    //合并构造函数默认的选项
    function resolveConstructorOptions(Con) {
        var options = Con.options;
        return options;
    }

    //检测组件
    function checkComponents(options) {
        for (var key in options.components) {
            //检测组件的名称
            validataComponentName(key);
        }
    }

    //检测kry是否在makeMap中
    function makeMap(str, toLowerCase) {
        var map = {};
        var list = str.split(',');
        for (var i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }

        return toLowerCase ? function (val) {
            return map[val.toLowerCase()]
        } : function (val) {
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

    //配置对象
    var config = {
        //自定义策略
        optionMergeStrategies: {}
    };
    var strats = config.optionMergeStrategies;
    strats.el = function (parent, child, vm, key) {
        if (!vm) {//子组件
            warn("选项" + key + "只能在Vue实例中使用");
        }
        return defaultStrat(parent, child);
    };

    function mergeData(to, from) {
        if (!from) {
            return to
        }
    }

    function mergeDataOrFn(parentVal, childVal, vm) {
        if (!vm) {
            //合并处理 parentVal childVal 对应的值都应该是函数
            if (!childVal) {
                return parentVal
            }
            if (!parentVal) {
                return childVal
            }
            return function mergeDataFn(parentVal, childVal, vm) { //只是一个函数 什么样的情况下使用 加入响应式系统
                return mergeData(//合并子组件 父组件对应的函数
                    typeof childVal === 'function' ? childVal.call(this, this) : childVal,
                    typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
                )
            }
        } else {//vue实例
            return function mergeInstanceDataFn() {
                var instanceData = typeof childVal === 'function' ? childVal.call(vm, vm) : childVal;
                var defaultData = typeof parentVal === 'function' ? parentVal.call(vm, vm) : parentVal;

                if (instanceData) {
                    return mergeData(instanceData, defaultData)
                } else {//如果vue实例没有转入data，使用默认的 undefind
                    return defaultData;
                }
            }
        }
    }

    strats.data = function (parentVal, childVal, vm) {
        if (!vm) {//子组件
            if (childVal && typeof childVal !== 'function') {
                warn("data选项的值为function返回组件中的每个实例")
            }
            return mergeDataOrFn(parentVal, childVal);//数据合并
        }
        return mergeDataOrFn(parentVal, childVal, vm);
    };

    function mergeHook(parentVal, childVal) {
        return childVal ?
            parentVal ?
                parentVal.concat(childVal) :
                Array.isArray(childVal) ? childVal : [childVal] : parentVal;
    }

    //钩子函数自定义策略
    LIFECYCLE_HOOKS.forEach(function (hook) {
        strats[hook] = mergeHook;
    });

    function mergeAssets(parentVal, childVal, vm, key) {
        var res = Object.create(parentVal || null);//在新的对象上面扩展子组件 并且通过_proto_找到内置的方法
        if (childVal) {
            //检测子组件的规范 是不是个对象
            assetObjectType(key, childVal);
            return extend(res, childVal)
        }
        return res;
    }

    //资源选项 自定义策略
    ASSET_TYPES.forEach(function (type) {
        strats[type + 's'] = mergeAssets;
    });

    //watch
    strats.watch = function (parentVal, childVal, vm, key) {
        if (!childVal) {
            return Object.create(parentVal || null)
        }
        assetObjectType(key, childVal);
        if (!parentVal) {
            return childVal
        }
        var res = {};
        extend(res, parentVal);
        for (var key in childVal) {
            var parent = res[key]; //parent有可能为undefined
            var child = childVal[key];
            if (parent && !Array.isArray(parent)) {
                parent = [parent]
            }
            res[key] = parent ? parent.concat(child) : Array.isArray(child) ? child : [child];

        }
        return res;
    };

    //1、parentVal undefined child test{type:null} 2、parentVal test{type:null}  child test{type:null}
    strats.props = function (parentVal, childVal, vm, key) {
        if (!parentVal) {
            return childVal;
        }
        var res = Object.create(null);
        extend(res, parentVal);
        if (childVal) {
            extend(res, childVal) // childVal 覆盖 parentVal
        }
        return res
    };

    //内置标签
    var isbuiltInTag = makeMap("slot,component", true);
    var isReservedTag = function (tag) {
        return isSVG(tag) || isHTMLTag(tag);
    };

    function defaultStrat(parent, child) {
        return child === undefined ? parent : child
    }

    function validataComponentName(key) {
        //1:不能使用slot component 2:不能使用html || svg 属性名称
        //2：规范组件的名称必须是由字母或中横线组成，且必须是由字母开头
        if (!/^[a-zA-z][\w-$]*/.test(key)) {
            warn("规范组件的名称必须是由字母或中横线组成，且必须是由字母开头")
        }
        //检测是否使用html、svg标签
        if (isbuiltInTag(key) || isReservedTag(key)) {
            warn("不要把内置组件或者保留的html ||svg 元素作为组件的id: " + key);
        }

    }

    var camelizeReg = /-(\w)/g;

    //将中横线命名为驼峰命名
    function camelize(str) {
        return str.replace(camelizeReg, function (_, c) {
            return c ? c.toUpperCase() : ''
        })
    }

    function normalizeProps(options) {
        var props = options.props;
        if (!props) {
            return;
        }
        var res = {};
        var i, val, name;
        if (Array.isArray(props)) {
            i = props.length;
            while (i--) {
                val = props[i];
                name = camelize(val);
                if (typeof val === 'string') {
                    //将其统一转换为object格式
                    res[name] = {
                        type: null
                    }
                } else {
                    warn("使用数组语法时：props的成员必须为字符串");
                }
            }
        } else if (isPlainObject(props)) {
            for (var key in props) {
                val = props[key];
                name = camelize(key);
                res[name] = isPlainObject(val) ? val : {type: null};
            }
        } else {
            warn("选项props的值无效：应该为数组或者对象");
        }
        options.props = res;
    }

    //合并选项 并返回新的对象
    function mergeOptions(parent, child, vm) {
        //规范检测 components props inject directives
        checkComponents(child);//检测components
        normalizeProps(child);//规范化props
        var options = {};
        var key;
        //合并选项
        for (key in parent) {
            mergeFiled(key);
        }
        for (key in child) {
            if (!hasOwn(parent, key)) {
                mergeFiled(key);
            }
        }

        //默认策略
        function mergeFiled(key) {
            var result = strats[key] || defaultStrat;
            options[key] = result(parent[key], child[key], vm, key);
        }

        return options;
    }

    function isReserved(str) {
        var c = (str).charCodeAt(0); //Unicode编码
        return c === 0x24 || c === 0x5F;
    }

    var allowedGlobals = makeMap(
        'Infinity,undefined,NaN,isFinite,isNaN,' +
        'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
        'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
        'require' // for Webpack/Browserify
    );

    function warnNonPresent(target, key) {
        warn("属性或者方法" + key + "未在实例对象上定义 渲染功能正在尝试访问不存在的属性");
    }

    function isNative(Ctor) {
        return typeof Ctor === 'function' && /native code/.test(Proxy.toString())
    }

    var hasProxy = typeof Proxy !== 'undefined' && isNative(Proxy);
    var hasHandler = {
        has: function (target, key) {//测试环境
            //判断是否在实例上定义属性活着 方法
            var has = key in target;
            //判断是否是全局属性 渲染函数 内置方法
            var isAllowed = allowedGlobals(key) || (typeof key === 'string' && key.charAt(0) === "_");
            if (!has && !isAllowed) {
                warnNonPresent(target, key);
            }
            return has;
        }
    };
    var getHandler = {
        get: function (target, key) {
            if (typeof key === 'string' && !(key in target)) {
                warnNonPresent(target, key);
            }
            return target[key]
        }
    };

    function initProxy(vm) {
        if (hasProxy) {
            var options = vm.$options;
            //渲染函数 拦截哪些操作
            var handlers = options.render && options.render_withStripped ?
                getHandler :
                hasHandler;
            vm._renderProxy = new Proxy(vm, handlers);
        } else {

        }

    }

    function initLifecycle(vm) {
        var options = vm.$options;
        //parent 父实例的引用 父组件
        var parent = options.parent; //组件的实例对象
        //获取父组件 当前组件不是抽象组件
        if (parent && !options.abstract) {
            //获取第一个非抽象组件的父组件
            while (parent.$options.abstract && parent.$parent) {
                parent = parent.$parent;
            }
            parent.$children.push(vm) //自动侦测过程
        }
        vm.$parent = parent;  //$parent 的值指向父级
        //设置root
        vm.$root = parent ? parent.root : vm;
        vm.$children = []; //当前实例的子组件实例数组
        vm.$refs = {};

        vm._watcher = null;
        vm._inactive = null;
        vm._directInactive = null;
        vm._isMounted = false; //是否挂载
        vm._isDestroyed = false; //是否销毁
        vm._isBeingDestroyed = false; //是否正在销毁

    }
    var sharedProperty = {
        enumerable:true,
        configurable:true,
        get:noop,
        set:noop
    };
    function proxy(target,data,key) {
        sharedProperty.get = function (){
            console.log('监听到你访问我了')
            return this[data][key];
        };
        sharedProperty.set = function (val){
            console.log('监听到你设置了')
            this[data][key] = val;
        };
        Object.defineProperty(target,key,sharedProperty);
    }

    function callHook(vm, hook) {
        //获取钩子 然后执行钩子里面的函数
        var handler = vm.$options[hook];
        if (handler) {
            for (var i = 0; i < handler.length; i++) {
                //调用钩子里面的函数，将this vue实例
                handler[i].call(vm)
            }
        }
    }

    //获取data,将data this指向vm实例
    function getData(data,vm) {
        return data.call(vm,vm);
    }

    function initData(vm) {
        //获取到options的data
        var data = vm.$options.data;
        data = vm._data = typeof data === 'function' ? getData(data, vm) : data || {};
        if (!isPlainObject(data)) {
            data = {};
            warn("data选项值应该是object对象")
        }

        var keys = Object.keys(data);
        //代理之前要判断methods、props是否与data的key重名，有则报错
        var methods = vm.$options.methods;
        var props = vm.$options.props;
        var i = keys.length;
        while (i--) {
            var key = keys[i];
            //是否与methods重名
            if (methods && hasOwn(methods, key)) {
                warn("methods" + key + "选项已经定义为data的属性");
            }
            //是否与props重名
            if (props && hasOwn(props, key)) {
                warn("props" + key + "选项已经定义为data的属性");
            } else if (!isReserved(key)) {//是否是内置的属性
                proxy(vm,'_data',key)
            }
        }
    }

    function observe(vm, data) {

    }

    function initState(vm) {
        var opts = vm.$options;
        if (opts.propts) {
            initPropts(vm, opts.propts);
        }
        if (opts.methods) {
            initMethods(vm, opts.methods)
        }
        if (opts.computed) {
            initComputed(vm, opts.computed)
        }
        //如何vm实例上面还没有data,则需要将options的data代理到vm实例上面
        if (opts.data) {
            initData(vm);
        } else {
            //如果已经在vm实例上面有data,则需要将的data进行监听就可以了
            observe(vm, '_data', true)
        }
    }

    //初始化
    function initMixin(Vue) {
        Vue.prototype._init = function (options) {
            var vm = this;
            vm._ui = uid++;
            //合拼选项
            vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options, vm);
            //渲染函数的作用域代理
            initProxy(vm);
            //将当前实例添加到父实例的$children属性中 并设置自身的$parent属性指向父实例
            initLifecycle(vm);
            //调用钩子函数
            callHook(vm, 'beforeCreate');
            //数据初始化
            initState(vm);
        }
    }

    function Vue(options) {
        //判断是否通过new关键字来创建Vue实例
        if (!(this instanceof Vue)) {
            warn("Vue是一个构造函数,应该用new关键字调用");
        }
        //初始化
        this._init(options);
    }

    //初始化选项 1:规范 2.合拼策略
    initMixin(Vue);
    //全局的api
    Vue.options = {
        components: {
            //内置组件
            keepAlive: {},
            transition: {},
            transitionGroup: {}
        },
        directives: {},
        _base: Vue
    };

    //初始化全局配置
    function initExtent(Vue) {
        Vue.extend = function (extendOptions) {
            extendOptions = extendOptions || {};
            var Super = this;
            var Sub = function VueComponent() {//构造函数
                this._init();
            };
            Sub.prototype = Object.create(Super.prototype);
            Sub.prototype.constructor = Sub;
            Sub.options = mergeOptions(Super.options, extendOptions);
            Sub.extend = Super.extend;
            return Sub;
        }
    }

    initExtent(Vue);
    return Vue;
});