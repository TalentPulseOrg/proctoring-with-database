-- Create proctorpermissionlog table
CREATE TABLE proctorpermissionlog (
    id INT IDENTITY(1,1) PRIMARY KEY,
    examSessionId INT NOT NULL,
    permissionType VARCHAR(255) NOT NULL,
    granted BIT NOT NULL,
    deviceInfo VARCHAR(500),
    errorMessage VARCHAR(1000),
    timeStamp SMALLDATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_proctorpermissionlog_examSessionId FOREIGN KEY (examSessionId) REFERENCES test_sessions(id)
);

-- Create index for better performance on foreign key lookups
CREATE INDEX IX_proctorpermissionlog_examSessionId ON proctorpermissionlog(examSessionId);

-- Create index for timestamp queries
CREATE INDEX IX_proctorpermissionlog_timeStamp ON proctorpermissionlog(timeStamp); 