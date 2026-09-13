'use strict';

/**
 * NRD · agents/index.js — Department Agent Registry (35 Agents)
 */

const criteriaParser = require('./criteriaParser');
const departmentHead = require('./departmentHead');
const qualitySupervisor = require('./qualitySupervisor');
const scheduler = require('./scheduler');
const jarvisGateway = require('./jarvisGateway');

module.exports = {
  departmentHead,
  criteriaParser,
  qualitySupervisor,
  scheduler,
  jarvisGateway,
  parseRun: criteriaParser.parseRun,
};

