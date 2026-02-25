// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Schema } from 'dynamoose/dist/Schema';

export const configSchema = new Schema(
  {
    pk: {
      type: String,
      hashKey: true,
      required: true,
    },
    sk: {
      type: String,
      rangeKey: true,
      required: true,
    },
    config: {
      type: Array,
      schema: [
        {
          type: Object,
        },
      ],
      hashKey: false,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    saveUnknown: ['config.**'],
    timestamps: true,
  },
);
