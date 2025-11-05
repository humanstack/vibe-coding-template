-- Seed data for Flatfinder application
-- This file will be executed after migrations

-- Note: In production, user data would come from auth.users
-- For testing, we'll insert directly into the users table
-- You'll need to create corresponding auth users manually or via the Supabase dashboard

-- ====================================
-- SAMPLE USERS
-- ====================================
-- Insert sample user profiles (using example UUIDs)
-- In real usage, these UUIDs should match auth.users IDs

insert into public.users (id, email, full_name, phone, min_budget, max_budget, preferred_location, preferred_rooms, preferred_size_sqm, move_in_date)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'alice.schmidt@example.com',
    'Alice Schmidt',
    '+49 151 12345678',
    800.00,
    1200.00,
    'Berlin',
    2,
    60.00,
    '2025-12-01'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bob.mueller@example.com',
    'Bob Mueller',
    '+49 152 98765432',
    1000.00,
    1500.00,
    'Munich',
    3,
    80.00,
    '2025-11-15'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'clara.weber@example.com',
    'Clara Weber',
    '+49 160 11223344',
    600.00,
    900.00,
    'Hamburg',
    1,
    40.00,
    '2026-01-01'
  )
on conflict (id) do nothing;


-- ====================================
-- SAMPLE APARTMENTS
-- ====================================
insert into public.apartments (
  title,
  description,
  address,
  city,
  postal_code,
  country,
  rooms,
  size_sqm,
  floor,
  total_floors,
  rent_monthly,
  utilities_monthly,
  deposit,
  available_from,
  is_available,
  features,
  images,
  source_url,
  created_by
)
values
  (
    'Cozy 2-Room Apartment in Mitte',
    'Beautiful apartment in the heart of Berlin. Recently renovated with modern amenities. Perfect for young professionals or couples.',
    'Invalidenstraße 42',
    'Berlin',
    '10115',
    'Germany',
    2,
    58.00,
    3,
    5,
    950.00,
    180.00,
    1900.00,
    '2025-11-15',
    true,
    '{"furnished": false, "balcony": true, "parking": false, "elevator": true, "pets_allowed": false, "washing_machine": true}',
    ARRAY['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    'https://example.com/listing/1',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'Spacious 3-Room Flat in Schwabing',
    'Large apartment in Munich''s trendy Schwabing district. High ceilings, wooden floors, and lots of natural light.',
    'Leopoldstraße 88',
    'Munich',
    '80802',
    'Germany',
    3,
    85.00,
    2,
    4,
    1400.00,
    220.00,
    2800.00,
    '2025-12-01',
    true,
    '{"furnished": false, "balcony": true, "parking": true, "elevator": false, "pets_allowed": true, "washing_machine": false}',
    ARRAY['https://example.com/img3.jpg', 'https://example.com/img4.jpg', 'https://example.com/img5.jpg'],
    'https://example.com/listing/2',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'Modern Studio in Altona',
    'Compact and modern studio apartment in Hamburg-Altona. Fully furnished and move-in ready.',
    'Große Bergstraße 15',
    'Hamburg',
    '22767',
    'Germany',
    1,
    38.00,
    1,
    3,
    750.00,
    120.00,
    1500.00,
    '2025-11-20',
    true,
    '{"furnished": true, "balcony": false, "parking": false, "elevator": false, "pets_allowed": false, "washing_machine": true}',
    ARRAY['https://example.com/img6.jpg'],
    'https://example.com/listing/3',
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    'Bright 2-Room with Balcony - Prenzlauer Berg',
    'Charming apartment in popular Prenzlauer Berg. Quiet courtyard location with a sunny balcony.',
    'Kollwitzstraße 67',
    'Berlin',
    '10435',
    'Germany',
    2,
    62.00,
    4,
    5,
    1100.00,
    160.00,
    2200.00,
    '2025-12-15',
    true,
    '{"furnished": false, "balcony": true, "parking": false, "elevator": true, "pets_allowed": true, "washing_machine": false}',
    ARRAY['https://example.com/img7.jpg', 'https://example.com/img8.jpg'],
    'https://example.com/listing/4',
    null
  ),
  (
    'Luxury 3-Room Penthouse in Charlottenburg',
    'Stunning penthouse apartment with roof terrace. Premium finishes throughout.',
    'Kurfürstendamm 123',
    'Berlin',
    '10711',
    'Germany',
    3,
    95.00,
    6,
    6,
    2200.00,
    280.00,
    4400.00,
    '2026-01-01',
    true,
    '{"furnished": true, "balcony": false, "parking": true, "elevator": true, "pets_allowed": false, "washing_machine": true, "terrace": true, "dishwasher": true}',
    ARRAY['https://example.com/img9.jpg', 'https://example.com/img10.jpg', 'https://example.com/img11.jpg'],
    'https://example.com/listing/5',
    null
  ),
  (
    'Student-Friendly 1-Room Apartment',
    'Affordable studio perfect for students. Close to public transport and universities.',
    'Warschauer Straße 34',
    'Berlin',
    '10243',
    'Germany',
    1,
    32.00,
    2,
    4,
    650.00,
    100.00,
    1300.00,
    '2025-11-10',
    true,
    '{"furnished": true, "balcony": false, "parking": false, "elevator": false, "pets_allowed": false, "washing_machine": false}',
    ARRAY['https://example.com/img12.jpg'],
    'https://example.com/listing/6',
    null
  ),
  (
    'Family-Sized 4-Room Apartment in Eppendorf',
    'Spacious family apartment in quiet Hamburg neighborhood. Garden access included.',
    'Eppendorfer Landstraße 92',
    'Hamburg',
    '20249',
    'Germany',
    4,
    110.00,
    1,
    3,
    1800.00,
    240.00,
    3600.00,
    '2026-02-01',
    true,
    '{"furnished": false, "balcony": false, "parking": true, "elevator": false, "pets_allowed": true, "washing_machine": false, "garden": true}',
    ARRAY['https://example.com/img13.jpg', 'https://example.com/img14.jpg'],
    'https://example.com/listing/7',
    null
  ),
  (
    'Modern 2-Room Apartment near Marienplatz',
    'Contemporary apartment in Munich city center. Walking distance to all major attractions.',
    'Sendlinger Straße 45',
    'Munich',
    '80331',
    'Germany',
    2,
    55.00,
    3,
    5,
    1350.00,
    190.00,
    2700.00,
    '2025-12-20',
    true,
    '{"furnished": false, "balcony": false, "parking": false, "elevator": true, "pets_allowed": false, "washing_machine": true}',
    ARRAY['https://example.com/img15.jpg', 'https://example.com/img16.jpg'],
    'https://example.com/listing/8',
    null
  );


-- ====================================
-- SAMPLE MATCHES
-- ====================================
-- Calculate and insert matches for users
-- Using the calculate_match_score function

-- Matches for Alice (looking for 2-room in Berlin, 800-1200 EUR)
insert into public.matches (user_id, apartment_id, match_score, match_reasons, status)
select
  '11111111-1111-1111-1111-111111111111',
  id,
  public.calculate_match_score('11111111-1111-1111-1111-111111111111', id),
  jsonb_build_object(
    'budget_match', rent_monthly between 800 and 1200,
    'location_match', city = 'Berlin',
    'rooms_match', rooms = 2
  ),
  case
    when public.calculate_match_score('11111111-1111-1111-1111-111111111111', id) >= 0.7 then 'interested'
    when public.calculate_match_score('11111111-1111-1111-1111-111111111111', id) >= 0.4 then 'pending'
    else 'not_interested'
  end
from public.apartments
where is_available = true
on conflict (user_id, apartment_id) do nothing;

-- Matches for Bob (looking for 3-room in Munich, 1000-1500 EUR)
insert into public.matches (user_id, apartment_id, match_score, match_reasons, status)
select
  '22222222-2222-2222-2222-222222222222',
  id,
  public.calculate_match_score('22222222-2222-2222-2222-222222222222', id),
  jsonb_build_object(
    'budget_match', rent_monthly between 1000 and 1500,
    'location_match', city = 'Munich',
    'rooms_match', rooms = 3
  ),
  case
    when public.calculate_match_score('22222222-2222-2222-2222-222222222222', id) >= 0.7 then 'interested'
    when public.calculate_match_score('22222222-2222-2222-2222-222222222222', id) >= 0.4 then 'pending'
    else 'not_interested'
  end
from public.apartments
where is_available = true
on conflict (user_id, apartment_id) do nothing;

-- Matches for Clara (looking for 1-room in Hamburg, 600-900 EUR)
insert into public.matches (user_id, apartment_id, match_score, match_reasons, status)
select
  '33333333-3333-3333-3333-333333333333',
  id,
  public.calculate_match_score('33333333-3333-3333-3333-333333333333', id),
  jsonb_build_object(
    'budget_match', rent_monthly between 600 and 900,
    'location_match', city = 'Hamburg',
    'rooms_match', rooms = 1
  ),
  case
    when public.calculate_match_score('33333333-3333-3333-3333-333333333333', id) >= 0.7 then 'interested'
    when public.calculate_match_score('33333333-3333-3333-3333-333333333333', id) >= 0.4 then 'pending'
    else 'not_interested'
  end
from public.apartments
where is_available = true
on conflict (user_id, apartment_id) do nothing;
