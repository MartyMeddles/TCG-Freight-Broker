-- Run this script once in SSMS connected to MTV-C39S774\SQLEXPRESS
-- as a sysadmin (sa or Windows admin account).
-- This creates the database and grants wsi\martymeddles full access to it.

USE master;
GO

-- 1. Create the database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TcgFreightBroker')
BEGIN
    CREATE DATABASE TcgFreightBroker;
    PRINT 'Database TcgFreightBroker created.';
END
ELSE
    PRINT 'Database TcgFreightBroker already exists.';
GO

-- 2. Create a login for the Windows account if it doesn't already exist
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'WSI\martymeddles')
BEGIN
    CREATE LOGIN [WSI\martymeddles] FROM WINDOWS;
    PRINT 'Login created.';
END
GO

-- 3. Add the user to the database as owner
USE TcgFreightBroker;
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'martymeddles')
BEGIN
    CREATE USER [martymeddles] FOR LOGIN [WSI\martymeddles];
    PRINT 'Database user created.';
END
GO

ALTER ROLE db_owner ADD MEMBER [martymeddles];
PRINT 'db_owner role granted. Setup complete.';
GO
