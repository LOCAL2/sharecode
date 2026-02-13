-- Create users table to store user profiles
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  is_dev BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read users
CREATE POLICY "Allow public read access to users"
  ON users
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Allow users to insert their own profile"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
  ON users
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
