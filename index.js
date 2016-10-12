'use strict';

console.log('Loading function');

exports.handler = (event, context, callback) => {

    var JSFtp = require("jsftp");
    var fs = require('fs');

    var remotePath = event.remotePath;
    var mask = event.mask;
    var config = event.config;
    console.log('remotePath =', remotePath);
    console.log('Mask =', mask);

    var re = new RegExp(mask);

    const AWS = require('aws-sdk');
    console.log('Creating S3 connection');
    const s3 = new AWS.S3();


    var ftp = new JSFtp(config);
    var filesToDownLoad = [];
    var fileName;

    var myFunction = function(err, stream) {
      if (err) throw err;
      console.dir("My Stream"+stream);
      console.log("About to Download "+remotePath);
      stream.pipe(fs.createWriteStream("/tmp/temp.test"));
    }


    ftp.ls(remotePath, function(err, res) {
      res.forEach(function(file) {
        fileName = file.name;
        if (re.test(fileName))
        {
          console.log("Downloading "+fileName);
          ftp.get(remotePath+"/"+fileName, '/tmp/'+fileName, function(hadErr) {
            if (hadErr)
              console.error('There was an error retrieving the file.'+hadErr);
            else
              console.log('File copied successfully!');
          });
        }
        else {
          console.log("Not Downloading "+fileName);
        }
      });
    });

  /*  c.on('ready', function() {
      c.list(remotePath, function(err, list) {
        if (err) throw err;

        for(var i in list){
          fileName = remotePath+"/"+list[i].name;
          filesToDownLoad.push({});
          if (re.test(fileName))
          {
            console.log("Downloading "+fileName);
            c.get(fileName, myFunction);
          }
          else {
            console.log("Not Downloading "+fileName);
          }
        }

        // c.end();
      });
    }); */



  //  c.connect(config);

};
