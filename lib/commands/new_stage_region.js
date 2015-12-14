'use strict';

/**
 * JAWS Command: New Region/Stage
 * - Creates a new region, primed with one stage
 * - Creates new stage in existing region
 */

var JawsError = require('../jaws-error'),
    JawsCLI = require('../utils/cli'),
    Promise = require('bluebird'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    AWSUtils = require('../utils/aws'),
    utils = require('../utils');

Promise.promisifyAll(fs);

/**
 *
 * @param JAWS
 * @param type 'stage'|'region'
 * @param stage
 * @param region Optional. Will be prompted for if omitted
 * @param noCf Optional
 * @returns {*}
 */

module.exports.run = function(JAWS, type, stage, region, noCf) {
  var command = new CMD(JAWS, type, stage, region, noCf);
  return command.run();
};

/**
 * Command Class
 * @constructor
 */

function CMD(JAWS, type, stage, region, noCf) {
  this._JAWS = JAWS;
  this._type = type;
  this._stage = stage;
  this._region = region;
  this._noCf = noCf;
  this._spinner = null;
  this._prompts = {
    properties: {},
  };
}

/**
 * CMD: Run
 */

CMD.prototype.run = Promise.method(function() {

  var _this = this;

  return _this._JAWS.validateProject()
      .bind(_this)
      .then(function() {
        // Report Status
        if (_this._type === 'stage') JawsCLI.log('Creating new stage...');
        if (_this._type === 'region') JawsCLI.log('Creating new region...');
      })
      .then(_this._promptStage)
      .then(_this._promptRegion)
      .then(_this._validate)
      .then(function() {
        return utils.generateResourcesCf(
            _this._JAWS._meta.projectRootPath,
            _this._JAWS._meta.projectJson.name,
            _this._JAWS._meta.projectJson.domain,
            _this._stage,
            _this._region,
            '',
            _this._jawsBucket
        );
      })
      .then(function() {

        if (_this._noCf) {
          JawsCLI.log('Remember to run CloudFormation manually');
          JawsCLI.log('!!MAKE SURE!! to create stack with name: ' + AWSUtils.cfGetResourcesStackName(
                  _this._stage,
                  _this._JAWS._meta.projectJson.name
              ));
          JawsCLI.log('After creating CF stack, remember to put the IAM role outputs and jawsBucket in your '
              + 'project jaws.json in the right stage/region.');
          return false;
        } else {
          return _this._createCfStack()
              .bind(_this)
              .then(function(cfData) {
                if (_this._spinner) {
                  _this._spinner.stop(true);
                }
                _this._cfData = cfData;
              })
              .then(_this._putEnvFile)
              .then(_this._putCfFile);
        }
      })
      .then(_this._updateProjectJson);
});

/**
 * CMD: Prompt: Stage
 */

CMD.prototype._promptStage = Promise.method(function() {

  var _this = this;

  if (_this._stage) return;

  if (_this._type === 'stage') {

    // User is creating a stage
    _this.Prompter = JawsCLI.prompt();
    var stageDescription = 'Enter the name of the stage to be created: ' + os.EOL;

    _this._prompts.properties.stage = {
      description: stageDescription.yellow,
      default: 'dev',
      message: 'Stage must be letters only',
      conform: function(stage) {
        var re = /^[a-zA-Z]+$/;
        return re.test(stage);
      },
    };

    // Show Prompt
    return _this.Prompter.getAsync(_this._prompts)
        .then(function(answers) {
          _this._stage = answers.stage;
        });

  } else {

    // User is creating a region
    var stages = Object.keys(_this._JAWS._meta.projectJson.stages);

    // Check if project has stages
    if (!stages.length) {
      throw new JawsError('This project has no stages');
    }

    // If project only has 1 stage, skip prompt
    if (stages.length === 1) {
      _this._stage = stages[0];
      return;
    }

    // Create Choices
    var choices = [];
    for (var i = 0; i < stages.length; i++) {
      choices.push({
        key: (i + 1) + ') ',
        value: stages[i],
        label: stages[i],
      });
    }

    return JawsCLI.select('Which stage are you creating a region for: ', choices, false)
        .then(function(results) {
          _this._stage = results[0].value;
        });
  }
});

/**
 * CMD: Prompt: Region
 */

CMD.prototype._promptRegion = Promise.method(function() {

  var _this = this,
      validRegions = AWSUtils.validLambdaRegions;

  if (validRegions.indexOf(_this._region) != -1) {  //they specified region and its valid
    return Promise.resolve();
  }

  var choices = [];
  validRegions.forEach(function(r) {
    choices.push({
      key: '',
      value: r,
      label: r,
    });
  });

  if (_this._type === 'stage') {
    var msg = 'Choose a region for your new stage:';
  } else {
    var msg = 'Choose a region lambda supports: ';
  }

  return JawsCLI.select(msg, choices, false)
      .then(function(results) {
        _this._region = results[0].value;
      });
});

/**
 * CMD: Validate
 */

CMD.prototype._validate = Promise.method(function() {

  var _this = this;

  // Check project config is valid
  if (!_this._JAWS._meta.projectJson.stages) {
    throw new JawsError('Project\'s jaws.json is malformed or has no existing stages object defined');
  }

  // Check stage and region have been submitted
  if (!_this._stage || !_this._region) {
    throw new JawsError('Stage and region are required');
  }

  // Set JAWS Bucket
  _this._jawsBucket = utils.generateJawsBucketName(_this._stage, _this._region, _this._JAWS._meta.projectJson.domain);

  // Stage Validations
  if (_this._type === 'stage') {

    // Make sure stage is not already defined
    if (_this._JAWS._meta.projectJson.stages[_this._stage]) {
      throw new JawsError('Stage "' + _this._stage + '" is already defined in this project');
    }

    // TODO: Refator: This code throws an error since it looks for a region config containing the bucket, but that region config does not exist
    // Make sure stage is not already defined in s3 env var - don't want to overwrite it
    //var envCmd = require('./env');
    //return envCmd.getEnvFileAsMap(_this._JAWS, _this._stage, _this._region)
    //    .then(function(envMap) {
    //      if (Object.keys(envMap).length > 0) {
    //        throw new JawsError('Stage "' + _this._stage + '" can not be created as an env var file already exists');
    //      }
    //    });
  }

  // Region Validations
  if (_this._type === 'region') {
    if (!_this._JAWS._meta.projectJson.stages[_this._stage]) {
      throw new JawsError('Stage "' + _this._stage + '" is not defined in project jaws.json, can not add region.');
    }

    // Make sure region is not already defined
    if (_this._JAWS._meta.projectJson.stages[_this._stage].some(function(r) {
          return r.region == _this._region;
        })) {
      throw new JawsError('Region "' + _this._region + '" is already defined in the stage "' + _this._stage + '"');
    }
  }

  return Promise.resolve();
});

/**
 * CMD: Create CF Stack
 */

CMD.prototype._createCfStack = Promise.method(function() {

  var _this = this;

  JawsCLI.log('Creating CloudFormation stack for stage: "'
      + _this._stage
      + '" and region: "'
      + _this._region
      + '" (~5 mins)');
  _this._spinner = JawsCLI.spinner();
  _this._spinner.start();

  // Create CF stack
  return AWSUtils.cfCreateResourcesStack(
      _this._JAWS._meta.profile,
      _this._region,
      _this._JAWS._meta.projectRootPath,
      _this._JAWS._meta.projectJson.name,
      _this._stage,
      _this._domain,
      '',  // TODO: read email out of existing jaws-cf.json?
      _this._jawsBucket
  )
      .then(function(cfData) {
        return AWSUtils.monitorCf(cfData, _this._JAWS._meta.profile, _this._region, 'create');
      });

});

/**
 * CMD Put ENV File
 * - Uploads .env file to jawsbucket
 */

CMD.prototype._putEnvFile = Promise.method(function() {

  var _this = this;

  var envFileContents = 'JAWS_STAGE=' + _this._stage
      + '\nJAWS_DATA_MODEL_STAGE=' + _this._stage;

  return AWSUtils.putEnvFile(
      _this._JAWS._meta.profile,
      _this._region,
      _this._jawsBucket,
      _this._JAWS._meta.projectJson.name,
      _this._stage,
      envFileContents);
});

/**
 * CMD: Put CF File
 * - Uploads timestamped CF file to jawsbucket
 */

CMD.prototype._putCfFile = Promise.method(function() {

  var _this = this;

  return AWSUtils.putCfFile(
      _this._JAWS._meta.profile,
      _this._JAWS._meta.projectRootPath,
      _this._region,
      _this._jawsBucket,
      _this._JAWS._meta.projectJson.name,
      _this._stage,
      'resources');

});

/**
 * CMD: Update Project JSON
 */

CMD.prototype._updateProjectJson = Promise.method(function() {

  var _this = this;

  var regionObj = {
    region: _this._region,
    iamRoleArnLambda: '',
    iamRoleArnApiGateway: '',
    jawsBucket: _this._jawsBucket,
  };

  if (_this._cfData) {
    for (var i = 0; i < _this._cfData.Outputs.length; i++) {
      if (_this._cfData.Outputs[i].OutputKey === 'IamRoleArnLambda') {
        regionObj.iamRoleArnLambda = _this._cfData.Outputs[i].OutputValue;
      }

      if (_this._cfData.Outputs[i].OutputKey === 'IamRoleArnApiGateway') {
        regionObj.iamRoleArnApiGateway = _this._cfData.Outputs[i].OutputValue;
      }
    }
  }

  if (_this._JAWS._meta.projectJson.stages[_this._stage]) {
    _this._JAWS._meta.projectJson.stages[_this._stage].push(regionObj);
  } else {
    _this._JAWS._meta.projectJson.stages[_this._stage] = [regionObj];
  }

  return utils.writeFile(
      path.join(_this._JAWS._meta.projectRootPath, 'jaws.json'),
      JSON.stringify(_this._JAWS._meta.projectJson, null, 2));
});
