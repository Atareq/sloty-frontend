# Sloty Frontend Agent Instructions

## 1. Purpose

This file is the living guide for AI coding agents working in the Sloty Angular frontend repository.

Always read this file before planning commands or code changes.

Also read these files when relevant:

- `docs/business-analysis.txt`
- `docs/documentation.txt`
- `docs/sprints.txt`

These docs are shared product and sprint context between backend and frontend.

This repository is frontend-only. Do not make Django, backend, database, migration, serializer, model, or API implementation changes here.

## 2. Project Summary

Sloty is a sports court rental management system.

The frontend must be:

- Arabic-first
- RTL-first
- Mobile-first
- Fast on average Android phones
- Simple enough for court staff during rush hours
- Usable as a web application from mobile browsers

The first real users are:

- Court staff
- Club managers
- Club owners
- Platform admins

## 3. Tech Stack

Use:

- Angular
- TypeScript
- Standalone components
- Angular Router
- Reactive Forms
- Angular HTTP client
- Tailwind CSS
- Vitest tests
- npm

Do not add major UI libraries without explicit approval.

## 4. Architecture Rules

Preferred structure:

```text
src/app/
  core/
    auth/
    guards/
    interceptors/
    services/
    models/
  shared/
    components/
    directives/
    pipes/
    utils/
  layout/
  features/
    auth/
    dashboard/
    bookings/
    clubs/
    courts/
    transactions/
    settlements/