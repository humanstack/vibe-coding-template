-- Flatfinder Database Schema Migration
-- Creates tables for users, apartments, and matches with RLS policies

-- ====================================
-- USERS TABLE
-- ====================================
-- Extended user profile for flatfinder
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  full_name text,
  phone text,

  -- User preferences
  min_budget numeric(10, 2),
  max_budget numeric(10, 2),
  preferred_location text,
  preferred_rooms integer,
  preferred_size_sqm numeric(10, 2),
  move_in_date date,

  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create index on email for faster lookups
create index if not exists users_email_idx on public.users(email);

-- Enable RLS
alter table public.users enable row level security;

-- RLS Policies for users table
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert their own data"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);


-- ====================================
-- APARTMENTS TABLE
-- ====================================
create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),

  -- Basic information
  title text not null,
  description text,
  address text not null,
  city text not null,
  postal_code text,
  country text default 'Germany',

  -- Property details
  rooms numeric(3, 1) not null,
  size_sqm numeric(10, 2) not null,
  floor integer,
  total_floors integer,

  -- Financial details
  rent_monthly numeric(10, 2) not null,
  utilities_monthly numeric(10, 2),
  deposit numeric(10, 2),

  -- Availability
  available_from date not null,
  is_available boolean default true,

  -- Features (stored as JSONB for flexibility)
  features jsonb default '{}',
  -- Example: {"furnished": true, "balcony": true, "parking": false, "elevator": true}

  -- Images and documents
  images text[], -- Array of image URLs
  documents text[], -- Array of document URLs

  -- Source information
  source_url text,
  external_id text,

  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.users(id) on delete set null
);

-- Create indexes for common queries
create index if not exists apartments_city_idx on public.apartments(city);
create index if not exists apartments_available_idx on public.apartments(is_available);
create index if not exists apartments_rent_idx on public.apartments(rent_monthly);
create index if not exists apartments_rooms_idx on public.apartments(rooms);
create index if not exists apartments_created_at_idx on public.apartments(created_at desc);

-- Enable RLS
alter table public.apartments enable row level security;

-- RLS Policies for apartments table
create policy "Anyone can view available apartments"
  on public.apartments for select
  using (is_available = true);

create policy "Authenticated users can view all apartments"
  on public.apartments for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert apartments"
  on public.apartments for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own apartments"
  on public.apartments for update
  using (created_by = auth.uid());


-- ====================================
-- MATCHES TABLE
-- ====================================
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),

  -- Relationships
  user_id uuid not null references public.users(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,

  -- Match score (0.0 - 1.0)
  match_score numeric(3, 2) default 0.0,

  -- Match reasons (stored as JSONB)
  match_reasons jsonb default '{}',
  -- Example: {"budget_match": true, "location_match": true, "size_match": false}

  -- User interaction
  status text default 'pending' check (status in ('pending', 'interested', 'not_interested', 'contacted', 'viewed')),
  user_notes text,

  -- Contact tracking
  contacted_at timestamptz,
  viewing_scheduled_at timestamptz,

  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Ensure unique matches
  unique(user_id, apartment_id)
);

-- Create indexes for queries
create index if not exists matches_user_idx on public.matches(user_id);
create index if not exists matches_apartment_idx on public.matches(apartment_id);
create index if not exists matches_score_idx on public.matches(match_score desc);
create index if not exists matches_status_idx on public.matches(status);
create index if not exists matches_created_at_idx on public.matches(created_at desc);

-- Enable RLS
alter table public.matches enable row level security;

-- RLS Policies for matches table
create policy "Users can view their own matches"
  on public.matches for select
  using (user_id = auth.uid());

create policy "Users can insert their own matches"
  on public.matches for insert
  with check (user_id = auth.uid());

create policy "Users can update their own matches"
  on public.matches for update
  using (user_id = auth.uid());

create policy "Users can delete their own matches"
  on public.matches for delete
  using (user_id = auth.uid());


-- ====================================
-- FUNCTIONS
-- ====================================

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Triggers for updated_at
create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger apartments_updated_at
  before update on public.apartments
  for each row execute function public.handle_updated_at();

create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.handle_updated_at();


-- Function to calculate match score
create or replace function public.calculate_match_score(
  user_uuid uuid,
  apartment_uuid uuid
)
returns numeric as $$
declare
  score numeric := 0.0;
  user_prefs record;
  apt record;
begin
  -- Get user preferences
  select * into user_prefs from public.users where id = user_uuid;

  -- Get apartment details
  select * into apt from public.apartments where id = apartment_uuid;

  -- Calculate score based on preferences
  -- Budget match (40% weight)
  if user_prefs.min_budget is not null and user_prefs.max_budget is not null then
    if apt.rent_monthly >= user_prefs.min_budget and apt.rent_monthly <= user_prefs.max_budget then
      score := score + 0.4;
    end if;
  end if;

  -- Location match (30% weight)
  if user_prefs.preferred_location is not null and apt.city is not null then
    if lower(apt.city) = lower(user_prefs.preferred_location) then
      score := score + 0.3;
    end if;
  end if;

  -- Rooms match (20% weight)
  if user_prefs.preferred_rooms is not null then
    if apt.rooms = user_prefs.preferred_rooms then
      score := score + 0.2;
    elsif abs(apt.rooms - user_prefs.preferred_rooms) <= 1 then
      score := score + 0.1;
    end if;
  end if;

  -- Size match (10% weight)
  if user_prefs.preferred_size_sqm is not null then
    if apt.size_sqm >= user_prefs.preferred_size_sqm * 0.9 and
       apt.size_sqm <= user_prefs.preferred_size_sqm * 1.1 then
      score := score + 0.1;
    end if;
  end if;

  return score;
end;
$$ language plpgsql security definer;


-- Function to get user matches with details
create or replace function public.get_user_matches(user_uuid uuid)
returns table (
  match_id uuid,
  apartment_id uuid,
  apartment_title text,
  apartment_city text,
  rent_monthly numeric,
  rooms numeric,
  size_sqm numeric,
  match_score numeric,
  status text,
  created_at timestamptz
) as $$
begin
  return query
  select
    m.id as match_id,
    a.id as apartment_id,
    a.title as apartment_title,
    a.city as apartment_city,
    a.rent_monthly,
    a.rooms,
    a.size_sqm,
    m.match_score,
    m.status,
    m.created_at
  from public.matches m
  join public.apartments a on m.apartment_id = a.id
  where m.user_id = user_uuid
  order by m.match_score desc, m.created_at desc;
end;
$$ language plpgsql security definer;
