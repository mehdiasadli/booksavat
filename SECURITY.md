# Security Policy

## Supported versions

Booksavat is a continuously deployed website, not a distributed package. Only the currently
deployed version is supported; fixes go to `main` and reach production on the next deploy.
Older tags receive no backports.

## Reporting a vulnerability

Please report privately rather than opening a public issue.

- Preferred: [open a private security advisory](https://github.com/mehdiasadli/booksavat/security/advisories/new)
- Or email: asadlimehdi25@gmail.com

Helpful things to include: what you found, how to reproduce it, the affected URL or code
path, and what an attacker could achieve with it.

You can expect an acknowledgement within a few days. Once a fix is deployed I will confirm
it with you, and credit you in the advisory unless you would rather stay anonymous.

Please avoid automated scanning against production, accessing or modifying other people's
data, and any denial-of-service testing. If you need an account to demonstrate something,
say so and I will help.

## Scope

In scope: this repository and the deployed application, including authentication and
session handling, the oRPC API surface, and anything that exposes data across users.

Out of scope: findings against third-party services (Vercel, Neon, Google) — report those
to the provider — and reports that amount only to missing hardening headers with no
demonstrable impact.
