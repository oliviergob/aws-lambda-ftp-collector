'use strict';

console.log('Loading function');

exports.handler = (event, context, callback) => {

    var Client = require('ftp');
    var fs = require('fs');

    var path = event.path;
    var mask = event.mask;
    var config = event.config;
    console.log('Path =', path);
    console.log('Mask =', mask);

    var re = new RegExp(mask);

    const AWS = require('aws-sdk');
    console.log('Creating S3 connection');
    const s3 = new AWS.S3();


    var c = new Client();
    var filesToDownLoad = [];


    var downloadFile = function(path, fileName) {
      var fullPath = path+"/"+fileName;
      var currentFileName = fileName;
      if (re.test(fileName))
      {
        console.log("Downloading "+fullPath);
        c.get(fullPath, function(err, stream) {
          if (err) throw err;

          console.log("About to Download "+fileName);
          stream.pipe(fs.createWriteStream("/tmp/"+fileName));
        });
      }
      else {
        console.log("Not Downloading "+fullPath);
      }
    }

    c.on('ready', function() {
      c.list(path, function(err, list) {
        if (err) throw err;

        for(var i in list){
          downloadFile(path, list[i].name);
        }

        c.end();
      });
    });

    c.connect(config);

};
