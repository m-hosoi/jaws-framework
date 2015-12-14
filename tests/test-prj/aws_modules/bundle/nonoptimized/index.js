'use strict';

//Testing how the top npm modules work with no optimization
//https://www.npmjs.com/browse/depended

var AWS = require('aws-sdk'),
    ld = require('lodash'),
    async = require('async'),
    request = require('request'),
    us = require('underscore'),
    moment = require('moment'),
    uuid = require('node-uuid'),
    path = require('path'),
    Promise = require('bluebird');

require('dotenv').config({path: path.join(eval('__dirname'), '..', '..', '..', '.env'), silent: true});

module.exports.run = function(event, context, cb) {
  console.log('about to run');

  var s3 = Promise.promisifyAll(new AWS.S3());
  s3.listBucketsAsync()
      .then(function(data) {
        //console.log('s3 buckets', data);
        return ld.dropRight([1, 2, 3]);
      })
      .then(function(a) {
        console.log('ld drop', a);

        var urls = [
          {url: 'https://www.google.com'},
          {url: 'https://twitter.com/'},
        ];

        return new Promise(function(resolve, reject) {
          var q = async.queue(function(task, callback) {
            request(task.url, function(error, response, body) {
              callback(error);
            });
          }, 2);

          q.drain = function() {
            resolve(urls);
          };

          q.push(urls, function(e) {
            if (e) {
              throw new Error(e.message);
            }
          });
        });
      }).then(function(urls) {
        return us.each(urls, function(url) {
          console.log('each', url);
        });
      })
      .then(function() {
        console.log('moment', moment().format());
        console.log('v1', uuid.v1());
        console.log('v4', uuid.v4());

        console.log('env vars', process.env);
        return 'done not optimized';
      })
      .then(function(d) {
        return cb(null, d);
      })
      .catch(function(e) {
        console.log(e);
        return cb(e, null);
      });
};
