function Lue(options){
  // 初始化基本的属性
  this.$options = options
  this.$el = document.querySelector(options.el)
  this.$data = options.data
  this.$methods = options.methods
  this.$computed = options.computed
  // 初始化绑定的directives
  this.binding = {}
  // 将data改造成observer
  this.parseData()
  // 改变methods的this为当前实例的data
  this.parseFunction()
  // 编译模板
  this.compile(this.$el)
}

Lue.prototype.convert = function(key, val){
  // 获取绑定在该数据项上的directive
  let binding = this.binding[key]
  let computed = this.$computed
  let data = this.$data
  // 对数据项进行改造，主要改造set，使当数据发生变化时，可以自动更新UI
  Object.defineProperty(this.$data, key, {
    enumerable: true,
    configurable: true,
    get: function(){
      return val
    },
    set: function(newVal){
      if(val !== newVal){
        val = newVal
        // 当数据发生变化时，更新绑定在当前数据项上的所有directive
        binding._directives.forEach(function(item){
          item.update()
        })
        for(let key in computed){
          data[key]
        }
      }
    }
  })
}

Lue.prototype.parseData = function(){
  // 改造data对象，如果是基本类型，改造成Observer形式，如果是对象类型，递归
  let obj = this.$data
  let value = null
  for(let key in obj){
    if(obj.hasOwnProperty(key)){
      this.binding[key] = {
        _directives: []
      }
      value = obj[key]
      if(typeof value === 'object'){
        this.parseData(value)
      }
      this.convert(key, value)
    }
  }
}

Lue.prototype.parseFunction = function(){
  // 改造methods里面的函数，核心是将methods的this指向改成当前实例的data对象
  let functionList = this.$methods
  for(let key in functionList){
    if(functionList.hasOwnProperty(key)){
      let func = functionList[key]
      functionList[key] = func.bind(this.$data)
    }
  }
}

Lue.prototype.compile = function(root){
  let self = this
  let nodes = root.children
  for(let i = 0; i < nodes.length; i++){
    let node = nodes[i]
    // 如果节点不是叶子节点，编译这颗子树
    if(node.children.length){
      this.compile(node)
    }
    // 处理节点上的点击事件
    if(node.hasAttribute('@click')){
      let attrVal = nodes[i].getAttribute('@click')
      let { params, methodName } = parseArgs(attrVal)
      node.onclick = function(){
        self.$methods[methodName].apply(self.$data, params)
      }
    }
    // 处理input & textarea类型节点的数据绑定，实现双向绑定
    if(node.hasAttribute('@model') && node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'){
      let attrVal = node.getAttribute('@model')
      self.binding[attrVal]._directives.push(new Directive('input', node, self, attrVal, 'value'))
      node.addEventListener('input', function(){
        self.$data[attrVal] = nodes[i].value
      })
    }
    // 处理bind型的绑定，bind的内容直接作为节点的innerHTML属性
    if(node.hasAttribute('@bind')){
      let attrVal = node.getAttribute('@bind')
      self.binding[attrVal]._directives.push(new Directive('text', node, self, attrVal, 'innerHTML'))
    }
  }
}

// 定义对dom节点的操作
function Directive(name, el, vm, exp, attr){
  this.name = name
  this.el = el
  this.vm = vm
  this.exp = exp
  this.attr = attr
  this.update()
}

// 将更新同步到dom上，本质上是修改dom节点的属性
Directive.prototype.update = function(){
  this.el[this.attr] = this.vm.$data[this.exp]
}

// utils
function parseArgs(expr){
  let attrVal = expr
  let args = /\(.*\)/.exec(attrVal)
  if(args){
    args = args[0]
    attrVal = attrVal.replace(args, '')
    args = args.replace(/[\(|\)|\'|\"]/g, '').split(',')
  }
  else{
    args = []
  }
  return {
    params: args,
    methodName: attrVal
  }
}