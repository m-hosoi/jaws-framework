function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

/**
 *
 * @param lambdaName
 * @param cb
 * @returns {{awsRequestId, invokeid, logGroupName: string, logStreamName: string, functionVersion: string, isDefaultFunctionVersion: boolean, functionName: (*|string), memoryLimitInMB: string, functionVersion: string, succeed: succeed, fail: error, done: (*|Function), getRemainingTimeInMillis: getRemainingTimeInMillis}}
 */
module.exports = function(lambdaName, cb) {
  cb = cb || function() {
      };

  var id = guid(),
      name = lambdaName || 'test-lambda';

  var succeed = function(result) {
    cb(null, result)
  };
  var error = function(error) {
    cb(error, null)
  };

  return {
    awsRequestId: id,
    invokeid: id,
    logGroupName: '/aws/lambda/' + name,
    logStreamName: '2015/09/22/[HEAD]13370a84ca4ed8b77c427af260',
    functionVersion: 'HEAD',
    isDefaultFunctionVersion: true,

    functionName: name,
    memoryLimitInMB: '1024',
    functionVersion: 'HEAD',

    succeed: succeed,
    fail: error,
    done: cb,

    getRemainingTimeInMillis: function() {
      return 5000;
    }
  }
}
