# cloudFileManage
基于Django和MongoDB的云文件管理系统


运行项目:
  1.运行项目前确保mongodb已启动，可通过cd到mongod.exe文件所在目录下执行：mongod.exe --dbpath  dbpath(启动mongodb数据库，dbpath为数据库所在目录，
    例如我的是在：F:\cloudFileManageMongoDBData\db,dapath就为F:\cloudFileManageMongoDBData\db)
  2.运行该项目，克隆该项目，安装完所需的依赖，然后cd到该项目的根目录下执行python manage.py runserver 0.0.0.0:8000
  3.该项目一共涉及到三部分，浏览器部分，本地服务器部分和远程服务器，根据用户上传或下载的文件大小来决定，如果文件大小在3M以内，则无需启动本地的服务
    器NS_server,否则需要启动本地服务器，在NS_server所在目录下执行:node NS_server命令即可

