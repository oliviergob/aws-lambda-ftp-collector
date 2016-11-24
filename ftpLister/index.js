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
    var c = new Client();
    var sns = new AWS.SNS();

    var downloadFile = function(file, callback) {
      var fileName = file.fileName;
      var fullPath = path+"/"+fileName;



      var message = {FullFileName: path+"/"+fileName, file:{path : path, fileName : fileName, size : file.size}, source: event.source, dest: event.dest};

      var docClient = new AWS.DynamoDB.DocumentClient();

      var params = {
          TableName: "FTP_FILES_TO_COLLECT",
          Item: message
      };

      console.log("Sending "+fileName+" to dynamoDb");
      docClient.put(params, callback);

    /*  console.log("Sending "+fileName+" to SNS queue");

      var params = {
          Message: JSON.stringify(message),
          TopicArn: "arn:aws:sns:us-east-1:546190104433:FILES_TO_FTP_COLLECT"
      };
      sns.publish(params, callback);
*/
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
