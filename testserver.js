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
                start: n * chunkSize,
                flags: "r+"
            }
            let WStream = fs.createWriteStream(filename, WSoptions)
            WStream.write(resu, function () {
                console.log("第: " + n + " 块下载完成");
            });
            WStream.end();
            resolve(filename);
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
    res.on("error", function (e) {
        throw e;
    })
}