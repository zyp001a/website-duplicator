#!/usr/bin/env node
var http = require('http');
var fs = require('fs');
var path = require('path');
var cp = require("child_process");
var file = require("./lib/file");
var webreq = require("./lib/webreq");
var port = 6174;
var url = require("url");
var host = url.parse(process.argv[2]);
var prefix = "websites/";
if(fs.existsSync("record.json")){
	var record = fs.readFileSync("record.json");
}
file.mkdirpSync(host.host+ host.pathname);
http.createServer(function(req, res) {
	console.log(req.url);
	console.log(req.method);
	if(req.url == "/"){
		copyAndSendFile(host.href, prefix + host.host + host.pathname  + "/index.html", res);
	}else{
		var href = host.protocol + "//" + host.hostname + req.url;
		copyAndSendFile(href, prefix + host.host + url.parse(req.url).pathname, res);
	}
}).listen(port, function(err){
  if(err) console.log(err);
  else console.log("listen to port "+port);
});
function copyAndSendFile(href, fname, res){
	console.log(href);
	console.log(fname);
  if(!downloaded(fname)){
		file.mkdirpSync(path.dirname(fname));
    webreq.get(href, function(err, result, headers){
			for(var key in headers){
				res.setHeader(key, headers[key]);
			}
			res.writeHead(result.statusCode);
			fs.writeFileSync(fname, result.data);
			sendFile(fname, res);
    });
  }else{
    sendFile(fname, res);
  }
}
function downloaded(fname){
	
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
