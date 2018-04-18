"use strict";
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;

function  sandbox_download(filename) {
    var fileSystemObj = {
        fs          : null,
        size        : 1024, // 5242880 5M
        errorHandler:function(e){
            switch (e.name) {
                case 'QuotaExceededError':
                    break;
                case 'NotFoundError':
                    break;
                case 'SecurityError':
                    break;
                case 'InvalidStateError':
                    break;
                case 'InvalidModificationError':
                    break;
                default:
            }
            console.warn(e.name);
            console.log(e);
        },
         //读取根目录下的文件
        readerFile:function(file,callBack){
            fileSystemObj.fs.root.getFile(file, {create: true}, function(fileEntry) {
                console.log(3);
                fileEntry.file(function(file) {
                    console.log(4);
                    var reader = new FileReader();
                    reader.onloadend = function() {
                        typeof callBack == 'function' && callBack.call(fileEntry,this.result);
                    };
                    reader.readAsText(file);
                }, fileSystemObj.errorHandler);
            }, fileSystemObj.errorHandler);
        },
        initialize  : function(filename) {
            window.requestFileSystem(TEMPORARY, this.size, function (fs) {
                fileSystemObj.fs = fs;
                fileSystemObj.readerFile(filename,function(text){
                    console.log(text);
                });
            })
        }
    };

  if(window.requestFileSystem) {
        navigator.webkitTemporaryStorage.queryUsageAndQuota(function (usage, quota) {
            if (!quota) {
                console.log(1);
                navigator.webkitTemporaryStorage.requestQuota(fileSystemObj.size, function () {
                    fileSystemObj.initialize();
                }, fileSystemObj.errorHandler);
            }else{
                console.log(2)
                fileSystemObj.initialize();
            }
        });
    }else{
        alert("请使用chrome浏览器浏览!");
    }
}

