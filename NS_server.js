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
	myurl.query = decodeURI(decodeURI(myurl.query));
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
			console.log("第"+curindex+"块 JSON开始")
			let chunkjson = JSON.stringify(chunk);
			chunk = null;
			console.log("第"+curindex+"块 JSON结束")
			let tempcell = {
				data: chunkjson,
				n: curindex,
				file_id: summary,
				username: username,
				length: length
			};
			chunkjson = null;
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
			var threadn = n < 5 ? n : 5;
			var curindex = 0,responseflag = 0,dealgate = true,uploadcount = 0;
			var shouldlen = n-alreadychunks.length;
			var gate = 0;
			if(shouldlen == 0) {
				gate = 0;
			}else {
				if(shouldlen%threadn == 0) {
					gate = threadn;
				}else {
					gate = shouldlen;
				}
			}

			var time1 = setInterval(() =>{
				if(curindex >= n-1) {
					clearInterval(time1);
				}
				if(dealgate) {
					if (uploadcount!=0&&uploadcount % threadn == 0) {
						dealgate = false;
						var time2 = setInterval(() => {
							if (responseflag >= threadn) {
								clearInterval(time2);
								// 继续发起一批请求
								if(curindex < n) {
									dealgate = true;
									responseflag = responseflag - threadn;
								}else {
									clearInterval(time1);
								}
							}
						}, 30);
					}
						if (filelength - start <= chunkSize) {
							end = filelength - 1;
						} else {
							end = start + chunkSize - 1; // 因读取时包含start和end位
						}

						if (alreadychunks.indexOf(curindex.toString()) == -1) {
							uploadcount++;
							let options = {
								flags: 'r',
								highWaterMark: chunkSize,
								start: start,
								end: end
							};
							senddataPromise(filepath, options, username, file_id, curindex, end - start + 1).then(values => {
								responseflag++;
							}).catch(err => {
								throw err;
							})
						}
						start = end + 1;
						curindex++;
				}
			},50)
			let timer = setInterval(() => {
				console.log("当前上传处理第  " + curindex + " 块，" +"第 "+(Math.ceil(uploadcount/threadn))+" 批第  "+ responseflag+" 个数据upload完成")
				if(curindex == n &&responseflag == gate) {
					clearInterval(timer)
					console.log("all down");
					resolve(true)
				}
			},1000)
	})
}

function  doapost(data) {
	return new Promise(function (resolve,reject) {
		let i = data.n;
		console.log("第"+i+"份请求准备发出")
		let contents = queryString.stringify(data);
		// let contents = data
		data = null;
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
			console.log("第"+i+"份请求返回数据")
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
		contents = null;
		console.log("第"+i+"份请求已发出")
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
				var resubuf = Buffer.concat(bufs)
				try {
					var resu = new Buffer(JSON.parse(resubuf));
					let WSoptions = {
						start: n*chunkSize,
						flags: "r+"
					}
					let WStream = fs.createWriteStream(filename,WSoptions)
					WStream.write(resu,function () {
						console.log("第: "+n+" 块下载完成");
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
			console.log(chunks_n)
			var file_id = filedata._id;
			var judgecount = 0,threadn = chunks_n <= 5 ? chunks_n: 5;

			if(fs.existsSync(filedata.filename) == false) { // 如果文件不存在
				var downflag_unexit = true,curindex_unexit = 0;
				var response_unexit = 0;
			//创建对应的文件，为以后createWrite而使用
				fs.open(filedata.filename, "a", (err, fs) => {
					if (err) {
						console.log(err);
						reject(err)
					}
					console.log("create file: "+ filedata.filename)
				})

				var downtime_unexit = setInterval(() => {
					if(curindex_unexit >= chunks_n -1) {
						clearInterval(downtime_unexit);
					}
					if(downflag_unexit) {
						if(curindex_unexit!=0&&curindex_unexit%threadn == 0) {
							downflag_unexit = false;
							var downtime_unexit_response = setInterval(() => {
								console.log("回应值： "+response_unexit)
								if(response_unexit >= threadn) {
									clearInterval(downtime_unexit_response);
									if(curindex_unexit < chunks_n) {
										downflag_unexit = true;
										response_unexit = response_unexit - threadn;
									}else {
										clearInterval(downtime_unexit);
									}
								}
							},30);
						}
						downloadpromise(username,file_id,curindex_unexit,filedata.filename,chunkSize).then(vales =>{
							console.log(vales)
							response_unexit++;
						}).catch(err =>{
							throw err;
						})
						curindex_unexit++;
					}
				},50);
				var unexit_timer = setInterval(() => {
					console.log("正在处理第 "+ curindex_unexit +"块" + "第"+Math.ceil(curindex_unexit/threadn)+"批第 " +response_unexit+" 个数据返回")
					if(curindex_unexit == chunks_n&&response_unexit == threadn) {
						clearInterval(unexit_timer);
							console.log("all download")
							resolve(true)
					}
				},100)
			}else { // 如果文件存在的话
				var downflag_exit = true,curindex_exit = 0,download_exit_count = 0;
				var response_exit = 0;
				var downtime_exit = setInterval(() => {
					if(curindex_exit >= chunks_n -1) {
						clearInterval(downtime_exit);
					}
					if(downflag_exit) {
						if(download_exit_count!=0&&download_exit_count%threadn == 0) {
							downflag_exit = false;
							var downtime_exit_response = setInterval(() => {
								console.log("回应值： "+response_exit)
								if(response_exit >= threadn) {
									clearInterval(downtime_exit_response);
									if(curindex_exit < chunks_n) {
										downflag_exit = true;
										response_exit = response_exit - threadn;
									}else {
										clearInterval(downtime_exit);
									}
								}
							},30);
						}
						let curindex_exit_temp = curindex_exit;
						judgeiexit(filedata.filename,curindex_exit,chunkSize).then(val => {
							if(val == true) {
								download_exit_count++;
								downloadpromise(username,file_id,curindex_exit_temp,filedata.filename,chunkSize).then(ele => {
									response_exit++;
								}).catch(err => {
									reject(err)
									throw err;
									console.log("下载失败!")
								});
							}
						}).catch(err => {
							reject(err)
							throw err;
							console.log("下载失败!")
						})
						curindex_exit++;
					}
				},50)
				var exit_timer = setInterval(() => {
					console.log("正在下载第  "+ curindex_exit +"块" + "  第"+(Math.ceil(download_exit_count/threadn))+"批中第 " +response_exit+" 块返回")
					if(curindex_exit == chunks_n) {
						clearInterval(exit_timer);
						console.log("all download")
						resolve(true)
					}
				},100)
			}
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
