// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import * as dotenv from 'dotenv';
import * as process from 'process';
import { createLogger, format, transports } from 'winston';

dotenv.config();
const env_var = process.env;

// custom log display format
const customFormat = format.printf(({ timestamp, level, stack, message }) => {
  return `${timestamp} - [${level.toUpperCase().padEnd(7)}] - ${stack || message}`;
});

const options = {
  file: {
    filename: 'error.log',
    level: 'error',
  },
  console: {
    level: env_var.LOG_LEVEL || 'info',
  },
};

// logger config; in dev write logs to console
const devLogger = {
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    customFormat,
    format.json(),
  ),
  transports: [new transports.Console(options.console)],
};

// logger config; in test, prod write logs to console and file
const prodLogger = {
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.Console(options.console),
    new transports.File(options.file),
    new transports.File({
      filename: 'combine.log',
      level: 'info',
    }),
  ],
};

// export log instance based on the current environment
console.log('current NODE_ENV=' + env_var.NODE_ENV);
const instanceLogger = env_var.NODE_ENV === 'dev' ? devLogger : prodLogger;

export const instance = createLogger(instanceLogger);
