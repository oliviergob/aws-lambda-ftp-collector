'use strict';


exports.handler = (event, context, callback) => {

    var Client = require('ftp');
    var fs = require('fs');

    var file = event.file;
    var fileName = file.fileName;
    var path = file.path;
    var config = event.source;
    var s3Bucket = event.dest.bucketName;
    console.log('Path =', path);

    const AWS = require('aws-sdk');
    console.log('Creating S3 connection');
    const s3 = new AWS.S3();
    console.log('Creating ftp connection');
    var c = new Client();


    c.on('ready', function() {

      var fullPath = path+"/"+fileName;

      console.log("Downloading "+fullPath);
      c.get(fullPath, function(err, stream) {
        if (err) {
          console.error("Error while downlowing "+fullPath);
          console.error(err);
          callback(err);
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
