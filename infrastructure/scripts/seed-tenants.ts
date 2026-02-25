#!/usr/bin/env ts-node
/* eslint-disable max-lines */
// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';
const TABLE_NAME = `config-service-${ENVIRONMENT}-configurations`;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const ssmClient = new SSMClient({ region: REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

/**
 * Tenant configuration data
 */
const tenants = [
  {
    tenantId: 'acme-corp',
    name: 'Acme Corporation',
    configs: [
      {
        configType: 'payment-gateway',
        config: [
          {
            amcCode: 'ACME001',
            validations: [{ zeroFundBalance: 'true', minSIPAmount: '500' }],
            paymentGateway: [
              { name: 'Stripe', link: 'https://stripe.com/acme' },
              { name: 'Square', link: 'https://square.com/acme' },
            ],
          },
        ],
      },
      {
        configType: 'api-settings',
        config: [
          {
            amcCode: 'ACME001',
            validations: [{ zeroFundBalance: 'false', minSIPAmount: '1000' }],
            paymentGateway: [],
          },
        ],
      },
    ],
    ssmParams: [
      {
        key: `/config-service/acme-corp/${ENVIRONMENT}/api/api-key`,
        value: 'acme-secret-key-123-demo',
        description: 'API key for Acme Corp',
      },
      {
        key: `/config-service/acme-corp/${ENVIRONMENT}/api/endpoint`,
        value: 'https://api.acme-corp.com/v1',
        description: 'API endpoint for Acme Corp',
      },
      {
        key: `/config-service/acme-corp/${ENVIRONMENT}/database/connection-string`,
        value: 'postgresql://acme-db.example.com:5432/acme',
        description: 'Database connection string for Acme Corp',
      },
    ],
    users: [
      {
        email: 'admin@acme-corp.com',
        role: 'admin',
        group: 'Admins',
      },
      {
        email: 'user@acme-corp.com',
        role: 'user',
        group: 'Users',
      },
    ],
  },
  {
    tenantId: 'globex-inc',
    name: 'Globex Inc',
    configs: [
      {
        configType: 'payment-gateway',
        config: [
          {
            amcCode: 'GLOB001',
            validations: [{ zeroFundBalance: 'true', minSIPAmount: '250' }],
            paymentGateway: [
              { name: 'PayPal', link: 'https://paypal.com/globex' },
              { name: 'Braintree', link: 'https://braintree.com/globex' },
            ],
          },
        ],
      },
      {
        configType: 'api-settings',
        config: [
          {
            amcCode: 'GLOB001',
            validations: [{ zeroFundBalance: 'false', minSIPAmount: '500' }],
            paymentGateway: [],
          },
        ],
      },
    ],
    ssmParams: [
      {
        key: `/config-service/globex-inc/${ENVIRONMENT}/api/api-key`,
        value: 'globex-secret-key-456-demo',
        description: 'API key for Globex Inc',
      },
      {
        key: `/config-service/globex-inc/${ENVIRONMENT}/api/endpoint`,
        value: 'https://api.globex-inc.com/v1',
        description: 'API endpoint for Globex Inc',
      },
      {
        key: `/config-service/globex-inc/${ENVIRONMENT}/database/connection-string`,
        value: 'postgresql://globex-db.example.com:5432/globex',
        description: 'Database connection string for Globex Inc',
      },
    ],
    users: [
      {
        email: 'admin@globex-inc.com',
        role: 'admin',
        group: 'Admins',
      },
      {
        email: 'user@globex-inc.com',
        role: 'user',
        group: 'Users',
      },
    ],
  },
];

/**
 * Seed DynamoDB with tenant configurations
 */
async function seedDynamoDB() {
  console.log('\n📊 Seeding DynamoDB configurations...\n');

  for (const tenant of tenants) {
    console.log('  Tenant: %s ( %s )', tenant.tenantId, tenant.name);

    for (const config of tenant.configs) {
      const item = {
        pk: `TENANT#${tenant.tenantId}`,
        sk: `CONFIG#${config.configType}`,
        config: config.config,
        isActive: true,
        version: 1,
      };

      try {
        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
          }),
        );
        console.log('    Created config:', config.configType);
      } catch (error) {
        console.error('    Failed to create config:', { configType: config.configType, error });
        throw error;
      }
    }
  }

  console.log('\nDynamoDB seeding completed\n');
}

/**
 * Seed SSM Parameter Store with tenant parameters
 */
