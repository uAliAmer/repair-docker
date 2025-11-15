#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create evolution user if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'evolution') THEN
            CREATE USER evolution WITH PASSWORD 'evolutionsecret';
        END IF;
    END
    \$\$;

    -- Create evolution database if it doesn't exist
    SELECT 'CREATE DATABASE evolution'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolution')\gexec

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE evolution TO evolution;
EOSQL

echo "Evolution database and user created successfully"
