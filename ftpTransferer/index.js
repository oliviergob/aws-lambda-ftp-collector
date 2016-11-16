'use strict';


exports.handler = (event, context, callback) => {

    var Client = require('ftp');
    var fs = require('fs');

    console.log("WTF "+event);

    var message = JSON.parse(event.Records[0].Sns.Message);
    console.log('Message received from SNS:', message);

    console.dir(message);


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

        var upload = s3Stream.upload({
          "Bucket": s3Bucket,
          "Key": fileName
        });

        upload.on('error', (err) => {
          console.error("Error whith S3 upload");
          console.error(err);
          var myErrorObj = {
              errorType : "InternalServerError",
              httpStatus : 500,
              requestId : context.awsRequestId,
              message : "Error whith S3 upload: "+err
          }
          callback(JSON.stringify(myErrorObj));
        });


        upload.on('uploaded', function (details) {
          console.log(details);
          console.log(fileName+" sent to S3 bucket "+s3Bucket+" with size "+upload.uploadedSize);
          file.status = "s3";
          file.bucketName = s3Bucket;
          callback(null, file);
        });

        stream.pipe(upload);

        stream.on('close',function() {
          // TODO - not sure this is always going to be called
          file.size = stream.bytesRead
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
