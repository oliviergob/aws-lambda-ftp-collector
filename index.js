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


    // TODO - The s3.putObject are getting stuck without that call
    console.log("Testing if we have write permission");
    var s3par = {Bucket: 'ogob-lambda-test'};
    s3.headBucket(s3par, function(err, data) {
      console.log(err, data);
    });


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
          var write_stream = fs.createWriteStream("/tmp/"+fileName);

          stream.pipe(write_stream);

          stream.on('close',function() {
            write_stream.close();

            var read_stream = fs.createReadStream("/tmp/"+fileName);

            console.log("Sending "+fileName+" To S3");
            var params = {Bucket: 'ogob-lambda-test', Key: fileName , Body: read_stream};
            s3.putObject(params, function(err, data) {
              console.log(err, data);
            });

          });

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
