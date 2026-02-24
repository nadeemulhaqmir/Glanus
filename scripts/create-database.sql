-- Glanus Database Setup SQL
-- Run this manually if you prefer SQL over the CLI

-- Create database (run as postgres user)
CREATE DATABASE glanus;

-- Connect to database
\c glanus

-- The Prisma migrations will create tables automatically
-- This file is for reference or manual setup if needed

-- To check if database was created:
SELECT datname FROM pg_database WHERE datname = 'glanus';
