'use strict';

console.log('Loading function');

exports.handler = (event, context, callback) => {

    var Client = require('ftp');
    var fs = require('fs');
    var async = require("async");

    var path = event.path;
    var mask = event.mask;
    var config = {
      host: process.env[event.sourceId+"_FTP_SERVER"],
      user: process.env[event.sourceId+"_FTP_USER"],
      password: process.env[event.sourceId+"_PASSWORD"]
    };
    var s3Bucket = event.dest.bucketName;
    console.log('Path =', path);
    console.log('Mask =', mask);

    var re = new RegExp(mask);

    const AWS = require('aws-sdk');
    var c = new Client();

    var downloadFile = function(file, callback) {
      var fileName = file.fileName;
      var fullPath = path+"/"+fileName;



      var message = {FullFileName: path+"/"+fileName, payload: JSON.stringify({file: {path : path, fileName : fileName, size : file.size}, sourceId: event.sourceId, dest: event.dest}) };

      var docClient = new AWS.DynamoDB.DocumentClient();

      var params = {
          TableName: "FTP_FILES_TO_COLLECT",
          Item: message
      };

      console.log("Sending "+fileName+" to dynamoDb");
      docClient.put(params, callback);

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
