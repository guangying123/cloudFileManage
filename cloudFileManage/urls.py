"""cloudFileManage URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Import the include() function: from django.conf.urls import url, include
    3. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))
"""
from django.conf.urls import url
from django.contrib import admin
from . import  view
from django.conf import settings

import os
from django.conf.urls.static import static


urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'home/', view.login),  #login in page
    url(r'login/',view.userlogin),  #usercheck and longin
    url(r'regist/',view.regist), #regist
    url(r'uploadfilepage/',view.uploadfilepage),
    url(r'uploadfilefiles/',view.uploadfilefiles),
    url(r'uploadfilechunks/',view.uploadfilechunks),
    url(r'historyfiles/', view.historyfiles),
    url(r'downloadfile/', view.downloadfile),
    url(r'downloadchunk/', view.downloadchunk),
    url(r'ztree/', view.ztree),
    url(r'Stream/', view.MytestStream),
    url(r'testupload/', view.testupload),
    url(r'createfloor/', view.createfloor),
    url(r'mytestpost/', view.mytestpost),
    url(r'testblob/', view.testblob),
    url(r'getFile/', view.getFile),
    url(r'nodedownload/', view.nodedownload),
    url(r'nodepost/', view.nodepost),
]

#static resources config
if settings.DEBUG:
    media_root = os.path.join(settings.BASE_DIR,'templates')
    print settings.BASE_DIR
    print media_root
    urlpatterns += static('/templates/', document_root=media_root)