var fs=require('fs');

var ssbutils={};

ssbutils.mkdir=function(path) {
	try {
		fs.mkdirSync(path);
	}
	catch(err) {
	}
	return ssbutils.dir_exists(path);
};

ssbutils.dir_exists=function(path) {
	var stat0;
	try {
		stat0=fs.statSync(path);
	}
	catch(err) {
		return false;
	}
	return stat0.isDirectory();
};

ssbutils.file_exists=function(path) {
	var stat0;
	try {
		stat0=fs.statSync(path);
	}
	catch(err) {
		return false;
	}
	return stat0.isFile();
};

ssbutils.delete_file=function(path) {
	try {
		fs.unlinkSync(path);
		return true;
	}
	catch(err) {
		return false;
	}
};

ssbutils.delete_directory=function(path) {
	var dirs=ssbutils.get_all_dirs(path);
	var files=ssbutils.get_all_files(path);
	for (var i in dirs) {
		if (!ssbutils.delete_directory(path+'/'+dirs[i])) return false;
	}
	for (var i in files) {
		if (!ssbutils.delete_file(path+'/'+files[i])) return false;
	}
	try {
		fs.rmdirSync(path);
		return true;
	}
	catch(err) {
		return false;
	}
};

ssbutils.rename_file=function(path1,path2) {
	try {
		fs.renameSync(path1,path2);
		return true;
	}
	catch(err) {
		return false;
	}
};

ssbutils.rename_directory=function(path1,path2) {
	try {
		fs.renameSync(path1,path2);
		return true;
	}
	catch(err) {
		return false;
	}
};

ssbutils.write_json_file=function(path,obj) {
	try {
		var json=JSON.stringify(obj);
		fs.writeFileSync(path,json);
		return true;
	}
	catch(err) {
		return false;
	}
};

ssbutils.read_json_file=function(path,obj) {
	try {
		var json=fs.readFileSync(path);
		return JSON.parse(json);
	}
	catch(err) {
		return {};
	}
};


ssbutils.get_all_dirs=function(path) {
	try {
		var files=fs.readdirSync(path);
		var ret=[];
		for (var i in files) {
			if (files[i].indexOf('.')!==0) {
				if (ssbutils.dir_exists(path+'/'+files[i]))
					ret.push(files[i]);
			}
		}
		return ret;
	}
	catch(err) {
		return [];
	}
};

ssbutils.get_all_files=function(path) {
	try {
		var files=fs.readdirSync(path);
		var ret=[];
		for (var i in files) {
			if (files[i].indexOf('.')!==0) {
				if (ssbutils.file_exists(path+'/'+files[i]))
					ret.push(files[i]);
			}
		}
		return ret;
	}
	catch(err) {
		return [];
	}
};

ssbutils.make_random_id=function(numchars) {
	if (!numchars) numchars=10;
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for( var i=0; i < numchars; i++ ) text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
};

exports.ssbutils=ssbutils;