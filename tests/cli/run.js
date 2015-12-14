'use strict';

/**
 * JAWS Test: Run Command
 */

var Jaws = require('../../lib/index.js'),
    CmdRun = require('../../lib/commands/run'),
    testUtils = require('../test_utils'),
    path = require('path'),
    assert = require('chai').assert;

var config = require('../config'),
    projPath,
    JAWS;

describe('Test "run" command', function() {

  before(function(done) {
    testUtils.createTestProject(
        config.name,
        config.stage,
        config.region,
        config.domain,
        config.iamRoleArnLambda,
        config.iamRoleArnApiGateway)
        .then(function(pp) {
          projPath = pp;
          process.chdir(path.join(projPath, 'aws_modules', 'sessions', 'show'));
          JAWS = new Jaws();
          done();
        });

  });

  after(function(done) {
    done();
  });

  describe('Positive tests', function() {
    it('Test run command', function(done) {
      this.timeout(0);

      CmdRun.run(JAWS, config.stage)
          .then(function(d) {
            done();
          })
          .error(function(e) {
            done(e);
          });
    });
  });
})
