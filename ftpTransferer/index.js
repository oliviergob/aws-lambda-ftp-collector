'use strict';


exports.handler = (event, context, callback) => {

    var Client = require('ftp');
    var fs = require('fs');

    var message = JSON.parse(event.Records[0].Sns.Message);


    var file = message.file;
    var fileName = file.fileName;
    var path = file.path;
    var config = message.source;
    var s3Bucket = message.dest.bucketName;
    console.log('Path =', path);

    const AWS = require('aws-sdk');
    console.log('Creating S3 connection');
    var s3Stream = require('s3-upload-stream')(new AWS.S3());
    console.log('Creating ftp connection');
    var c = new Client();

    var upload = s3Stream.upload({
      "Bucket": s3Bucket,
      "Key": fileName
    });




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
          c.end();
          upload.end();
          callback(JSON.stringify(myErrorObj));
          return;
        }


        stream.pipe(upload);

        upload.on('error', (err) => {
          console.error("Error whith S3 upload");
          console.error(err);
          var myErrorObj = {
              errorType : "InternalServerError",
              httpStatus : 500,
              requestId : context.awsRequestId,
              message : "Error whith S3 upload: "+err
          }
          stream.end();
          c.end();
          upload.end();
          callback(JSON.stringify(myErrorObj));
          return;
        });


        upload.on('uploaded', function (details) {
          console.log(fileName+" sent to S3 bucket "+s3Bucket+" with size "+file.size);
          file.status = "s3";
          file.bucketName = s3Bucket;
          stream.end();
          c.end();
          upload.end();
          callback(null, file);
          console.log("I just called the callback Method but I am still running");
          return;
        });


        stream.on('close',function() {
          // TODO - not sure this is always going to be called
          file.size = stream.bytesRead
          console.log("Closed stream");
          return;
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
      c.end();
      callback(JSON.stringify(myErrorObj));
      return;
    });

    c.connect(config);

};
