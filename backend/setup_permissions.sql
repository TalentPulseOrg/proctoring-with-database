-- This script grants necessary permissions to the 'preet' user for the database

-- Make sure we're in the correct database
USE test;
GO

-- First, let's create or check if the login exists
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'preet')
BEGIN
    CREATE LOGIN preet WITH PASSWORD = 'preet';
END
GO

-- Now create or check if the user exists in the database
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'preet')
BEGIN
    CREATE USER preet FOR LOGIN preet;
END
GO

-- Grant the user db_owner role (this gives full permissions on the database)
EXEC sp_addrolemember 'db_owner', 'preet';
GO

-- Additionally, explicitly grant specific permissions to ensure everything works
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO preet;
GO

-- If you have specific tables already created, you can grant permissions directly
-- Uncomment and run this after tables are created
/*
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.users TO preet;
-- Add more tables as needed
*/

-- Print confirmation
PRINT 'Permissions granted successfully to user preet';
GO 