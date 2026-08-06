# Authentication and Session Lifecycle

**Status:** Implementation and contributor reference  
**Scope:** access tokens, refresh sessions, browser persistence, TanStack Query session recovery, logout, expiration, and authenticated API retries.

## 1. Goals

OpenSignFlow needs a browser session model that is secure, resilient across page refreshes, and does not duplicate server session state across React, Zustand, and query caches.

The model must provide:

```txt
short-lived access authorization
persistent browser session recovery
refresh-token rotation
no JavaScript-readable refresh credential
automatic recovery after access-token expiration
single refresh request during concurrent query failures
clear logout behavior
```

## 2. Credential model

### Access token

The API issues a short-lived JWT access token after:

```txt
register
login
refresh
```

The token contains:

```txt
sub
email
type = access
iat
exp
```

The frontend keeps the access token in TanStack Query session state only.

It is never persisted in:

```txt
localStorage
sessionStorage
JavaScript-readable cookies
URL query strings
Zustand persistence middleware
```

### Refresh token

The refresh token is an opaque, high-entropy random token.

```txt
browser receives plaintext token only in HttpOnly cookie
PostgreSQL stores SHA-256 hash only
```

Cookie contract:

```txt
name: opensignflow_refresh_token
httpOnly: true
sameSite: lax
path: /v1/auth
secure: true in production
```

## 3. Backend lifecycle

### Register

```txt
POST /v1/auth/register
  ↓
create user
create personal organization
create OWNER membership
create FREE subscription
create refresh session hash
issue access token
set HttpOnly refresh cookie
```

### Login

```txt
POST /v1/auth/login
  ↓
normalize email
verify password hash
create refresh session hash
issue access token
set HttpOnly refresh cookie
```

### Refresh

```txt
POST /v1/auth/refresh
  ↓
read HttpOnly refresh cookie
hash supplied opaque token
find active unexpired session
revoke old session
create replacement session/token
issue access token
replace refresh cookie
```

### Logout

```txt
POST /v1/auth/logout
  ↓
revoke matching active refresh session
clear refresh cookie
return success
```

Logout is intentionally idempotent. Missing or already-revoked refresh tokens do not become public errors.

## 4. Frontend state ownership

```txt
TanStack Query
  auth session response
  access token
  user
  organization memberships
  refresh lifecycle

Zustand
  activeOrganizationId only

HttpOnly cookie
  persistent opaque refresh credential
```

The auth session query key is:

```ts
['auth', 'session'];
```

## 5. Initial application boot

On owner routes, `AuthProvider` runs:

```http
POST /v1/auth/refresh
```

using browser cookies through:

```ts
credentials: 'include';
```

The session query is configured with:

```txt
retry: false
staleTime: Infinity
refetchOnWindowFocus: false
```

Refresh rotates the session, so it must not be repeatedly called by ordinary query cache behavior.

Public signing routes are excluded:

```txt
/sign/{token}
```

They are intentionally anonymous and must not attempt owner refresh restoration.

## 6. Access-token expiry during active use

The access token can expire while the owner is working in the dashboard.

Example:

```txt
owner leaves tab open
  ↓
access token expires
  ↓
browser regains focus
  ↓
TanStack Query refetches documents
  ↓
API returns ACCESS_TOKEN_INVALID
```

`useAuthenticatedApi()` handles this safely:

```txt
authenticated request
  ↓
ACCESS_TOKEN_INVALID
  ↓
POST /v1/auth/refresh
  ↓
update ['auth', 'session'] cache
  ↓
retry original request once with replacement access token
```

### Refresh de-duplication

Multiple active queries can fail at once:

```txt
document
recipients
fields
audit events
jobs
```

The frontend uses a shared `refreshInFlight` promise:

```txt
all failures await one refresh request
  ↓
one replacement access token
  ↓
each request retries once
```

This prevents a refresh storm and avoids rotating the refresh session multiple times concurrently.

## 7. Refresh failure

If refresh fails because the cookie is absent, expired, revoked, or invalid:

```txt
remove ['auth', 'session'] query cache
owner state becomes anonymous
protected UI shows login state
```

Expected auth lifecycle errors are not shown as global action-failed toasts:

```txt
ACCESS_TOKEN_INVALID
REFRESH_TOKEN_REQUIRED
REFRESH_TOKEN_INVALID
```

They are normal session state transitions, not document workflow errors.

## 8. Public signing isolation

Public signing does not use owner auth:

```txt
/sign/{token}
```

It uses the signing token in the URL and public API endpoints:

```txt
GET /v1/signing-requests/{token}
GET /v1/signing-requests/{token}/document-url
POST /v1/signing-requests/{token}/submit
```

The global auth session query is disabled on `/sign/` routes so public recipients never receive misleading:

```txt
REFRESH_TOKEN_REQUIRED
```

notifications.

## 9. Contributor rules

```txt
Never store access tokens in persistent browser storage.
Never expose refresh tokens to JavaScript.
Never retry an access-token-invalid request more than once after refresh.
Never allow multiple concurrent refresh rotations.
Never run owner refresh restoration on public signing routes.
Use useAuthenticatedApi() for owner/workspace API calls.
Use apiRequest() directly only for public/token-scoped endpoints or unauthenticated auth calls.
Keep active organization selection in Zustand, not duplicate membership data.
```

## 10. Relevant files

```txt
apps/api/src/auth/
apps/web/src/lib/auth/session.tsx
apps/web/src/lib/api/use-authenticated-api.ts
apps/web/src/features/auth/use-auth-mutations.ts
apps/web/src/stores/auth.store.ts
apps/web/src/components/providers.tsx
```
