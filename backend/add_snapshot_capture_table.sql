CREATE TABLE snapshot_captures (
    id INT PRIMARY KEY IDENTITY(1,1),
    session_id INT NOT NULL,
    timestamp DATETIME DEFAULT GETDATE(),
    image_path NVARCHAR(255) NULL,
    CONSTRAINT FK_snapshot_captures_session_id FOREIGN KEY (session_id)
        REFERENCES test_sessions(id)
        ON DELETE CASCADE
); 