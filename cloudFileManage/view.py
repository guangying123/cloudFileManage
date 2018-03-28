# -*-coding:utf-8 -*-
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from gridfs import *
import pymongo
import os

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
    #create collection
    try:
        client = pymongo.MongoClient('localhost',27017)
        db = client.cloudfiledb
        result = db.userAccount.find({"username": username,"password": password})
        if result.count() == 0:
            return HttpResponse("123")  #### login fail
        else:
            return HttpResponse(result)  ### login success
    except Exception as e:
            return HttpResponse(e)

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
        result = db.userAccount.find({"username": username, "password": password})
        if result.count() == 0:
            db.userAccount.insert({"username": username, "password": password})
            return HttpResponse("regist successful")
        else:
            return HttpResponse("alert('Account is occupied')")
    except Exception as e:
        return HttpResponse(e)



def uploadfilepage(request):
    return render(request,'UploadFile.html');

@csrf_exempt
def uploadfile(request):
    if request.method == 'GET':
        return HttpResponseRedirect('/uploadfilepage/')
    # myfile = request.FILES['myfile']
    # name = myfile.name
    client = pymongo.MongoClient('localhost', 27017)
    db = client.cloudfiledb
    # fs = GridFS(db,"theWorkingDead.mp4")
    fs = GridFS(db, "mytest")
    # fs.put(myfile)
    data = ""
    for grid_out in fs.find({"md5": "17a6a432e9dc65a26c49b7f5c2ae2429"}):
        data =  grid_out.readchunk()
        # data = grid_out.read()
    document = open("myfile.txt","ab")
    document.write(data)
    return HttpResponse("123")
    return HttpResponse(db.fs.chunks.find({},{"_id": 1,"files_id": 1,"n": 1}))

    # return HttpResponse(db.fs.files.find({"_id":'5ab64d8a5df69e21dcfc3abc'}))
    # return HttpResponse(str(myfile.size) + " "+ myfile.name + " ")

    # return HttpResponse(request.FILES,content_type='application/json; charset=utf-8')







