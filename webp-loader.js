
var loaderUtils = require('loader-utils');
var fs = require('fs')


 function readFile(fileName){
     return new Promise((resolve,reject)=>{
         fs.readFile(fileName, ((err, data) => {
             if (err) {
                reject(err)
             }else {
                 resolve(data)
             }
         }));
     })
}

function createHash(_self,content,query){
    return loaderUtils.interpolateName(_self, query.name || "[hash].[ext]", {
        content: content,
        regExp: query.regExp
    })
}


module.exports = async function(content) {
    this.cacheable && this.cacheable();
    if (!this.emitFile) throw new Error("emitFile is required from module system");
    //异步调用
    var callback = this.async();
    var called = false;
    //获取配置参数
    var query = loaderUtils.getOptions(this);
    var  resourcePath = this.resourcePath
    var reg=/^[\s\S]+(_.webp)$/g
    if (reg.test(resourcePath)) {
        var originImg = resourcePath.replace(/^[\s\S]+(_.webp)$/g,($1,$2)=>{
            return $1.replace($2,'')
        });
        var url;
        //处理姓名
        if (fs.existsSync(originImg)) {
            let  resultContent = await readFile(originImg).catch(err=>callback(err))
            url = createHash(this,resultContent,query)
            let reg = /^([\s\S]+)(\.[a-zA-Z]+)_\.([\s\S]{8})(\.webp$)/g
             url = url.replace(reg,($1,$2,$3,$4)=>{
                return `${$2}.${$4}${$3}_.webp`
            })
            //是webp就不输出内容了
            callback(null, "module.exports = __webpack_public_path__ + " + JSON.stringify(url) + ";");
        }else {
            url = createHash(this,content,query)
            this.emitFile(url, content);
            callback(null, "module.exports = __webpack_public_path__ + " + JSON.stringify(url) + ";");
        }
    }else {
        url = createHash(this,content,query)
        let webpName = this.resourcePath + "_.webp"
        if (fs.existsSync(webpName)) {
             let resultContent = await readFile(webpName).catch(err=>callback(err))
            //输出源文件
            this.emitFile(url, content);
            this.emitFile(`${url}_.webp`, resultContent);
            callback(null, "module.exports = __webpack_public_path__ + " + JSON.stringify(url) + ";");
        }else {
            this.emitFile(url, content);
            callback(null, "module.exports = __webpack_public_path__ + " + JSON.stringify(url) + ";");
        }
    }

};

module.exports.raw = true;
