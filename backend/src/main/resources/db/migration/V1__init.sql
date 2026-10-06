CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users ---------------------------------------------------------------------
CREATE TABLE users (
    id                          UUID PRIMARY KEY,
    name                        VARCHAR(80)  NOT NULL,
    email                       VARCHAR(254) NOT NULL,
    phone                       VARCHAR(10)  NOT NULL,
    password_hash               VARCHAR(100) NOT NULL,
    role                        VARCHAR(16)  NOT NULL CHECK (role IN ('TENANT', 'OWNER', 'ADMIN')),
    verification_status         VARCHAR(16)  NOT NULL DEFAULT 'UNVERIFIED'
                                CHECK (verification_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED')),
    verification_submitted_at   TIMESTAMPTZ,
    verification_reviewed_at    TIMESTAMPTZ,
    verification_rejection_reason VARCHAR(500),
    avatar_url                  VARCHAR(512),
    suspended                   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ  NOT NULL,
    updated_at                  TIMESTAMPTZ  NOT NULL
);
CREATE UNIQUE INDEX ux_users_email ON users (LOWER(email));
CREATE INDEX ix_users_role ON users (role);
CREATE INDEX ix_users_verification_status ON users (verification_status);

CREATE TABLE refresh_tokens (
    id           UUID PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    family_id    UUID        NOT NULL,
    token_hash   VARCHAR(64) NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX ux_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX ix_refresh_tokens_family ON refresh_tokens (family_id);

-- Properties ----------------------------------------------------------------
CREATE TABLE properties (
    id                UUID PRIMARY KEY,
    owner_id          UUID          NOT NULL REFERENCES users (id),
    title             VARCHAR(120)  NOT NULL,
    description       VARCHAR(5000) NOT NULL,
    property_type     VARCHAR(32)   NOT NULL,
    bhk               INTEGER       NOT NULL CHECK (bhk BETWEEN 0 AND 10),
    bathrooms         INTEGER       NOT NULL,
    area_sqft         INTEGER       NOT NULL,
    furnishing        VARCHAR(32)   NOT NULL,
    tenant_preference VARCHAR(32)   NOT NULL,
    rent              BIGINT        NOT NULL CHECK (rent > 0),
    deposit           BIGINT        NOT NULL,
    maintenance       BIGINT        NOT NULL,
    available_from    DATE          NOT NULL,
    floor             INTEGER,
    total_floors      INTEGER,
    facing            VARCHAR(32),
    address_line      VARCHAR(255)  NOT NULL,
    locality          VARCHAR(120)  NOT NULL,
    city              VARCHAR(80)   NOT NULL,
    state             VARCHAR(80)   NOT NULL,
    pincode           VARCHAR(6)    NOT NULL,
    latitude          DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude         DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    location          GEOGRAPHY(Point, 4326)
                      GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    amenities         TEXT[]        NOT NULL DEFAULT '{}',
    status            VARCHAR(16)   NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'RENTED', 'INACTIVE')),
    view_count        BIGINT        NOT NULL DEFAULT 0,
    deleted_at        TIMESTAMPTZ,
    version           BIGINT        NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_properties_location ON properties USING GIST (location);
CREATE INDEX ix_properties_owner ON properties (owner_id);
CREATE INDEX ix_properties_status_live ON properties (status) WHERE deleted_at IS NULL;
CREATE INDEX ix_properties_city ON properties (LOWER(city));
CREATE INDEX ix_properties_rent ON properties (rent);
CREATE INDEX ix_properties_bhk ON properties (bhk);
CREATE INDEX ix_properties_created_at ON properties (created_at DESC);
CREATE INDEX ix_properties_amenities ON properties USING GIN (amenities);
CREATE INDEX ix_properties_locality_trgm ON properties USING GIN (locality gin_trgm_ops);
CREATE INDEX ix_properties_title_trgm ON properties USING GIN (title gin_trgm_ops);

CREATE TABLE property_images (
    id           UUID PRIMARY KEY,
    property_id  UUID         NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
    url          VARCHAR(1024) NOT NULL,
    storage_key  VARCHAR(512),
    cover        BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order   INTEGER      NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL
);
CREATE INDEX ix_property_images_property ON property_images (property_id, sort_order);

-- Shortlist -----------------------------------------------------------------
CREATE TABLE shortlists (
    id           UUID PRIMARY KEY,
    tenant_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    property_id  UUID        NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL,
    CONSTRAINT ux_shortlists_tenant_property UNIQUE (tenant_id, property_id)
);

-- Visits --------------------------------------------------------------------
CREATE TABLE visits (
    id             UUID PRIMARY KEY,
    property_id    UUID        NOT NULL REFERENCES properties (id),
    tenant_id      UUID        NOT NULL REFERENCES users (id),
    owner_id       UUID        NOT NULL REFERENCES users (id),
    status         VARCHAR(24) NOT NULL,
    scheduled_at   TIMESTAMPTZ NOT NULL,
    proposed_at    TIMESTAMPTZ,
    note           VARCHAR(500),
    response_note  VARCHAR(500),
    version        BIGINT      NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_visits_tenant ON visits (tenant_id, scheduled_at);
CREATE INDEX ix_visits_owner ON visits (owner_id, scheduled_at);
CREATE UNIQUE INDEX ux_visits_open_per_tenant_property ON visits (tenant_id, property_id)
    WHERE status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_PROPOSED');

-- Chat ----------------------------------------------------------------------
CREATE TABLE conversations (
    id               UUID PRIMARY KEY,
    property_id      UUID        NOT NULL REFERENCES properties (id),
    tenant_id        UUID        NOT NULL REFERENCES users (id),
    owner_id         UUID        NOT NULL REFERENCES users (id),
    last_message_at  TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL,
    CONSTRAINT ux_conversations_property_tenant UNIQUE (property_id, tenant_id)
);
CREATE INDEX ix_conversations_tenant ON conversations (tenant_id, last_message_at DESC);
CREATE INDEX ix_conversations_owner ON conversations (owner_id, last_message_at DESC);

CREATE TABLE messages (
    id               UUID PRIMARY KEY,
    conversation_id  UUID          NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_id        UUID          NOT NULL REFERENCES users (id),
    content          VARCHAR(2000) NOT NULL,
    read_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL,
    updated_at       TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX ix_messages_unread ON messages (conversation_id, sender_id) WHERE read_at IS NULL;

-- Notifications -------------------------------------------------------------
CREATE TABLE notifications (
    id          UUID PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        VARCHAR(32)  NOT NULL,
    title       VARCHAR(160) NOT NULL,
    body        VARCHAR(500) NOT NULL,
    link        VARCHAR(255) NOT NULL,
    read        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL
);
CREATE INDEX ix_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX ix_notifications_unread ON notifications (user_id) WHERE read = FALSE;

-- Owner verification --------------------------------------------------------
CREATE TABLE verification_documents (
    id             UUID PRIMARY KEY,
    owner_id       UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    document_type  VARCHAR(32)  NOT NULL,
    file_name      VARCHAR(255) NOT NULL,
    storage_key    VARCHAR(512) NOT NULL,
    content_type   VARCHAR(64)  NOT NULL,
    size_bytes     BIGINT       NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL
);
CREATE INDEX ix_verification_documents_owner ON verification_documents (owner_id);
