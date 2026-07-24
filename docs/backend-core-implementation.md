# Backend Core Implementation Notes

## Implemented first slice

The first backend core slice includes:

- `PrismaModule` and `PrismaService`;
- opaque public ID generation;
- `UsersModule` with repository, service, selectors, and API entity;
- `OrganizationsModule` with repository, service, controller, selectors, and API entities;
- `AuthModule` with register, login, refresh, logout, and me endpoints;
- access-token signing and verification with `@nestjs/jwt`;
- refresh sessions stored as SHA-256 token hashes;
- default personal workspace creation during registration;
- default free subscription row creation during workspace creation;
- protected-route guard using Bearer access tokens;
- `@CurrentUser()` decorator;
- validation errors configured to return HTTP 422;
- standard Swagger helpers for `{ data: ... }` response envelopes;
- barrel export files for cleaner module/common imports.

## Implemented endpoints

```txt
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/logout
GET  /v1/auth/me
GET  /v1/organizations
```

## Auth flow

Register/login returns an access token in the JSON response and stores a refresh token in an HttpOnly cookie.

Response shape:

```json
{
  "data": {
    "user": {},
    "organizations": [],
    "accessToken": "..."
  }
}
```

The refresh token is not returned in JSON. It is stored as:

```txt
opensignflow_refresh_token
```

The database stores only a SHA-256 hash of the refresh token.

## Token implementation

Access tokens are generated and verified through `@nestjs/jwt`.

Refresh tokens are intentionally not JWTs. They are high-entropy opaque tokens stored in an HttpOnly cookie, while the database stores only a SHA-256 hash. This makes refresh-token revocation and rotation straightforward.
