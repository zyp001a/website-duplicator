#!/usr/bin/env node
var http = require('http');
var fs = require('fs');
var path = require('path');
var cp = require("child_process");
var htmlparser = require("htmlparser");
var file = require("./lib/file");
var webreq = require("./lib/req");
var port = 6174;
var url = require("url");

var prefix = "websites/";
if(fs.existsSync("record.json")){
	var record = fs.readFileSync("record.json");
}
http.createServer(function(req, res) {
	console.log(req.url);
	var remote = convertReq(req.url, "remote");
	if(!remote) {
		res.writeHead(404); res.end("Please type a correct address!");
		return;
	}
	var fname;
	fname = convertReq(req.url, "local", req.method);
	if(fs.existsSync(fname) && fs.statSync(fname).isDirectory())	
		fname = fname + "/index.html";
  if(!cached(fname)){
		var dirf= path.dirname(fname);
		if(fs.existsSync(dirf) && fs.statSync(dirf).isFile()){
			file.mvSync(dirf, dirf+".tmp");
			file.mkdirpSync(dirf);
			file.mvSync(dirf + ".tmp", fdir+"/index.html");
		}else{
			file.mkdirpSync(dirf);
		}
		var config = {
      url: remote,
      method: req.method,
			headers: {
				'user-agent': req.headers['user-agent'],
				cookie: req.headers.cookie				
			}
    };
    webreq.ajax(config, function(err, result, info){
			for(var key in info.headers){
				res.setHeader(key, info.headers[key]);
			}
			res.writeHead(info.statusCode);
			if(info.headers["content-type"] && info.headers["content-type"].match("image")){
				fs.writeFileSync(fname, result, 'binary');
			}else{
				result = modifyhref(result, remote);
				fs.writeFileSync(fname, result);
			}
			sendFile(fname, res);
    });
  }else{
    sendFile(fname, res);
  }
}).listen(port, function(err){
  if(err) console.log(err);
  else console.log("listen to port "+port);
});

function cached(fname){
//	return fs.existsSync(fname) && fs.statSync(fname).isFile();
}
//url converter
function convertReq(urlx, to, method){
	var m = urlx.match(/\/(https?)\/([^\/\?]+)(\S+)?/);
	if(!m) return null;
	var protocol = m[1];
	var host = m[2];
	var apath = m[3] || "";
	if(to == "local"){
		if(apath == "" || apath == "/")
			return  prefix + protocol + "/" + host + "/" + method + "/index.html";
		return prefix + protocol + "/" + host + "/" + method + apath.replace("?", "/?");
	}else if(to == "remote")
		return protocol + "://" + host + apath;
}
function convertUrl(urlx, to){
	var m = urlx.match(/^(https?):\/\/([^\/\?]+)(\S+)?/);
	if(!m) return null;
	var protocol = m[1];
	var host = m[2];
	var apath = m[3] || "";
	if(to == "req")
		return "/" + protocol + "/" + host + apath;
	else if(to == "reqhost")
		return "/" + protocol + "/" + host;
	else if(to == "protocol")
		return protocol;
}

function modifyhref(data, remote){

	data = data.replace(/src=[\'\"](\S+)[\'\"]/g, function(match, p1){
		return 'src="'+ getaddr(remote, p1) + '"';
	});
	data = data.replace(/href=[\"\'](\S+)[\'\"]/g, function(match, p1){
		return 'href="'+ getaddr(remote, p1) + '"';
	});

	data = data.replace(/url\(([^\)]+)\)/g, function(match, p1){
		return 'url(' + getaddr(remote, p1) + ')"';
	});

	return data;
}
function getaddr(remote, src){
	var parsed = url.parse(remote);
	if(src.match(/^http/)){
		return convertUrl(src, "req");
	}if(src.match(/^\/\//)){
		return "/" + convertUrl(remote, "protocol") + src.substr(1);
	}else if(src[0] == "/"){
		return convertUrl(remote, "reqhost") + src;
	}else{
		return src;
	}
}
function sendFile(filePath, res){
	if(fs.existsSync(filePath)){
		var stream = fs.createReadStream(filePath);
		stream.on('error', function() {
			res.writeHead(404);
			res.end("0");
		});
		stream.pipe(res);
	}
	else{
		res.writeHead(404);
    res.end("0");
	}
}
