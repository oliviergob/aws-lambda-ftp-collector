'use strict';

console.log('Loading function');

exports.handler = (event, context, callback) => {

    var Client = require('ftp');
    var fs = require('fs');
    var async = require("async");


    var path = event.path;
    var mask = event.mask;
    var config = event.source;
    var s3Bucket = event.dest.bucketName;
    console.log('Path =', path);
    console.log('Mask =', mask);

    var re = new RegExp(mask);

    const AWS = require('aws-sdk');
    console.log('Creating S3 connection');
    const s3 = new AWS.S3();



    var c = new Client();


    var downloadFile = function(file, callback) {
      var fileName = file.fileName;
      if (fileName == 'test_02.txt')
      {
        fileName = 'test_02.txt.top';
      }
      var fullPath = path+"/"+fileName;

      console.log("Downloading "+fullPath);
      c.get(fullPath, function(err, stream) {
        if (err) {
          console.error("Error while downlowing "+fullPath);
          file.status = "bucketName";
          file.error = err.message;
          console.dir(err);
          console.error(err);
          //console.error(err.stack);
          callback(null, file);
          return;
        }


        var write_stream = fs.createWriteStream("/tmp/"+fileName);

        stream.pipe(write_stream);

        stream.on('close',function() {
          write_stream.close();

          var read_stream = fs.createReadStream("/tmp/"+fileName);

          console.log("Sending "+fileName+" To S3 bucket "+s3Bucket);
          var params = {Bucket: s3Bucket, Key: fileName , Body: read_stream};
          s3.putObject(params, function(err, data) {
            if (err) throw err;

            console.log(fileName+" sent to S3 bucket "+s3Bucket);
            file.status = "s3";
            file.bucketName = s3Bucket;
            callback(null, file);
          });

        });

      });

    }

    c.on('ready', function() {
      c.list(path, function(err, list) {
        if (err) terminate(err, null);

        var filesToDownload = [];
        for(var i in list){
          if (re.test(list[i].name))
          {
            filesToDownload.push({fileName: list[i].name, size: list[i].size, status: "remote"});
          }
          else {
            console.log("Ignorninging "+list[i].name);
          }
        }

        /*async.map(filesToDownload, downloadFile, function(err, returnList) {
          if (err) throw err;
          console.dir(returnList);
        });*/

          async.map(filesToDownload, downloadFile, terminate);

        c.end();
      });
    });

    c.on('error', (err) => {
      terminate(err, null);
    });

    c.connect(config);

    var terminate = function(err, data) {
      if (err)
      {
        console.error(err);
        console.error(err.stack);
      }

      callback(err, data);
    }

};
