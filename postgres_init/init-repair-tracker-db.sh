#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create repair_user if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'repair_user') THEN
            CREATE USER repair_user WITH PASSWORD 'repair_secure_pass';
        END IF;
    END
    \$\$;

    -- Create repair_tracker database if it doesn't exist
    SELECT 'CREATE DATABASE repair_tracker OWNER repair_user'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'repair_tracker')\gexec

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE repair_tracker TO repair_user;
EOSQL

# Connect to repair_tracker database and set ownership
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "repair_tracker" <<-EOSQL
    -- Grant schema privileges
    GRANT ALL ON SCHEMA public TO repair_user;

    -- Set default privileges for future tables
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO repair_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO repair_user;

    -- Grant ownership of existing objects (if any)
    DO \$\$
    DECLARE
        r RECORD;
    BEGIN
        -- Transfer ownership of all tables
        FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        LOOP
            EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' OWNER TO repair_user';
        END LOOP;

        -- Transfer ownership of all sequences
        FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
        LOOP
            EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' OWNER TO repair_user';
        END LOOP;
    END
    \$\$;
EOSQL

echo "Repair Tracker database and user created successfully with proper ownership"
