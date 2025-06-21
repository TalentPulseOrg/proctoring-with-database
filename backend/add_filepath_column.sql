-- SQL Script to Add Filepath Column to Violations Table
-- This script adds a new 'filepath' column to store image file paths

-- Check if the column already exists
IF NOT EXISTS (
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'violations' 
    AND COLUMN_NAME = 'filepath'
)
BEGIN
    -- Add the new column
    ALTER TABLE violations 
    ADD filepath NVARCHAR(500) NULL;
    
    PRINT 'Successfully added filepath column to violations table';
END
ELSE
BEGIN
    PRINT 'Column filepath already exists in violations table';
END