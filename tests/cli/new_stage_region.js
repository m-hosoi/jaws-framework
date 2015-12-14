'use strict';

/**
 * JAWS Test: Dash Command
 */

var Jaws = require('../../lib/index.js'),
    CmdNewStageRegion = require('../../lib/commands/new_stage_region'),
    JawsError = require('../../lib/jaws-error'),
    testUtils = require('../test_utils'),
    utils = require('../../lib/utils'),
    Promise = require('bluebird'),
    path = require('path'),
    shortid = require('shortid'),
    assert = require('chai').assert;

var config = require('../config'),
    projPath,
    JAWS;

describe('Test "new stage/region" command', function() {

  before(function(done) {
    this.timeout(0);

    return testUtils.createTestProject(
        config.name,
        config.stage,
        config.region,
        config.domain,
        config.iamRoleArnLambda,
        config.iamRoleArnApiGateway)
        .then(function(pp) {
          projPath = pp;
          process.chdir(projPath);
          JAWS = new Jaws();
          done();
        });
  });

  describe('Positive tests', function() {

    it('Create New Stage', function(done) {
      this.timeout(0);

      CmdNewStageRegion.run(JAWS, 'stage', config.stage2, config.region, config.noExecuteCf)
          .then(function() {
            var jawsJson = utils.readAndParseJsonSync(path.join(process.cwd(), 'jaws.json'));
            var region = false;
            for (var i = 0; i < jawsJson.stages[config.stage2].length; i++) {
              var stage = jawsJson.stages[config.stage2][i];
              if (stage.region === config.region) {
                region = stage.region;
              }
            }
            assert.isTrue(region !== false);
            done();
          })
          .catch(JawsError, function(e) {
            done(e);
          })
          .error(function(e) {
            done(e);
          });
    });

    it('Create New region', function(done) {
      this.timeout(0);

      CmdNewStageRegion.run(JAWS, 'region', config.stage2, config.region2, config.noExecuteCf)
          .then(function() {
            var jawsJson = utils.readAndParseJsonSync(path.join(process.cwd(), 'jaws.json'));
            var region = false;
            for (var i = 0; i < jawsJson.stages[config.stage2].length; i++) {
              var stage = jawsJson.stages[config.stage2][i];
              if (stage.region === config.region2) {
                region = stage.region;
              }
            }
            assert.isTrue(region !== false);
            done();
          })
          .catch(JawsError, function(e) {
            done(e);
          })
          .error(function(e) {
            done(e);
          });
    });
  });
});