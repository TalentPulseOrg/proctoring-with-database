-- Add foreign key constraint to test_sessions table
ALTER TABLE test_sessions
ADD CONSTRAINT fk_test_sessions_user
FOREIGN KEY (user_id) REFERENCES users(id); 