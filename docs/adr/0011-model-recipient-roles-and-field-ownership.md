# ADR 0011: Model recipient roles and field ownership

Recipients start with `SIGNER` and `CC` roles. Only signers own fields and receive signing requests. Every signer must own at least one field before send; CC recipients do not block completion. Document fields remain mutable only in DRAFT. Parallel signing is the initial mode; sequential signing is designed but deferred.
