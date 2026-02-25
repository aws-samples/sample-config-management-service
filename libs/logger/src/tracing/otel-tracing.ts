// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import * as process from 'process';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';

import * as dotenv from 'dotenv';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

dotenv.config();

const traceExporter = new ZipkinExporter({
  serviceName: process.env.SERVICE_NAME,
  url: process.env.OTLP_EXPORTER_URL,
});

const generateEndpoint = () => {
  const version = Number(process.env.SERVICE_VERSION);
  const serviceName = process.env.SERVICE_NAME;
  const endpoint = '/api/v' + version + '/' + serviceName + '/metrics';
  return endpoint;
};

const prometheusExporter = new PrometheusExporter({
  port: 3030,
  endpoint: generateEndpoint() ?? '/metrics',
});

const consoleSpanExporter = new SimpleSpanProcessor(new ConsoleSpanExporter());

export const otelSDK = new NodeSDK({
  metricReader: prometheusExporter,
  spanProcessors: [new SimpleSpanProcessor(traceExporter), consoleSpanExporter],
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION,
  }),
  traceExporter: traceExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new WinstonInstrumentation(),
    new NestInstrumentation(),
  ],
});
