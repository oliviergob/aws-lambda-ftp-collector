'use strict';


exports.handler = (event, context, callback) => {
    // Files bigger than 50Mb will be streamed rather than doanloaded to a temporary folder
    const MAX_FILE_UPLOAD = 50*1024*1024;
    var Client = require('ftp');
    var fs = require('fs');

    var message = JSON.parse(event.Records[0].Sns.Message);


    var file = message.file;
    var fileName = file.fileName;
    var fileSize = file.size;
    var path = file.path;
    var config = message.source;
    var s3Bucket = message.dest.bucketName;

    const AWS = require('aws-sdk');
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
          c.end();
          upload.end();
          callback(JSON.stringify(myErrorObj));
          return;
        }

        function streamToS3()
        {

          var s3Stream = require('s3-upload-stream')(new AWS.S3());
          var upload = s3Stream.upload({
            "Bucket": s3Bucket,
            "Key": fileName
          });
          console.log("Streaming "+fileName+" To S3 bucket "+s3Bucket);

          stream.pipe(upload);

          upload.on('error', (err) => {
            console.error("Error whith S3 stream");
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
            return;
          });


          stream.on('close',function() {
            file.size = stream.bytesRead
            return;
          });
        }

        function uploadToS3()
        {

          const s3 = new AWS.S3();
          var write_stream = fs.createWriteStream("/tmp/"+fileName);
          stream.pipe(write_stream);
          stream.on('close',function() {
            write_stream.close();
            file.size = write_stream.bytesWritten;

            var read_stream = fs.createReadStream("/tmp/"+fileName);

            console.log("Uploading "+fileName+" To S3 bucket "+s3Bucket);
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
                read_stream.end();
                c.end();
                return;
              }
              console.log(fileName+" sent to S3 bucket "+s3Bucket+" with size "+file.size);
              file.status = "s3";
              file.bucketName = s3Bucket;
              file.size = fileSize;
              callback(null, file);
              read_stream.close();
              c.end();
              return;
            });
          });
        }

        if (file.size === undefined || file.size == null || file.size <= MAX_FILE_UPLOAD)
          uploadToS3();
        else
          streamToS3();


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
