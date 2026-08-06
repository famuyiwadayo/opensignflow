import { HttpStatus, Query, ValidationPipe, type Type } from '@nestjs/common';

/** Supplies explicit DTO metadata for query validation under NodeNext compilation. */
export function ValidatedQuery(dto: Type<unknown>) {
  return Query(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      expectedType: dto,
    }),
  );
}
