# Security Policy

## Supported versions

The latest `main` branch and the latest tagged release are considered supported.

## Reporting a vulnerability

If you discover a security issue, open a private security advisory on GitHub if available, or contact the maintainer directly before publishing details.

Please include:

- affected version or commit
- reproduction steps
- expected impact
- any suggested mitigation

## Current hardening priorities

Ashen-Hallow is still early-stage software. Current priorities include:

- stronger browser-side hardening such as a stricter Content Security Policy
- safer local storage handling and namespaced preference keys
- more defensive simulation validation around state corruption and invalid inputs
- broader automated regression coverage for mechanics and UI flows

## Scope

Relevant report areas include:

- browser security issues
- unsafe persistence or serialization
- deterministic simulation integrity problems
- networking or multiplayer trust model issues in future releases
