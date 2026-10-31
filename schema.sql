-- Kwame Driving School & Computer College: database schema.
--
-- Stores every booking/enrollment request sent from the form on contact.html
-- (course, preferred date and time, contact details, ID number, message).
--
-- Local:   mysql -u root -p -e "source schema.sql"
-- Hosting: in cPanel the database is created in the panel, so delete the
--          CREATE DATABASE and USE lines below, then import this file in phpMyAdmin.

CREATE DATABASE IF NOT EXISTS kwame_school
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kwame_school;

CREATE TABLE IF NOT EXISTS bookings (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference       CHAR(11)     NOT NULL,                       -- e.g. KW-1A2B3C4D, shown to the visitor
  package         ENUM('driving', 'comp-package') NOT NULL,    -- which school they chose
  preferred_date  DATE         NOT NULL,
  preferred_time  ENUM('Morning', 'Afternoon') NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,                       -- digits only, optional leading +
  email           VARCHAR(254) NOT NULL,
  gender          ENUM('Male', 'Female') NOT NULL,
  id_number       VARCHAR(20)  NOT NULL,                       -- national ID or passport: personal data, restrict access
  message         TEXT         NULL,                           -- the optional "Anything else?" box
  status          ENUM('new', 'contacted', 'confirmed', 'cancelled') NOT NULL DEFAULT 'new',
  ip_address      VARCHAR(45)  NOT NULL,                       -- IPv4 or IPv6, for rate limiting
  user_agent      VARCHAR(255) NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_reference (reference),
  KEY idx_bookings_ip_created (ip_address, created_at),        -- rate-limit lookup
  KEY idx_bookings_status_created (status, created_at),        -- "new requests, newest first"
  KEY idx_bookings_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
