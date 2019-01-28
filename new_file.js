shouldObserve &&      开关
(Array.isArray(value) || isPlainObject(value)) &&
Object.isExtensible(value) &&   //data
!value._isVue  vue 实例的标志

_isVue  vue 实例的标志

Object.isExtensible(value) 一个对象是否可扩展

??? 有没有 哪些方法控制对象不可扩展?

data:{       
	test:1,
	list:{
		b:1,   //不会做深度的观测   b
	}
},

data.test = 2;

 dep.depend();   //依赖的收集  完成     被检测的字段属性值被修改的时候触发
 
 
if(childOb){    //test  == childOb  list == Observe 的实例对象
childOb.dep.depend();   //依赖的收集  完成
}

//给数据对象添加新的属性的时候触发
Vue.set(list,{
	
});

//   set

var  data = {
	  test:1,
	  list:{
		 b:2,
	  }
}

var  data = {
	  test:1,
	  list:{
		 b:2,
	  },
	  __ob__:{value:ob, dep:Dep}
}

	  test:1,
	  __ob__:{value:ob, dep:Dep},
	  
	  list:{
	  		 b:2,
			 __ob__:{value:ob, dep:Dep},
	  },
	  
	  b:2,
	  __ob__:{value:ob, dep:Dep},