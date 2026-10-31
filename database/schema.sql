-- Kwame Driving School & Computer College: database schema.
-- Run once on the hosting MySQL server (phpMyAdmin > Import, or: mysql -u USER -p DB_NAME < database/schema.sql).

CREATE TABLE IF NOT EXISTS bookings (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference       CHAR(11)     NOT NULL,                       -- e.g. KW-1A2B3C4D, shown to the visitor
  package         ENUM('driving', 'comp-package') NOT NULL,
  preferred_date  DATE         NOT NULL,
  preferred_time  ENUM('Morning', 'Afternoon') NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,                       -- digits only, optional leading +
  email           VARCHAR(254) NOT NULL,
  gender          ENUM('Male', 'Female') NOT NULL,
  id_number       VARCHAR(20)  NOT NULL,                       -- national ID or passport: personal data, restrict access
  message         TEXT         NULL,
  status          ENUM('new', 'contacted', 'confirmed', 'cancelled') NOT NULL DEFAULT 'new',
  ip_address      VARCHAR(45)  NOT NULL,                       -- for rate limiting
  user_agent      VARCHAR(255) NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_reference (reference),
  KEY idx_bookings_ip_created (ip_address, created_at),
  KEY idx_bookings_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
