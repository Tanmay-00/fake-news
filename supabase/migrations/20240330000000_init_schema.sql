-- Create an ENUM for verdicts
CREATE TYPE report_verdict AS ENUM ('true', 'false', 'misleading', 'unverified');

-- 1. Users Table (Public Profile)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. News Reports Table
CREATE TABLE public.news_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  source_url TEXT,
  verdict report_verdict DEFAULT 'unverified',
  confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Analysis Logs Table
CREATE TABLE public.analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.news_reports(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL,
  response_time INTEGER, -- In milliseconds
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Activity Table
CREATE TYPE activity_action AS ENUM ('search', 'analyze', 'share', 'bookmark');

CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action activity_action NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Setup Automations & Performance
-- Trigger to auto-create public.users when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_news_reports_user_id ON public.news_reports(user_id);
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- users table policies
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- news_reports table policies
CREATE POLICY "Users can insert own reports" 
ON public.news_reports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reports" 
ON public.news_reports FOR SELECT 
USING (auth.uid() = user_id OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- analysis_logs table policies
CREATE POLICY "Users can view logs of own reports" 
ON public.analysis_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.news_reports WHERE public.news_reports.id = report_id AND public.news_reports.user_id = auth.uid()));

-- user_activity table policies
CREATE POLICY "Users can insert own activity" 
ON public.user_activity FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own activity" 
ON public.user_activity FOR SELECT 
USING (auth.uid() = user_id);
