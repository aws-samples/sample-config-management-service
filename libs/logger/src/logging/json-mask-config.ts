// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

// placeholder for json field masking
export const jsonMaskConfig = {
  cardFields: ['credit', 'debit'],
  emailFields: ['primaryEmail', 'secondaryEmail'],
  passwordFields: ['password'],
  phoneFields: ['homePhone', 'workPhone'],
  stringMaskOptions: {
    maskWith: '*',
    maskOnlyFirstOccurance: false,
    values: ['This'],
  },
  stringFields: ['addressLine1', 'addressLine2'],
  uuidFields: ['uuid1'],
  genericStrings: [
    {
      fields: ['randomStrings.row1'],
      config: {
        maskWith: '*',
        unmaskedStartCharacters: 2,
        unmaskedEndCharacters: 3,
        maxMaskedCharacters: 8,
      },
    },
    {
      fields: ['randomStrings.row2.*'],
      config: { maskWith: 'X', unmaskedEndCharacters: 1 },
    },
    { fields: ['randomStrings.row3.key1'] },
    {
      fields: ['randomStrings.row3.key3.*'],
      config: { maskWith: '@', unmaskedEndCharacters: 1 },
    },
  ],
};
