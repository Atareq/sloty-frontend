# Core

`core` contains application-wide infrastructure that should have one shared implementation across Sloty.

Use this folder for:

- Authentication state and token handling.
- Route guards that protect private screens.
- HTTP interceptors that prepare or normalize outgoing requests.
- Shared services that coordinate app-wide behavior.
- Models and interfaces used across multiple features.

Do not put page UI or booking-specific business screens here. Feature folders should own their screens, while `core` owns cross-cutting Angular building blocks.
