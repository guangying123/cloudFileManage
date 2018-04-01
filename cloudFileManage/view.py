# -*-coding:utf-8 -*-
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import json
import pymongo

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
            return HttpResponse(json.dumps({"error": 0}))
        else:
            return HttpResponse(json.dumps({"error": -1})) # Account invalid
    except Exception as e:
        return HttpResponse(json.dumps({"error": -2}))



def uploadfilepage(request):
    return render(request,'UploadFile.html');

@csrf_exempt
def uploadfilefiles(request):
    if request.method == 'GET':
        return HttpResponseRedirect('/uploadfilepage/')
    fileinfo = json.loads(request.POST['files'])
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    db[fileinfo['username']+"fileinfo"].insert(fileinfo);
    return HttpResponse(fileinfo['username'])

@csrf_exempt
def uploadfilechunks(request):
    if request.method == 'GET':
        return HttpResponseRedirect('/uploadfilepage/')
    chunks = json.loads(request.POST['chunks'])
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    db[chunks['username'] + "filedata"].insert(chunks);
    return HttpResponse(chunks['username'])




