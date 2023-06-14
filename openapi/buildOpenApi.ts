import { generateSchema } from '@anatine/zod-openapi';
import {
  CheckPositionPermitRequestSchema,
  CreateTriggerRequestSchema,
  DeleteTriggerRequestSchema,
  ListTriggerRequestSchema,
  ListTriggerResponseSchema,
  UpdatePositionPermitRequestSchema,
  UpdateTriggerRequestSchema,
} from '../interfaces';
import { z } from 'zod';
import { OpenApiBuilder, ResponseObject } from 'openapi3-ts';
import { StatusCodes } from 'http-status-codes';
import { writeFileSync } from 'fs';

const JSON_CONTENT_TYPE = 'application/json';
const HTTP_OK_STATUS_CODE = StatusCodes.OK.toString();
const HTTP_BAD_REQUEST_STATUS_CODE = StatusCodes.BAD_REQUEST.toString();
const HTTP_BAD_REQUEST_STATUS_RESPONSE: ResponseObject = {
  description: 'Bad Request',
  content: {
    [JSON_CONTENT_TYPE]: {
      schema: generateSchema(
        z.string().describe('Message explaining why the request is bad'),
      ),
    },
  },
};
const HTTP_INTERNAL_SERVER_ERROR_STATUS_CODE =
  StatusCodes.INTERNAL_SERVER_ERROR.toString();
const HTTP_INTERNAL_SERVER_ERROR_STATUS_RESPONSE: ResponseObject = {
  description: 'Internal Server Error',
  content: {
    [JSON_CONTENT_TYPE]: {
      schema: generateSchema(
        z.string().describe('Message explaining the error encountered'),
      ),
    },
  },
};

const openApiYaml = OpenApiBuilder.create()
  .addOpenApiVersion('3.1.0')
  .addContact({
    email: 'contact@aperture.finance',
    url: 'https://linktr.ee/ApertureFinance',
  })
  .addTitle('Aperture Finance Uniswap V3 Liquidity Position Automation API')
  .addDescription(
    "Aperture's Uniswap V3 liquidity position (LP) management and automation API allows LP holders to schedule **'triggers'** which automatically invokes an **action** when the specified **condition** is met.\n" +
      'An **action** could be closing a position, rebalancing a position (closing it and opening a new one with a different price range after performing the necessary swap), or reinvest (claiming accrued fees and add them as liquidity to the position).\n' +
      'A **condition** could be based on time, price, or a combination. Example of a supported condition: when ETH price remains above 3000 USD for at least 72 hours according to Coingecko price feed.',
  )
  .addVersion('1.0.0')
  .addPath('/checkPositionApproval', {
    description:
      'Checks whether Aperture has approval to manage the specified position.',
    get: {
      requestBody: {
        required: true,
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: generateSchema(CheckPositionPermitRequestSchema),
          },
        },
      },
      responses: {
        [HTTP_OK_STATUS_CODE]: {
          description: 'Position approval status check successful.',
          content: {
            [JSON_CONTENT_TYPE]: {
              schema: generateSchema(
                z
                  .boolean()
                  .describe(
                    'Whether Aperture has approval to manage the specified position.',
                  ),
              ),
            },
          },
        },
        [HTTP_BAD_REQUEST_STATUS_CODE]: HTTP_BAD_REQUEST_STATUS_RESPONSE,
      },
    },
  })
  .addPath('/updatePositionPermit', {
    description:
      'Provides a new signed permit for Aperture to manage the specified position. The signed permit will be stored in the database and will be used to authorize the position when the action is triggered.',
    post: {
      requestBody: {
        required: true,
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: generateSchema(UpdatePositionPermitRequestSchema),
          },
        },
      },
      responses: {
        [HTTP_OK_STATUS_CODE]: {
          description: 'Position permit updated successfully.',
        },
        [HTTP_BAD_REQUEST_STATUS_CODE]: HTTP_BAD_REQUEST_STATUS_RESPONSE,
        [HTTP_INTERNAL_SERVER_ERROR_STATUS_CODE]:
          HTTP_INTERNAL_SERVER_ERROR_STATUS_RESPONSE,
      },
    },
  })
  .addPath('/createTrigger', {
    description:
      'Create a trigger that will invoke the specified action when the specified condition is met.',
    post: {
      requestBody: {
        required: true,
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: generateSchema(CreateTriggerRequestSchema),
          },
        },
      },
      responses: {
        [HTTP_OK_STATUS_CODE]: {
          description: 'Trigger created successfully.',
        },
        [HTTP_BAD_REQUEST_STATUS_CODE]: HTTP_BAD_REQUEST_STATUS_RESPONSE,
        [HTTP_INTERNAL_SERVER_ERROR_STATUS_CODE]:
          HTTP_INTERNAL_SERVER_ERROR_STATUS_RESPONSE,
      },
    },
  })
  .addPath('/listTrigger', {
    description: 'Lists triggers that meet the specified criteria.',
    get: {
      requestBody: {
        required: true,
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: generateSchema(ListTriggerRequestSchema),
          },
        },
      },
      responses: {
        [HTTP_OK_STATUS_CODE]: {
          description: 'Triggers listed successfully.',
          content: {
            [JSON_CONTENT_TYPE]: {
              schema: generateSchema(ListTriggerResponseSchema),
            },
          },
        },
        [HTTP_BAD_REQUEST_STATUS_CODE]: HTTP_BAD_REQUEST_STATUS_RESPONSE,
        [HTTP_INTERNAL_SERVER_ERROR_STATUS_CODE]:
          HTTP_INTERNAL_SERVER_ERROR_STATUS_RESPONSE,
      },
    },
  })
  .addPath('/updateTrigger', {
    description:
      'Updates the specified trigger with a new condition and/or action.',
    post: {
      requestBody: {
        required: true,
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: generateSchema(UpdateTriggerRequestSchema),
          },
        },
      },
      responses: {
        [HTTP_OK_STATUS_CODE]: {
          description: 'The trigger has been successfully updated.',
        },
        [HTTP_BAD_REQUEST_STATUS_CODE]: HTTP_BAD_REQUEST_STATUS_RESPONSE,
        [HTTP_INTERNAL_SERVER_ERROR_STATUS_CODE]:
          HTTP_INTERNAL_SERVER_ERROR_STATUS_RESPONSE,
      },
    },
  })
  .addPath('/deleteTrigger', {
    description: 'Deletes the specified trigger.',
    post: {
      requestBody: {
        required: true,
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: generateSchema(DeleteTriggerRequestSchema),
          },
        },
      },
      responses: {
        [HTTP_OK_STATUS_CODE]: {
          description: 'The trigger has been successfully deleted.',
        },
        [HTTP_BAD_REQUEST_STATUS_CODE]: HTTP_BAD_REQUEST_STATUS_RESPONSE,
        [HTTP_INTERNAL_SERVER_ERROR_STATUS_CODE]:
          HTTP_INTERNAL_SERVER_ERROR_STATUS_RESPONSE,
      },
    },
  })
  .getSpecAsYaml();
writeFileSync('openapi.yaml', openApiYaml);
