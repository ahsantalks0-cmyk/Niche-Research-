'use strict';

/**
 * NRD · agents/index.js — Department Agent Registry (35 Agents)
 */

const criteriaParser = require('./criteriaParser');

module.exports = {
  criteriaParser,
  parseRun: criteriaParser.parseRun,
};
