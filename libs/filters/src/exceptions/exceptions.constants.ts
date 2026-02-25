// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

export class ExceptionConstants {
  public static readonly BadRequestCodes = {
    MISSING_ATTRIBUTES: 201,
    FILE_SIZE_EXCEEDS: 209,
    FILE_TYPE_NOT_SUPPORTED: 291,
    FILE_CONVERSION_FAILED: 5001,
    HTTP_REQUEST_TIMEOUT: 4005,
    RESOURCE_ALREADY_EXISTS: 4001,
    VALIDATION_ERROR: 204,
    UNEXCEPTED_ERROR: 205,
    INVALID_INPUT: 202,
    PAN_OR_FOLIO_ID_REQUIRED: 4006,
    INVALID_PAN_NUMBER: 4003,
    INVALID_AMC_CODE: 4004,
    PAN_ALREADY_EXISTS: 4091,
    USERNAME_ALREADY_EXISTS: 4092,
    TERMS_AND_CONDITIONS_NOT_ACCEPTED: 4001,
    //config-grpc
    KEY_NOT_FOUND: 1001,
    TENANT_NOT_FOUND: 1002,
    //file-upload
    TENANT_ID_MISSING: 2001,
  };

  public static readonly UnauthorizedCodes = {
    UNAUTHORIZED_ACCESS: 401,
    SESSION_EXPIRED: 402,
    TOKEN_EXPIRED_ERROR: 403,
    USER_NOT_VERIFIED: 404,
    USER_BLOCKED: 405,
    UNEXPECTED_ERROR: 410,
    RESOURCE_NOT_FOUND: 420,
    INVALID_ISSUER: 445,
    NO_TOKEN_PROVIDED: 446,
    INVALID_TOKEN: 447,
  };

  public static readonly InternalServerErrorCodes = {
    SOMETHING_WENT_WRONG: 501,
    EXTERNAL_API_ERROR: 502,
    CRYPTO_GENERATOR_ERROR: 503,
    CRYPTO_ERROR: 504,
    CONFIG_SERVER_ERROR: 505,
    INTERNAL_SERVER_ERROR: 3003,
    DATABASE_ERROR: 3002,
    NETWORK_ERROR: 3001,
    SERVER_OVERLOAD: 3005,
    UNEXCEPTED_ERROR: 3006,
    INVALID_UUID_FORMAT: 3010,
    INVALID_URL_FORMAT: 3011,
    INVALID_KRA_AUTH_CONFIG: 3012,
    CVL_KRA_CLIENT_ERROR: 3013,
    POS_CODE_NOT_FOUND: 3014,
    KARZA_API_ERROR: 3015,
    UTI_ITSL_API_ERROR: 3016,
    DATABASE_CONN_ERROR: 3000,
  };

  public static readonly ForbiddenCodes = {
    FORBIDDEN: 4001,
    MISSING_PERMISSIONS: 4002,
    EXCEEDED_RATE_LIMIT: 4003,
    RESOURCE_NOT_FOUND: 4004,
    TEMPORARILY_UNAVAILABLE: 4005,
  };

  public static readonly DBExceptionCodes = {
    DUPLICATE_ENTRY: 23000,
    FOREIGN_KEY_CONSTRAINT_FAILS: 1452,
    ENTRY_NOT_FOUND: 4006,
    NO_DATA_FOUND: 4004,
    INVALID_DATA: 4005,
    UNEXPECTED_ERROR: 500,
    ADDRESS_ADD_FAIL: 4006,
    GENERIC_DB_ERROR: 4000,
    STRING_OR_BINARY_DATA_TRUNCATED: 4001,
  };

  public static readonly BadRequestCause = {
    TNC_CAUSE: 'The user has not accepted the terms and conditions.',
    PAN_CAUSE: 'Ensure that the PAN Number is of valid format (e.g., ABCDE1234F)',
    PAN_OR_FOLIO_ID_REQUIRED:
      'Both PAN and FolioID are null. Please provide either of them or both',
  };

  public static readonly NotFoundMessage = {
    FOLIO_NOT_FOUND: 'No Folio details found for given parameters.',
    FATCA_DETAILS_NOT_FOUND: 'No FATCA details found for the given PAN',
    NOMINEE_DETAILS_NOT_CREATED: 'No Nominee details not created for the given folioId',
    NOMINEE_DETAILS_NOT_FOUND: 'No Nominee details found for the given folioId',
    FATCA_DETAILS_NOT_FOUND_FOLIO: 'No FATCA details found for draft folio',
    DRAFT_FOLIO_FATCA_DETAILS_NOT_FOUND: 'No FATCA details found for draft folio',
    OTP_NOT_CREATED: 'OTP is not created for this request.',
  };

  public static readonly NotSuccessfulMessage = {
    FOLIO_FATCA_NOT_CREATED: 'FATCA details are not created for a given Folio',
    FOLIO_FATCA_NOT_UPDATED: 'FATCA details are not updated for a given Folio',
    FOLIO_FATCA_NOT_DELETED: 'FATCA details are not deleted for a given Folio',
  };
}
