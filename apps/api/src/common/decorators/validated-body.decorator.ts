import { Body, HttpStatus, ValidationPipe, type Type } from '@nestjs/common';

/**
 * Supplies an explicit DTO constructor to ValidationPipe. This avoids relying on
 * emitted design:paramtypes metadata at controller boundaries under NodeNext.
 */
export function ValidatedBody(dto: Type<unknown>) {
  return Body(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      expectedType: dto,
    }),
  );
}
