# BookMyVenue Architecture Documentation

## Architectural Overview

BookMyVenue is structured as a **Modular Monolith**. It is composed of a single runner codebase (`backend/`) that integrates multiple self-contained modules (`backend/src/modules/*`).

```mermaid
graph TD
    Client[Next.js Client Apps] -->|HTTP Requests| Nginx[Nginx Gateway / Reverse Proxy]
    Nginx -->|Route to Port 5000| Monolith[Express Monolith Server]

    subgraph Monolith[Express Monolith runner]
        AuthMod[Auth Module]
        UserMod[User Module]
        VenueMod[Venue Module]
        BookMod[Booking Module]
        PayMod[Payment Module]
        NotifMod[Notification Module]
    end

    subgraph Database[MongoDB Host]
        AuthDB[(bookmyvenue_auth)]
        UserDB[(bookmyvenue_users)]
        VenueDB[(bookmyvenue_venues)]
        BookDB[(bookmyvenue_bookings)]
        PayDB[(bookmyvenue_payments)]
        NotifDB[(bookmyvenue_notifications)]
    end

    AuthMod --> AuthDB
    UserMod --> UserDB
    VenueMod --> VenueDB
    BookMod --> BookDB
    PayMod --> PayDB
    NotifMod --> NotifDB
```

## System Rules & Guidelines

### 1. Database Isolation

- Each module has its own connection via Mongoose and connects to a **separate database** (e.g. `bookmyvenue_auth`, `bookmyvenue_venues`).
- Modules **must not** perform joins or direct queries on collections belonging to another module.
- If data from another module is required, it must be fetched via their public service class/interface.

### 2. Microservice Preparedness

- Avoid tight coupling between modules.
- Keep module routers self-contained.
- All routing prefixes should follow `/api/v1/<module-name>/*`.
