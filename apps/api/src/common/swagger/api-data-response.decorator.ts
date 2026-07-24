import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

type ApiDataResponseOptions = {
  description?: string;
  isArray?: boolean;
};

function dataSchema(model: Type<unknown>, isArray = false) {
  return {
    type: 'object',
    properties: {
      data: isArray
        ? {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          }
        : { $ref: getSchemaPath(model) },
    },
    required: ['data'],
  };
}

export function ApiOkDataResponse(
  model: Type<unknown>,
  options: ApiDataResponseOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: options.description,
      schema: dataSchema(model, options.isArray),
    }),
  );
}

export function ApiCreatedDataResponse(
  model: Type<unknown>,
  options: ApiDataResponseOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiCreatedResponse({
      description: options.description,
      schema: dataSchema(model, options.isArray),
    }),
  );
}

export function ApiPaginatedDataResponse(
  model: Type<unknown>,
  options: ApiDataResponseOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: options.description,
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          pagination: {
            type: 'object',
            properties: {
              limit: { type: 'number', example: 20 },
              nextCursor: { type: 'string', nullable: true, example: null },
              hasMore: { type: 'boolean', example: false },
            },
            required: ['limit', 'nextCursor', 'hasMore'],
          },
        },
        required: ['data', 'pagination'],
      },
    }),
  );
}
