/**
 * Created by Administrator on 2018/4/30.
 */
var http = require('http')
var URL = require("url")
var queryString = require('querystring')
var fs = require("fs")


http.createServer(function (request, response) {
	response.setHeader("Access-Control-Allow-Origin", "*");
	let myurl = URL.parse(request.url);
	console.log(myurl.query)
	let obj = JSON.parse(unescape(myurl.query.split("=")[1]));
	console.log(obj)
	let uploadobj = {
		kind: "",
		status:""
	}
	if(obj.kind == "upload") { // 走上传的逻辑
		uploadobj.kind = "upload";
		upload(obj.username,obj.filepath,obj.file_id,obj.filelength,obj.n,obj.alreadychunks,obj.chunkSize).then(vales => {
			uploadobj.status = "success";
			response.write(JSON.stringify(uploadobj));
			response.end();
		}).catch(err =>{
			uploadobj.status = "fail";
			response.write(JSON.stringify(uploadobj));
			response.end();
			throw err;
		})
	}else { // 走文件下载的逻辑
		uploadobj.kind = "download";
		download(obj.filedata,obj.username,obj.chunkSize).then(values => {
			uploadobj.status = "success";
			response.write(JSON.stringify(uploadobj));
			response.end();
		}).catch(err => {
			uploadobj.status = "fail";
			response.write(JSON.stringify(uploadobj));
			response.end();
			throw err;
		})
	}
}).listen(10001);


/**
 * 文件上传逻辑
 */
function senddataPromise(path,options,username,summary,curindex,length) {
	return new Promise(function (resolve,reject) {
		let readSteam = fs.createReadStream(path,options);
		readSteam.on("data",(chunk) => {
			let chunkjson = JSON.stringify(chunk);
			let tempcell = {
				data: chunkjson,
				n: curindex,
				file_id: summary,
				username: username,
				length: length
			};
			doapost(tempcell).then(values=>{
				resolve(values)
			}).catch(err=>{
				reject(err);
			});
		})
	})
}
function  upload(username,filepath,file_id,filelength,n,alreadychunks,chunkSize) {
	return new Promise(function (resolve,reject) {
			var start = 0,end = 0;
			var promiseall = [];
			for (let curindex = 0;curindex < n;curindex++) {
				if(filelength - start <= chunkSize) {
					end  =  filelength - 1;
				}else {
					end = start+chunkSize - 1; // 因读取时包含start和end位
				}
				if(alreadychunks.indexOf(curindex) == -1) {
					let options = {
						flags: 'r',
						highWaterMark: chunkSize,
						start: start,
						end: end
					};
					promiseall.push(senddataPromise(filepath,options,username,file_id,curindex,end-start+1));
				}
				start = end + 1;
			}
			let timer = setInterval(() => {
				if(promiseall.length == n) {
					clearInterval(timer);
					Promise.all(promiseall).then(values=>{
						console.log(values);
						console.log("all done");
						resolve(true)
					}).catch(err => {
						console.log(err);
						reject(err);
					})
				}
			},500)
	})
}

function  doapost(data) {
	return new Promise(function (resolve,reject) {
		let contents = queryString.stringify(data);
		let options = {
			host: "localhost",
			path: "/nodepost/",
			port: 8000,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': contents.length
			}
		};
		let req = http.request(options, function (res) {
			res.on("data", function (chunk) {
				console.log(chunk.toString());
			});
			res.on("end", function (d) {
				resolve("end");
			});
			res.on("error", function (e) {
				reject(e);
			})
		});
		req.write(contents);
		req.end();
	})
}

/**
 * 文件下载逻辑
 **/
function  downloadpromise(username,file_id,n,filename,chunkSize) {
	return new Promise(function (resolve,reject) {
		let mydata = {
			username: username,
			file_id: file_id,
			n: n
		};
		let contents = queryString.stringify(mydata);
		let options = {
			host: "localhost",
			path: "/nodedownload/",
			port: 8000,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': contents.length
			}
		};
		let req = http.request(options, function (res) {
			let bufs = [];
			res.on("data", function (chunk) {
				bufs.push(chunk)
			});
			res.on("end", function (d) {
				console.log("end")
				var resubuf = Buffer.concat(bufs)
				try {
					var resu = new Buffer(JSON.parse(resubuf));
					let WSoptions = {
						start: n*chunkSize,
						flags: "r+"
					}
					let WStream = fs.createWriteStream(filename,WSoptions)
					WStream.write(resu,function () {
						console.log("This is : "+n);
					});
					WStream.end();
					resolve(filename);
				}catch (err) {
					console.log(err);
					reject(err);
				}
			});
			res.on("error", function (e) {
				throw e;
			})
		});
		req.write(contents);
		req.end();
	})
}

function download(filedata,username,chunkSize) {
	return new Promise(function (resolve,reject) {
			var chunks_n = Math.ceil(filedata.length/filedata.chunkSize);
			var file_id = filedata._id;
			var DLpromiseall = [];
			var judgecount = 0;

			if(fs.existsSync(filedata.filename) == false) { // 如果文件不存在
			//创建对应的文件，为以后createWrite而使用
				fs.open(filedata.filename, "a", (err, fs) => {
					if (err) {
						console.log(err);
						reject(err)
					}
					console.log("create file: "+ filedata.filename)
				})
				for(let curindex = 0;curindex < chunks_n;curindex++) {
					DLpromiseall.push(downloadpromise(username,file_id,curindex,filedata.filename,chunkSize));
					judgecount++;
				}
			}else { // 如果文件存在的话
				for(let curindex = 0;curindex < chunks_n;curindex++) {
					judgeiexit(filedata.filename,curindex,chunkSize).then(val => {
						console.log(val);
						if(val == true) {
							DLpromiseall.push(downloadpromise(username,file_id,curindex,filedata.filename,chunkSize));
						}
						judgecount++;
					}).catch(err => {
						reject(err)
						throw err;
						console.log("下载失败!")
					})
				}
			}
			var mytimer = setInterval(() => {
				if(judgecount == chunks_n) {
					clearInterval(mytimer);
					Promise.all(DLpromiseall).then(vales=>{
						console.log(vales);
						console.log("all download")
						resolve(true)
					}).catch(err =>{
						reject(err)
						console.log(err);
						console.log("下载失败");
					})
				}
			},500)
	})
}

// 用来判断第i分片是否已经存在
function judgeiexit(filepath,i,chunkSize) {
	return new Promise(function (resolve,reject) {
		let flag = true;
		let options = {
			start: i*chunkSize,
			end: (i+1)*chunkSize - 1
		};
		let readStream = fs.createReadStream(filepath,options);
		readStream.on("data",(chunk)=>{
			let chunString = chunk.toString().trim();
			if(!chunString||chunString.length < chunkSize) {
				flag = true;
			}else {
				flag = false;
			}
		})
		readStream.on("close",(ele) => {
			resolve(flag);
		})
		readStream.on("error",(e) => {
			reject(e);
		})
	})
}
