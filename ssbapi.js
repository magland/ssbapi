var	url=require('url');
var http=require('http');
var ssbconfig=require('./ssbconfig').ssbconfig;	
var ssbutils=require('./ssbutils.js').ssbutils;
var fs=require('fs');
var crypto=require('crypto');
	
http.createServer(function (REQ,RESP) {
	
	var url_parts = url.parse(REQ.url,true);
	var path0=url_parts.pathname;
	
	if (REQ.method == 'OPTIONS') {
		var headers = {};
		// IE8 does not allow domains to be specified, just the *
		// headers["Access-Control-Allow-Origin"] = req.headers.origin;
		headers["Access-Control-Allow-Origin"] = "*";
		headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
		headers["Access-Control-Allow-Credentials"] = false;
		headers["Access-Control-Max-Age"] = '86400'; // 24 hours
		headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
		RESP.writeHead(200, headers);
		RESP.end();
	}
	else if(REQ.method=='GET') {
		console.log ('GET '+path0);
		
		if (path0=='/ssbapi/downloadfile') {
			download_file(RESP,url_parts.query);
		}
		else if (path0=='/ssbapi/downloadtmpfile') {
			download_tmp_file(RESP,url_parts.query);
		}
		else if (path0=='/ssbapi/filestats') {
			get_file_stats(url_parts.query,function(tmp) {
				send_json_response(RESP,tmp);
			});
		}
		
		else if (path0=='/ssbapi/groups') {
			get_groups(url_parts.query,function(tmp) {
				send_json_response(RESP,tmp);
			});
		}
		else if (path0=='/ssbapi/projects') {
			get_projects(url_parts.query,function(tmp) {
				send_json_response(RESP,tmp);
			});
		}
		else if (path0=='/ssbapi/sessions') {
			get_sessions(url_parts.query,function(tmp) {
				send_json_response(RESP,tmp);
			});
		}
		else if (path0=='/ssbapi/acquisitions') {
			get_acquisitions(url_parts.query,function(tmp) {
				send_json_response(RESP,tmp);
			});
		}
		else if (path0=='/ssbapi/files') {
			get_files(url_parts.query,function(tmp) {
				send_json_response(RESP,tmp);
			});
		}
		
		
		else {
			send_json_response(RESP,{success:false,error:'Unrecognized path'});			
		}
	}
	else if(REQ.method=='POST') {
		send_json_response(RESP,{success:false,error:'Unrecognized method: POST'});			
	}
	
}).listen(ssbconfig.listen_port);
console.log ('Listening on port '+ssbconfig.listen_port);

function send_json_response(RESP,obj) {
	RESP.writeHead(200, {"Access-Control-Allow-Origin":"*", "Content-Type":"application/json"});
	RESP.end(JSON.stringify(obj));
}

function get_groups(query,callback) {
	var user0=current_user(query);
	var path0=ssbconfig.data_path+'/groups';
	var dirs=ssbutils.get_all_dirs(path0);
	var dirs2=[];
	for (var i in dirs) {
		if (has_group_access(user0,dirs[i],'read')) dirs2.push(dirs[i]);
	}
	callback({success:true,groups:dirs2});
}

function get_projects(query,callback) {
	var user0=current_user(query);
	if (!has_group_access(user0,query.group,'read')) {
		callback({success:false,error:'User '+user0+' does not have read access to '+query.group});
		return;
	}
	var path0=ssbconfig.data_path+'/groups/'+query.group+'/projects';
	var dirs=ssbutils.get_all_dirs(path0);
	callback({success:true,projects:dirs});
}

function get_sessions(query,callback) {
	var user0=current_user(query);
	if (!has_group_access(user0,query.group,'read')) {
		callback({success:false,error:'User '+user0+' does not have read access to '+query.group});
		return;
	}
	var path0=ssbconfig.data_path+'/groups/'+query.group+'/projects/'+query.project+'/sessions';
	var dirs=ssbutils.get_all_dirs(path0);
	callback({success:true,sessions:dirs});
}

function get_acquisitions(query,callback) {
	var user0=current_user(query);
	if (!has_group_access(user0,query.group,'read')) {
		callback({success:false,error:'User '+user0+' does not have read access to '+query.group});
		return;
	}
	var path0=ssbconfig.data_path+'/groups/'+query.group+'/projects/'+query.project+'/sessions/'+query.session+'/acquisitions';
	var dirs=ssbutils.get_all_dirs(path0);
	callback({success:true,acquisitions:dirs});
}

function get_files(query,callback) {
	var user0=current_user(query);
	if (!has_group_access(user0,query.group,'read')) {
		callback({success:false,error:'User '+user0+' does not have read access to '+query.group});
		return;
	}
	var path0=ssbconfig.data_path+'/groups/'+query.group+'/projects/'+query.project+'/sessions/'+query.session+'/acquisitions/'+query.acquisition+'/files';
	var files=ssbutils.get_all_files(path0);
	callback({success:true,files:files});
}



/* FILES **********************************************************/

function download_tmp_file(RESP,query) {
	RESP.setHeader('Content-disposition','attachment; filename='+query.file_name);
	RESP.setHeader('Content-type','application/octet-stream');
	var filestream=fs.createReadStream(ssbconfig.data_path+'/tmp/'+query.file_name);
	filestream.pipe(RESP);
}

function download_file(RESP,query) {
	if (ssbutils.get_file_suffix(query.file)=='dat') {
		send_json_response(RESP,{success:false,error:'unable to serve .dat file'});
		return;
	}
	var path0=wdconfig.data_path+'/groups/'+query.group+'/projects/'+query.project+'/sessions/'+query.session+'/acquisitions/'+query.acquisition+'/files/'+query.file;
	if (!wdutils.file_exists(path0)) {
		send_json_response(RESP,{success:false,error:'file does not exist'});
		return;
	}
	//RESP.writeHead(200,'application/octet-stream');
	RESP.setHeader('Content-disposition','attachment; filename='+query.file);
	RESP.setHeader('Content-type','application/octet-stream');
	var SS=fs.createReadStream(path0);
	SS.pipe(RESP);
}
function get_file_stats(query,callback) {
	var path0=ssbconfig.data_path+'/groups/'+query.group+'/projects/'+query.project+'/sessions/'+query.session+'/acquisitions/'+query.acquisition+'/files';
	var files0=ssbutils.get_all_files(path0);
	var file0='';
	for (var i in files0) {
		if (ssbutils.get_file_suffix(files0[i])=='dat') {
			file0=files0[i];
		}
	}
	if (!file0) {
		send_json_response(RESP,{success:false,error:'Unable to find .dat file'});
		return;
	}
	compute_sha1_sum_of_file(path0,function(tmp) {
		if (!tmp.success) {
			callback(tmp);
			return;
		}
		var ret={success:true};
		ret.sha1=tmp.sha1;
		var stats=fs.statSync(path0);
		ret.size=stats.size;
		callback(ret);
	});
}

function compute_sha1_sum_of_file(path,callback) {
	var ret=crypto.createHash('sha1');
	var s=fs.createReadStream(path);
	s.on('data',function(d) {ret.update(d);});
	s.on('end',function() {callback({success:true,sha1:ret.digest('hex')});});
	s.on('error',function(err) {callback({success:false,error:JSON.stringify(err)});});
}

