^^
deps.http = 1;
deps.fs = 1;
deps.path = 1;
deps.requestx = 1;
deps.mvSync =1;
deps.mkdirpSync =1;
deps.url = 1;
$$
var port = 6174;
var _nodeBin = process.argv.shift();
var _dispBin = process.argv.shift();
var flag_refresh = 0;
var rsite ;
var op = process.argv.shift();
while(op){
  switch(op){
  case "-r": {
		flag_refresh = 1;
		break;
	}
	case "-s": {
		rsite = process.argv.shift();
		break;
	}
	}
	op = process.argv.shift();	
}

function strlen(str){
  return new Buffer(str).length;
}

var prefix = "websites/";
if(fs.existsSync("record.json")){
	var record = fs.readFileSync("record.json");
}
http.createServer(function(req, res) {
	console.log("req: " + req.url);
	var remote = convertReq(req.url, "remote");
	if(!remote) {
		res.writeHead(404); res.end("Please type a correct address!");
		return;
	}
	var fname;
	fname = convertReq(req.url, "local", req.method);
	if(fname.match(/\?/))
		fname = ".query";
	if(fs.existsSync(fname) && fs.statSync(fname).isDirectory())	
		fname = fname + "/index.html";
  if(!cached(fname)){
		var dirf= path.dirname(fname);
//  if(cached(fname)){
		if(fs.existsSync(dirf) && fs.statSync(dirf).isFile()){
			mvSync(dirf, dirf+".tmp");
			mkdirpSync(dirf);
			mvSync(dirf + ".tmp", dirf+"/index.html");
		}else{
			mkdirpSync(dirf);
		}	
		console.log(req.headers.cookie);
		var config = {
      url: remote,
      method: req.method,
			headers: {
				'user-agent': req.headers['user-agent'],
				cookie: req.headers.cookie
			}
    };
		console.log("downloading "+remote);
    requestx.ajax(config, function(err, result, info){
			console.log("done");
			var ct = info.headers["content-type"];
			if(ct && (ct.match("image") || ct.match("video"))){
				for(var key in info.headers){
					res.setHeader(key, info.headers[key]);
				}
				fs.writeFileSync(fname, result, 'binary');
			}else{
				result = modifyhref(result, remote);
				for(var key in info.headers){
					if(key.match(/content-length/i)) continue;
					res.setHeader(key, info.headers[key]);
				}
				res.setHeader("content-length", strlen(result));
				fs.writeFileSync(fname, result);
			}
			res.writeHead(info.statusCode);
			sendFile(fname, res);
    });
  }else{
		console.log("send cache "+fname);
    sendFile(fname, res);
  }
}).listen(port, function(err){
  if(err) console.log(err);
  else console.log("listen to port "+port);
});

function cached(fname){
	if(flag_refresh) return false;
	return fs.existsSync(fname) && fs.statSync(fname).isFile();
}
//url converter
function convertReq(urlx, to, method){
	var m = urlx.match(/\/(https?)\/([^\/\?]+)(\S+)?/);

	if(!m) {
		if(rsite){
			var parsed = url.parse(rsite);
			if(to == "local"){
				mkdirpSync('tmp');
				return "tmp" +  urlx;
			}
			else if(to == "remote")
				return rsite + urlx;
			
		}
		return null;
	}
	var protocol = m[1];
	var host = m[2];
	var apath = m[3] || "";
	if(to == "local"){
		if(apath == "" || apath[apath.length-1] == "/")
			return  prefix + protocol + "/" + host + "/" + method + "/index.html";
		return prefix + protocol + "/" + host + "/" + method + apath.replace("?", "/?");
	}else if(to == "remote"){
		return protocol + "://" + host + apath;
	}
}

function modifyhref(data, remote){
	data = data.replace(/(src|href|content)=([\'\"])(\S+)([\'\"])/g, function(match, p1, p2, p3, p4){
		return p1+'='+ p2 + getaddr(remote, p3) + p4;
	});
	return data;
}
function getaddr(remote, src){

	if(src.match(/^http/)){
		return convertUrl(src, "req");
	}
	if(rsite) return src;
	if(src.match(/^\/\//)){
		console.log(src);
		console.log("/" + convertUrl(remote, "reqhost") + src.substr(1))
		return convertUrl(remote, "reqhost") + src.substr(1);
	}
	if(src[0] == "/"){
		return convertUrl(remote, "reqhost") + src;
	}
	return convertUrl(remote, "reqhost") + "/"+src;
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
