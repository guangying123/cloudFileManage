# -*-coding:utf-8 -*-
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import json
import pymongo
import bson.binary
from cStringIO import StringIO

def login(request):
    return render( request,'Home.html')

@csrf_exempt
def userlogin(request):
    if request.method == 'GET':
        return HttpResponseRedirect('/home/')
    username = request.POST["username"]
    password = request.POST["password"]
    if username is None or password is None:
        return HttpResponseRedirect('/home/')
    if len(username) == 0 or username.strip() == "" or len(password) == 0 or password.strip() == "" :
        return HttpResponseRedirect('/home/')
    try:
        client = pymongo.MongoClient('localhost',27017)
        db = client.cloudfiledb
        result = db.userAccount.find({"username": username,"password": password})
        if result.count() == 0:
            return HttpResponse(json.dumps({"error": -1}))  #### login fail
        else:
            return HttpResponse(json.dumps({"error": 0}))  ### login success
    except Exception as e:
            return HttpResponse(json.dumps({"error": -2}))  ### server busy

@csrf_exempt
def regist(request):
    if request.method == 'GET':
        return HttpResponseRedirect('/home/')
    username = request.POST["username"]
    password = request.POST["password"]
    if username is None or password is None:
        return HttpResponseRedirect('/home/')
    if len(username) == 0 or username.strip() == "" or len(password) == 0 or password.strip() == "":
        return HttpResponseRedirect('/home/')
    try:
        client = pymongo.MongoClient('localhost', 27017)
        db = client.cloudfiledb
        result = db.userAccount.find({"username": username})
        if result.count() == 0:
            db.userAccount.insert({"username": username, "password": password})
            db[username + "fileinfo"].insert({"filename":"ignore", "path": "/root"})
            return HttpResponse(json.dumps({"error": 0}))
        else:
            return HttpResponse(json.dumps({"error": -1})) # Account invalid
    except Exception as e:
        return HttpResponse(json.dumps({"error": -2}))



def uploadfilepage(request):
    return render(request,'UploadFile.html');


@csrf_exempt
def createfloor(request):
    username = request.POST["username"]
    floorname = request.POST["floorname"]
    path = request.POST["path"]
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    db[username + "fileinfo"].insert({"filename": floorname,"path": path})
    return HttpResponse("ok")




@csrf_exempt
def uploadfilefiles(request):
    if request.method == 'GET':
        return HttpResponseRedirect('/uploadfilepage/')
    fileinfo = json.loads(request.POST['files'])
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    filename = fileinfo["filename"]
    md5 = fileinfo["_id"]
    try:
        resu =  db[fileinfo['username'] + "fileinfo"].find_one({"filename": filename,"path": fileinfo["path"]})
        if resu is None:
            db[fileinfo['username'] + "fileinfo"].insert(fileinfo)
            db[fileinfo['username'] + "fileinfo"].remove({"filename": "ignore","path": fileinfo["path"]})
            return HttpResponse(json.dumps({"Uploaded": []}))
        elif resu["_id"] == md5:
            final_n = []
            resu_n =  db[fileinfo['username'] + "filedata"].find({"file_id": md5},{"n": 1})
            for ele in resu_n:
                global final_n
                final_n.append(ele["n"])
            return HttpResponse(json.dumps({"Uploaded":final_n}))
        else:
            db[fileinfo['username'] + "fileinfo"].remove({"filename": filename})
            db[fileinfo['username'] + "fileinfo"].insert(fileinfo)
            db[fileinfo['username'] + "filedata"].remove({"file_id": md5})
            return HttpResponse(json.dumps({"Uploaded": []}))
    except Exception as e:
        return HttpResponse(e)



@csrf_exempt
def uploadfilechunks(request):
    if request.method == 'GET':
        return HttpResponseRedirect('/uploadfilepage/')
    chunks = json.loads(request.POST['chunks'])
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    db[chunks['username'] + "filedata"].insert(chunks);
    return HttpResponse(chunks['username'])

def historyfiles(request):
    username = request.GET['username']
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    resu = db[username + "fileinfo"].find()
    historyfilelist = []
    try:
        for ele in resu:
            global historyfilelist
            path = "/root"
            if ele.has_key('path'):
                path = ele["path"]
            tmpinfo = {"filename": ele["filename"],"path": path}
            historyfilelist.append(tmpinfo)
        return HttpResponse(json.dumps(historyfilelist))
    except Exception as e:
        return HttpResponse(e)

@csrf_exempt
def downloadfile(request):
    filename = request.POST['filename']
    username = request.POST['username']
    path = request.POST['path']
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    resu = db[username + "fileinfo"].find_one({"filename": filename,"path": path})
    return HttpResponse(json.dumps(resu))

@csrf_exempt
def downloadchunk(request):
    username = request.POST.get("username", "")
    file_id = request.POST.get("file_id", "")
    n = request.POST.get("n", "")
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    try:
        resu = db[username + "filedata"].find_one({"file_id": file_id,"n": int(n)})
        return HttpResponse(resu["data"] )
        # return HttpResponse(username)
    except Exception as e:
        return HttpResponse(e)

def ztree(request):
    return render(request, 'Mytest_jqtree.html');

def MytestStream(request):
    return render(request, 'MytestStream.html');


@csrf_exempt
def testupload(request):
    filename = request.POST['filename']
    data = request.POST['data']
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    resu = db["testupload"].insert({"filename": filename,"data": data})
    return HttpResponse("Happy")

def testblob(request):
    return render(request, 'testblob.html');

@csrf_exempt
def mytestpost(request):
    filename = request.POST['name']
    data = request.POST['data']
    # return HttpResponse(data)
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    coll = db.image
    coll.save(dict(
        content=bson.binary.Binary(bytes(data)),
        filename='117.txt'
    ))
    return HttpResponse(filename)

    # filename = 'F:/my_upload_test/011112.jpg'.decode('utf-8')
    # with open(filename, 'rb') as myimage:
    #     content = StringIO(myimage.read())
    #     coll.save(dict(
    #         content=bson.binary.Binary(content.getvalue()),
    #         filename='hehe.jpg'
    #     ))
    return HttpResponse(filename)


def getFile(request):
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    coll = db.image
    data = coll.find_one({'filename':'117.txt'})
    # out = open('F:/456.jpg'.decode('utf-8'),'wb')
    # out.write(data['content'])
    # out.close()
    return HttpResponse(data['content'])










