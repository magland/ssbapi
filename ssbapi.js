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



/* FILES **********************************************************/

function download_tmp_file(RESP,query) {
	RESP.setHeader('Content-disposition','attachment; filename='+query.file_name);
	RESP.setHeader('Content-type','application/octet-stream');
	var filestream=fs.createReadStream(ssbconfig.data_path+'/tmp/'+query.file_name);
	filestream.pipe(RESP);
}

function download_file(RESP,query) {
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
	path0=path0+'/'+file0;
	
	var channels,time_points;
	try {
		channels=string_to_list(query.channels);
		time_points=string_to_list(query.time_points);
	}
	catch(err) {
		send_json_response(RESP,{success:false,error:'Error parsing channels or time points'});
		return;
	}
	var total_num_channels=135;
	
	fs.open(path0, 'r', function(status, fd) {
		var total_bytes_written=0;
		if (status) {	
			send_json_response(RESP,{success:false,error:'Error opening file: '+status.message});
			return;
		}
		function read_next_time_point(ind) {
			if (ind>=time_points.length) {
				finalize();
				return;
			}
			read_time_point(ind,function() {
				read_next_time_point(ind+1);
			});
		}
		function read_time_point(ind,cb) {
			var buffer=new Buffer(total_num_channels*2);
			var offset=total_num_channels*2*time_points[ind];
			fs.read(fd,buffer,0,total_num_channels*2,offset,function(err,num_bytes) {
				if (err) {
					finalize();
					return;
				}
				for (var k=0; k<channels.length; k++) {
					RESP.write(buffer.slice(channels[k]*2,channels[k]*2+2));
					total_bytes_written+=2;
				}
				cb();
			});
		}
		RESP.setHeader('Content-disposition','attachment; filename='+query.file_name);
		RESP.setHeader('Content-type','application/octet-stream');
		read_next_time_point(0);
		function finalize() {
			RESP.end();
		}
	});
	
	function string_to_list(str) {
		var list1=str.split(',');
		var ret=[];
		for (var i in list1) {
			var ind0=list1[i].indexOf('-');
			if (ind0>=0) {
				var val1=Number(list1[i].slice(0,ind0));
				var val2=Number(list1[i].slice(ind0+1));
				if (isNaN(val1)) return [];
				if (isNaN(val2)) return [];
				if (val1>val2) return [];
				if (val1<0) return [];
				for (var j=val1; j<=val2; j++) ret.push(j);
			}
			else {
				var val=list1[i];
				if (isNaN(val)) return [];
				if (val<0) return [];
				ret.push(val);
			}
		}
		return ret;
	}
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