async function seedSSM() {
  console.log('\n🔐 Seeding SSM parameters...\n');

  for (const tenant of tenants) {
    console.log('  Tenant: %s ( %s )', tenant.tenantId, tenant.name);

    for (const param of tenant.ssmParams) {
      try {
        // Try to create new parameter with tags
        await ssmClient.send(
          new PutParameterCommand({
            Name: param.key,
            Value: param.value,
            Description: param.description,
            Type: 'SecureString',
            Overwrite: false,
            Tags: [
              { Key: 'Environment', Value: ENVIRONMENT },
              { Key: 'Service', Value: 'config-service' },
              { Key: 'TenantId', Value: tenant.tenantId },
            ],
          }),
        );
        console.log('    ✅ Created parameter:', param.key);
      } catch (error) {
        // If parameter already exists, update it without tags
        if (error.name === 'ParameterAlreadyExists') {
          await ssmClient.send(
            new PutParameterCommand({
              Name: param.key,
              Value: param.value,
              Description: param.description,
              Type: 'SecureString',
              Overwrite: true,
            }),
          );
          console.log('    ✅ Updated parameter:', param.key);
        } else {
          console.error('    ❌ Failed to create parameter:', { key: param.key, error });
          throw error;
        }
      }
    }
  }

  console.log('\n✅ SSM seeding completed\n');
}

/**
 * Create Cognito users for both tenants
 * Note: This function creates users without passwords.
 * Users must set their own passwords via AWS Console or CLI.
 */
async function seedCognitoUsers() {
  if (!USER_POOL_ID) {
    console.log('\n COGNITO_USER_POOL_ID not set, skipping user creation\n');
    return;
  }

  console.log('\n Creating Cognito users...\n');
  console.log('  Users will be created without passwords.');
  console.log('    Set passwords manually using AWS Console or CLI.\n');

  for (const tenant of tenants) {
    console.log('  Tenant: %s ( %s )', tenant.tenantId, tenant.name);

    for (const user of tenant.users) {
      try {
        // Create user without password
        await cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: user.email,
            UserAttributes: [
              { Name: 'email', Value: user.email },
              { Name: 'email_verified', Value: 'true' },
              { Name: 'custom:tenantId', Value: tenant.tenantId },
              { Name: 'custom:role', Value: user.role },
            ],
            MessageAction: 'SUPPRESS',
          }),
        );
        console.log('    ✅ Created user:', user.email);

        // Add user to group
        await cognitoClient.send(
          new AdminAddUserToGroupCommand({
            UserPoolId: USER_POOL_ID,
            Username: user.email,
            GroupName: user.group,
          }),
        );
        console.log('    ✅ Added to group:', user.group);
      } catch (error) {
        if (error.name === 'UsernameExistsException') {
          console.log('    ⚠️  User already exists:', user.email);
          // Update user attributes if already exists
          try {
            await cognitoClient.send(
              new AdminUpdateUserAttributesCommand({
                UserPoolId: USER_POOL_ID,
                Username: user.email,
                UserAttributes: [
                  { Name: 'custom:tenantId', Value: tenant.tenantId },
                  { Name: 'custom:role', Value: user.role },
                ],
              }),
            );
            console.log('    ✅ Updated user attributes:', user.email);
          } catch (updateError) {
            console.error('    ❌ Failed to update user:', user.email, updateError);
          }
        } else {
          console.error('    ❌ Failed to create user:', user.email, error);
          throw error;
        }
      }
    }
  }

  console.log('\n✅ Cognito user seeding completed\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('  Config Service Multi-Tenant Seed Script');
  console.log('='.repeat(60));
  console.log('Region:', REGION);
  console.log('Environment:', ENVIRONMENT);
  console.log('DynamoDB Table:', TABLE_NAME);
  console.log('User Pool ID:', USER_POOL_ID || 'Not Set');
  console.log('='.repeat(60));

  try {
    // Seed data in sequence
    await seedDynamoDB();
    await seedSSM();
    await seedCognitoUsers();

    console.log('='.repeat(60));
    console.log('🎉  Seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📝 Created Users (passwords must be set manually):\n');

    for (const tenant of tenants) {
      console.log('%s ( %s ):', tenant.name, tenant.tenantId);
      for (const user of tenant.users) {
        console.log('  - %s ( %s )', user.email, user.role);
      }
      console.log('');
    }

    console.log('\n Set passwords using AWS CLI:');
    console.log('aws cognito-idp admin-set-user-password \\');
    console.log('  --user-pool-id %s \\', USER_POOL_ID);
    console.log('  --username <email> \\');
    console.log('  --password <YourSecurePassword> \\');
    console.log('  --permanent\n');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('\n Seeding failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { seedDynamoDB, seedSSM, seedCognitoUsers };
