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

	if(obj.kind == "upload") { // 走上传的逻辑
		upload(obj.username,obj.filepath,obj.file_id,obj.filelength,obj.n,obj.alreadychunks,obj.chunkSize)
	}else { // 走文件下载的逻辑
		download(obj.filedata,obj.username,obj.chunkSize)
	}

	response.write("abc");
	response.end();
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
			}).catch(err => {
				console.log(err);
			})
		}
	},500)
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
				var resu = new Buffer(JSON.parse(resubuf));

				// fs.writeFile('diaoge.png', resu, (err) => {
				// 	if (err) throw err;
				// 	console.log('The file has been saved!');
				// });

				try {
					let WSoptions = {
						start: n*chunkSize,
					}
					if(n > 0) {
						WSoptions.flags = "r+";
					}
					let WStream = fs.createWriteStream(filename,WSoptions)
					WStream.write(resu);
					// WStream.close();
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
	var chunks_n = Math.ceil(filedata.length/filedata.chunkSize);
	var file_id = filedata._id;
	var DLpromiseall = [];
	for(let curindex = 0;curindex < chunks_n;curindex++) {
		DLpromiseall.push(downloadpromise(username,file_id,curindex,filedata.filename,chunkSize));
	}
	var mytimer = setInterval(() => {
		if(DLpromiseall.length == chunks_n) {
			clearInterval(mytimer);
			Promise.all(DLpromiseall).then(vales=>{
				console.log(vales);
				console.log("all download")
			}).catch(err =>{
				console.log(err);
				console.log("下载失败");
			})
		}
	},500)
}