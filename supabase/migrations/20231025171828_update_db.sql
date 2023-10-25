-- Create a new 'wallets' table with the 'id' column as SERIAL PRIMARY KEY
CREATE TABLE new_wallets (
    id SERIAL PRIMARY KEY,
    user_id character varying(255) NOT NULL,
    wallet_address character(42),
    created_at text,
    updated_at text
);

-- Copy data from the old 'wallets' table to the new 'new_wallets' table
INSERT INTO new_wallets (user_id, wallet_address, created_at, updated_at)
SELECT user_name, wallet_address, created_at, updated_at
FROM wallets;

-- Drop the old 'wallets' table
DROP TABLE wallets;

-- Rename the new table to 'wallets'
ALTER TABLE new_wallets RENAME TO wallets;