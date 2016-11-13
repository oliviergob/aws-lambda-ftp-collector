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
          var myErrorObj = {
              errorType : "InternalServerError",
              httpStatus : 500,
              requestId : context.awsRequestId,
              message : "Error while downlowing "+fullPath+" "+err
          }
          callback(JSON.stringify(myErrorObj));
          return;
        }


        var write_stream = fs.createWriteStream("/tmp/"+fileName);

        stream.pipe(write_stream);

        stream.on('close',function() {
          write_stream.close();
          var fileSize = write_stream.bytesWritten;

          var read_stream = fs.createReadStream("/tmp/"+fileName);

          console.log("Sending "+fileName+" To S3 bucket "+s3Bucket);
          var params = {Bucket: s3Bucket, Key: fileName , Body: read_stream};
          s3.putObject(params, function(err, data) {
            if (err) {
              console.error("Error while uploading "+fullPath+" to s3 bucket "+s3Bucket);
              console.error(err);
              var myErrorObj = {
                  errorType : "InternalServerError",
                  httpStatus : 500,
                  requestId : context.awsRequestId,
                  message : "Error while uploading "+fullPath+" to s3 bucket "+s3Bucket+": "+err
              }
              callback(JSON.stringify(myErrorObj));
            }
            console.log(fileName+" sent to S3 bucket "+s3Bucket);
            file.status = "s3";
            file.bucketName = s3Bucket;
            file.size = fileSize;
            callback(null, file);
          });

        });

      });

    });

    c.on('error', (err) => {
      console.error("Error whith ftp connection");
      console.error(err);
      var myErrorObj = {
          errorType : "InternalServerError",
          httpStatus : 500,
          requestId : context.awsRequestId,
          message : "Error whith ftp connection: "+err
      }
      callback(JSON.stringify(myErrorObj));
    });

    c.connect(config);

};
