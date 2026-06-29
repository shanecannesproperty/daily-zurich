-- Phase 1: backfill controls + newsletter tokens + content seeds for canberra.
-- Run once in the Supabase SQL editor (project sjcwxiesvetkblatydrd).
-- Idempotent: safe to re-run.

-- =========================================================================
-- 1) Agent config: backfill window
-- =========================================================================
alter table public.agent_config
  add column if not exists backfill_from timestamptz,
  add column if not exists backfill_until timestamptz,
  add column if not exists backfill_requested_at timestamptz;

-- =========================================================================
-- 2) Newsletter double opt-in tokens
-- =========================================================================
alter table public.subscribers
  add column if not exists confirm_token text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists unsubscribe_token text,
  add column if not exists unsubscribed_at timestamptz;

create unique index if not exists subscribers_confirm_token_uq
  on public.subscribers (confirm_token) where confirm_token is not null;
create unique index if not exists subscribers_unsubscribe_token_uq
  on public.subscribers (unsubscribe_token) where unsubscribe_token is not null;

-- Public can read by token only (for confirm/unsubscribe pages).
-- Grant SELECT on minimal columns. Avoid leaking the full subscriber list.
do $$
begin
  -- separate policies are easier to drop/recreate than ALL
  if not exists (select 1 from pg_policies where tablename = 'subscribers' and policyname = 'anon read by confirm token') then
    create policy "anon read by confirm token" on public.subscribers
      for select to anon
      using (confirm_token is not null);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'subscribers' and policyname = 'anon read by unsub token') then
    create policy "anon read by unsub token" on public.subscribers
      for select to anon
      using (unsubscribe_token is not null);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'subscribers' and policyname = 'anon update via tokens') then
    create policy "anon update via tokens" on public.subscribers
      for update to anon
      using (confirm_token is not null or unsubscribe_token is not null)
      with check (true);
  end if;
end $$;

grant select (id, city, email, status, confirm_token, confirmed_at, unsubscribe_token, unsubscribed_at) on public.subscribers to anon;
grant update (status, confirmed_at, unsubscribed_at) on public.subscribers to anon;

-- =========================================================================
-- 3) Event source URL seeds (canberra)
-- Source kinds: html, rss, ics, sitemap
-- =========================================================================
insert into public.sources (city, kind, url, is_active)
select 'canberra', kind, url, true
from (values
  ('html', 'https://canberratheatrecentre.com.au/whats-on/'),
  ('html', 'https://llewellynhall.com.au/whats-on/'),
  ('html', 'https://giostadiumcanberra.com.au/whats-on/'),
  ('html', 'https://capitalregionfarmersmarket.com.au/'),
  ('html', 'https://events.act.gov.au/'),
  ('html', 'https://nga.gov.au/whats-on/'),
  ('html', 'https://www.portrait.gov.au/visit/whats-on'),
  ('html', 'https://www.nfsa.gov.au/whats-on'),
  ('html', 'https://www.questacon.edu.au/visit/whats-on'),
  ('html', 'https://www.moadoph.gov.au/visit/whats-on/'),
  ('html', 'https://www.anu.edu.au/events'),
  ('html', 'https://visitcanberra.com.au/events'),
  ('html', 'https://thecanberracentre.com.au/events'),
  ('html', 'https://www.nma.gov.au/visit/whats-on'),
  ('html', 'https://www.questacon.edu.au/'),
  ('html', 'https://www.canberra.museum/whats-on/'),
  ('html', 'https://www.csiro.au/en/about/visit-us/discovery-centre'),
  ('html', 'https://canberraglassworks.com/whats-on/'),
  ('html', 'https://craftact.org.au/exhibitions/'),
  ('html', 'https://cmag.com.au/exhibitions/'),
  ('html', 'https://www.belcoarts.com.au/whats-on'),
  ('html', 'https://thestreet.org.au/whats-on/'),
  ('html', 'https://www.tugg.com.au/whats-on/'),
  ('html', 'https://www.canberrarep.org.au/'),
  ('html', 'https://www.smithsalternative.com/whats-on'),
  ('html', 'https://www.unibarcanberra.com/'),
  ('html', 'https://obdm.com.au/'),
  ('html', 'https://christmasinjuly.com.au/')
) as s(kind, url)
where not exists (
  select 1 from public.sources s2 where s2.city = 'canberra' and s2.url = s.url
);

-- =========================================================================
-- 4) Best-of guide seeds (canberra)
-- =========================================================================
insert into public.guides (city, slug, title, target_keyword, category, intro_html, seo_title, meta_description, is_published)
select 'canberra', slug, title, target_keyword, category::text, intro_html, seo_title, meta_description, true
from (values
  ('best-cafes-canberra', 'Best Cafes in Canberra', 'best cafes canberra', 'food-dining',
   '<p>Specialty coffee in Canberra is world class. From third wave roasters in Braddon to neighbourhood favourites in the inner south, here are the cafes our newsroom returns to.</p>',
   'Best Cafes in Canberra 2026 | The Daily Canberra',
   'The best cafes in Canberra. Specialty coffee, brunch and quiet corners, ranked by The Daily Canberra newsroom.'),
  ('best-brunch-canberra', 'Best Brunch in Canberra', 'best brunch canberra', 'food-dining',
   '<p>Weekend brunch is a Canberra institution. These rooms do it without the queue tax.</p>',
   'Best Brunch in Canberra | The Daily Canberra',
   'Where to brunch in Canberra. Verified picks across Braddon, Kingston, Manuka, Belconnen and beyond.'),
  ('best-dinner-canberra', 'Best Dinner Restaurants in Canberra', 'best dinner canberra', 'food-dining',
   '<p>From inner-north tasting menus to neighbourhood bistros, the dinner rooms worth a booking.</p>',
   'Best Dinner Restaurants in Canberra | The Daily Canberra',
   'Best dinner restaurants in Canberra. Independent reviews from The Daily Canberra newsroom.'),
  ('best-date-night-canberra', 'Best Date Night Spots in Canberra', 'date night canberra', 'food-dining',
   '<p>Soft lighting, a strong wine list and a kitchen that can hold a conversation. Our date night shortlist.</p>',
   'Best Date Night Restaurants in Canberra | The Daily Canberra',
   'Date night in Canberra: the rooms with the right mood and the right kitchen.'),
  ('best-day-trips-canberra', 'Best Day Trips from Canberra', 'day trips canberra', 'tourism',
   '<p>Within a 90 minute drive of Civic: vineyards, wild beaches, alpine walks. Pack a thermos.</p>',
   'Best Day Trips from Canberra | The Daily Canberra',
   'The best day trips from Canberra. Vineyards, coastlines, mountains and country pubs, mapped.'),
  ('best-hikes-canberra', 'Best Hikes in and around Canberra', 'best hikes canberra', 'things-to-do',
   '<p>From Mount Ainslie at dawn to the wild ridge lines of Namadgi, the walks that locals do on repeat.</p>',
   'Best Hikes in Canberra | The Daily Canberra',
   'Best hikes in and around Canberra, with distance, difficulty and what to look for.'),
  ('best-dog-friendly-canberra', 'Best Dog Friendly Spots in Canberra', 'dog friendly canberra', 'things-to-do',
   '<p>Off-lead parks, dog-welcoming pubs and the cafes that keep a water bowl on the deck.</p>',
   'Best Dog Friendly Spots in Canberra | The Daily Canberra',
   'Dog friendly Canberra: parks, cafes and weekend ideas where your dog is properly welcome.'),
  ('best-kid-friendly-canberra', 'Best Kid Friendly Activities in Canberra', 'kid friendly canberra', 'things-to-do',
   '<p>Free, indoor, outdoor and rainy day rescues. Tested by parents on the school run.</p>',
   'Best Kid Friendly Activities in Canberra | The Daily Canberra',
   'Things to do with kids in Canberra. Free and low cost ideas, plus rainy day rescues.'),
  ('best-rainy-day-canberra', 'Best Rainy Day Things to Do in Canberra', 'rainy day canberra', 'things-to-do',
   '<p>When the weather closes in, the capital is one of the best cities in the country to be stuck indoors.</p>',
   'Best Rainy Day Activities in Canberra | The Daily Canberra',
   'Rainy day Canberra: museums, galleries, cinemas and warm rooms with great coffee.')
) as g(slug, title, target_keyword, category, intro_html, seo_title, meta_description)
where not exists (
  select 1 from public.guides g2 where g2.city = 'canberra' and g2.slug = g.slug
);

-- =========================================================================
-- 5) Guide entry seeds. Anchored to the guide slugs above.
-- =========================================================================
with g as (
  select id, slug from public.guides where city = 'canberra'
)
insert into public.guide_entries (guide_id, rank, business_name, blurb, suburb, source_url, website_url, is_featured)
select g.id, e.rank, e.business_name, e.blurb, e.suburb, e.source_url, e.website_url, e.is_featured
from g
join (values
  -- Cafes
  ('best-cafes-canberra', 1, 'Lonsdale Street Roasters', 'The Braddon classic. Long lines for a reason: tight espresso, deeply consistent.', 'Braddon', 'https://www.lonsdalestreetroasters.com', 'https://www.lonsdalestreetroasters.com', true),
  ('best-cafes-canberra', 2, 'Barrio Collective', 'Single origin specialty, brewed precisely. The bar to beat in Canberra.', 'Braddon', 'https://www.barriocollective.com', 'https://www.barriocollective.com', false),
  ('best-cafes-canberra', 3, 'Cupping Room', 'Roasters direct, full breakfast menu and one of the city''s best filter programs.', 'Civic', 'https://www.thecuppingroom.com.au', 'https://www.thecuppingroom.com.au', false),
  ('best-cafes-canberra', 4, 'Bittersweet', 'A neighbourhood breakfast room in Yarralumla with a loyal weekend crowd.', 'Yarralumla', 'https://www.bittersweetbreakfast.com.au', 'https://www.bittersweetbreakfast.com.au', false),
  ('best-cafes-canberra', 5, 'Highroad', 'Curtin shops mainstay. Quiet weekday mornings, busy weekend brunch.', 'Curtin', 'https://highroadcafe.com.au', 'https://highroadcafe.com.au', false),
  ('best-cafes-canberra', 6, 'ONA Coffee Manuka', 'Sasa Sestic''s flagship. Coffee programs that have won the World Barista title.', 'Manuka', 'https://onacoffee.com.au', 'https://onacoffee.com.au', false),
  ('best-cafes-canberra', 7, 'Two Before Ten', 'Aranda local with a sister property at Pialligo. Cosy and consistent.', 'Aranda', 'https://twobeforeten.com.au', 'https://twobeforeten.com.au', false),
  ('best-cafes-canberra', 8, 'Local Press Cafe', 'Kingston Foreshore breakfast institution with serious avocado on toast credentials.', 'Kingston', 'https://localpresscafe.com.au', 'https://localpresscafe.com.au', false),

  -- Brunch
  ('best-brunch-canberra', 1, 'Pilot', 'The Ainslie wine bar that does a serious weekend brunch. Book ahead.', 'Ainslie', 'https://www.pilotrestaurant.com', 'https://www.pilotrestaurant.com', true),
  ('best-brunch-canberra', 2, 'Lazy Su', 'Korean American brunch with a kimchi pancake to remember.', 'Braddon', 'https://lazy-su.com.au', 'https://lazy-su.com.au', false),
  ('best-brunch-canberra', 3, 'Such and Such', 'Bondi by way of Braddon. The eggs are the point.', 'Braddon', 'https://www.suchandsuchcafe.com.au', 'https://www.suchandsuchcafe.com.au', false),
  ('best-brunch-canberra', 4, 'Penny University', 'Kingston, sun on the deck, a proper espresso.', 'Kingston', 'https://www.pennyuniversity.com.au', 'https://www.pennyuniversity.com.au', false),
  ('best-brunch-canberra', 5, 'Cream Cafe', 'Belconnen brunch in a converted milk bar. Lines on the weekend.', 'Belconnen', 'https://www.creamcafe.com.au', 'https://www.creamcafe.com.au', false),
  ('best-brunch-canberra', 6, 'Pollen', 'Inside the Botanic Gardens. Brunch with rosellas and a view.', 'Acton', 'https://www.pollencafe.com.au', 'https://www.pollencafe.com.au', false),

  -- Dinner
  ('best-dinner-canberra', 1, 'Pilot', 'Tasting menus that put Ainslie shops on the national map.', 'Ainslie', 'https://www.pilotrestaurant.com', 'https://www.pilotrestaurant.com', true),
  ('best-dinner-canberra', 2, 'Aubergine', 'Griffith fine dining. The Canberra Times Hat list regular.', 'Griffith', 'https://www.aubergine.com.au', 'https://www.aubergine.com.au', false),
  ('best-dinner-canberra', 3, 'Eightysix', 'Open kitchen energy on Lonsdale Street. Order the lamb ribs.', 'Braddon', 'https://www.eightysix.com.au', 'https://www.eightysix.com.au', false),
  ('best-dinner-canberra', 4, 'Akiba', 'Pan-Asian, late nights and a Bloody Mary list. The Civic standby.', 'Civic', 'https://www.akiba.com.au', 'https://www.akiba.com.au', false),
  ('best-dinner-canberra', 5, 'Pomegranate', 'Sharing plates in a courtyard, with a wine list that knows what it''s doing.', 'Civic', 'https://www.pomegranaterestaurant.com.au', 'https://www.pomegranaterestaurant.com.au', false),
  ('best-dinner-canberra', 6, 'Pialligo Estate', 'A working farm at the edge of the airport, with one of the best Sunday lunches in town.', 'Pialligo', 'https://www.pialligoestate.com.au', 'https://www.pialligoestate.com.au', false),

  -- Date night
  ('best-date-night-canberra', 1, 'Pilot', 'Soft light, the right music, food that does the talking.', 'Ainslie', 'https://www.pilotrestaurant.com', 'https://www.pilotrestaurant.com', true),
  ('best-date-night-canberra', 2, 'Bar Rochford', 'The first-floor Civic wine bar that quietly raised the bar for the whole city.', 'Civic', 'https://www.barrochford.com', 'https://www.barrochford.com', false),
  ('best-date-night-canberra', 3, 'Such and Such', 'Tucked-away corner room, a tight wine list and food made for sharing.', 'Braddon', 'https://www.suchandsuchcafe.com.au', 'https://www.suchandsuchcafe.com.au', false),
  ('best-date-night-canberra', 4, 'Molly', 'Speakeasy off Odgers Lane. Cocktails that take their time.', 'Civic', 'https://mollybar.com.au', 'https://mollybar.com.au', false),
  ('best-date-night-canberra', 5, 'Aubergine', 'A long, considered dinner. For the moment that matters.', 'Griffith', 'https://www.aubergine.com.au', 'https://www.aubergine.com.au', false),

  -- Day trips
  ('best-day-trips-canberra', 1, 'Murrumbateman wineries', 'Twenty minutes north. Clonakilla, Helm and a half dozen tasting rooms.', 'Murrumbateman', 'https://www.murrumbatemanwineroute.com.au', 'https://www.murrumbatemanwineroute.com.au', true),
  ('best-day-trips-canberra', 2, 'Batemans Bay', 'The closest patch of NSW coast. Oysters on the harbour, surf on the way home.', 'Batemans Bay', 'https://www.eurobodalla.com.au', 'https://www.eurobodalla.com.au', false),
  ('best-day-trips-canberra', 3, 'Tidbinbilla Nature Reserve', 'Walk among kangaroos, koalas and the Deep Space tracking dishes.', 'Paddys River', 'https://www.tidbinbilla.act.gov.au', 'https://www.tidbinbilla.act.gov.au', false),
  ('best-day-trips-canberra', 4, 'Mount Kosciuszko (summer)', 'Two hour drive, a chairlift, then the highest summit in Australia.', 'Thredbo', 'https://www.thredbo.com.au/summer', 'https://www.thredbo.com.au/summer', false),
  ('best-day-trips-canberra', 5, 'Braidwood', 'Heritage main street, great bakery and antique shops worth the detour.', 'Braidwood', 'https://www.visitbraidwood.com.au', 'https://www.visitbraidwood.com.au', false),

  -- Hikes
  ('best-hikes-canberra', 1, 'Mount Ainslie summit', 'Forty minute climb from War Memorial. Sunrise is the move.', 'Ainslie', 'https://www.environment.act.gov.au', 'https://www.environment.act.gov.au', true),
  ('best-hikes-canberra', 2, 'Booroomba Rocks', 'Hour return for a 360 degree view of Namadgi. Bring a windbreaker.', 'Namadgi NP', 'https://www.environment.act.gov.au/parks-conservation/parks-and-reserves/find-a-park/namadgi-national-park', 'https://www.environment.act.gov.au', false),
  ('best-hikes-canberra', 3, 'Square Rock', 'Granite tor scramble with sweeping ACT views. Two hours return.', 'Namadgi NP', 'https://www.environment.act.gov.au', 'https://www.environment.act.gov.au', false),
  ('best-hikes-canberra', 4, 'Mount Majura via Hackett', 'Quiet, forested climb. Less crowded than Ainslie next door.', 'Hackett', 'https://www.environment.act.gov.au', 'https://www.environment.act.gov.au', false),
  ('best-hikes-canberra', 5, 'Lake Burley Griffin bridge to bridge', 'Five km flat loop. Pram and dog friendly.', 'Parkes', 'https://www.nca.gov.au', 'https://www.nca.gov.au', false),

  -- Dog friendly
  ('best-dog-friendly-canberra', 1, 'Forde Dog Park', 'Big off-lead area, separate small dog zone, water bowls.', 'Forde', 'https://www.tccs.act.gov.au', 'https://www.tccs.act.gov.au', true),
  ('best-dog-friendly-canberra', 2, 'Mount Pleasant', 'Off-lead climb with city views. A morning ritual for locals.', 'Campbell', 'https://www.environment.act.gov.au', 'https://www.environment.act.gov.au', false),
  ('best-dog-friendly-canberra', 3, 'Bentspoke Brewing Co', 'Dog welcome on the front deck. Cider for the human.', 'Braddon', 'https://www.bentspokebrewing.com.au', 'https://www.bentspokebrewing.com.au', false),
  ('best-dog-friendly-canberra', 4, 'Pialligo Estate gardens', 'Wide grounds, dog friendly cafe, a wine option for later.', 'Pialligo', 'https://www.pialligoestate.com.au', 'https://www.pialligoestate.com.au', false),

  -- Kid friendly
  ('best-kid-friendly-canberra', 1, 'Questacon', 'The free fall slide, the earthquake room. Reliable rainy day rescue.', 'Parkes', 'https://www.questacon.edu.au', 'https://www.questacon.edu.au', true),
  ('best-kid-friendly-canberra', 2, 'National Arboretum POD playground', 'Acorn-shaped cubbies, slides, an exceptional view.', 'Molonglo Valley', 'https://www.nationalarboretum.act.gov.au', 'https://www.nationalarboretum.act.gov.au', false),
  ('best-kid-friendly-canberra', 3, 'National Zoo and Aquarium', 'Smaller than Sydney/Melbourne, easier with little ones.', 'Yarralumla', 'https://www.nationalzoo.com.au', 'https://www.nationalzoo.com.au', false),
  ('best-kid-friendly-canberra', 4, 'Boundless Playground', 'All-abilities playground next to Lake Burley Griffin.', 'Parkes', 'https://www.boundlesscanberra.org.au', 'https://www.boundlesscanberra.org.au', false),
  ('best-kid-friendly-canberra', 5, 'National Dinosaur Museum', 'Gold Creek institution. Worth the drive for dinosaur obsessives.', 'Gold Creek', 'https://nationaldinosaurmuseum.com.au', 'https://nationaldinosaurmuseum.com.au', false),

  -- Rainy day
  ('best-rainy-day-canberra', 1, 'National Gallery of Australia', 'Free entry. The most important art collection in the country.', 'Parkes', 'https://nga.gov.au', 'https://nga.gov.au', true),
  ('best-rainy-day-canberra', 2, 'National Film and Sound Archive', 'Free exhibitions, frequent screenings in the Arc Cinema.', 'Acton', 'https://www.nfsa.gov.au', 'https://www.nfsa.gov.au', false),
  ('best-rainy-day-canberra', 3, 'Questacon', 'Indoors, science, kids love it. The Canberra rainy day default.', 'Parkes', 'https://www.questacon.edu.au', 'https://www.questacon.edu.au', false),
  ('best-rainy-day-canberra', 4, 'National Portrait Gallery', 'Smaller, quieter, brilliant cafe.', 'Parkes', 'https://www.portrait.gov.au', 'https://www.portrait.gov.au', false),
  ('best-rainy-day-canberra', 5, 'Palace Electric', 'NewActon cinema with leather seats and a wine list.', 'Acton', 'https://www.palacecinemas.com.au/cinemas/electric', 'https://www.palacecinemas.com.au', false)
) as e(guide_slug, rank, business_name, blurb, suburb, source_url, website_url, is_featured) on g.slug = e.guide_slug
where not exists (
  select 1 from public.guide_entries ge
  where ge.guide_id = g.id and ge.business_name = e.business_name
);

-- =========================================================================
-- 6) Directory listing seeds (canberra)
-- =========================================================================
insert into public.listings (city, business_name, category, suburb, source_url, website_url, is_featured, is_sponsored)
select 'canberra', business_name, category, suburb, source_url, website_url, false, false
from (values
  ('Lonsdale Street Roasters', 'Cafe', 'Braddon', 'https://www.lonsdalestreetroasters.com', 'https://www.lonsdalestreetroasters.com'),
  ('Barrio Collective', 'Cafe', 'Braddon', 'https://www.barriocollective.com', 'https://www.barriocollective.com'),
  ('Cupping Room', 'Cafe', 'Civic', 'https://www.thecuppingroom.com.au', 'https://www.thecuppingroom.com.au'),
  ('Bittersweet', 'Cafe', 'Yarralumla', 'https://www.bittersweetbreakfast.com.au', 'https://www.bittersweetbreakfast.com.au'),
  ('Highroad', 'Cafe', 'Curtin', 'https://highroadcafe.com.au', 'https://highroadcafe.com.au'),
  ('ONA Coffee Manuka', 'Cafe', 'Manuka', 'https://onacoffee.com.au', 'https://onacoffee.com.au'),
  ('Two Before Ten', 'Cafe', 'Aranda', 'https://twobeforeten.com.au', 'https://twobeforeten.com.au'),
  ('Local Press Cafe', 'Cafe', 'Kingston', 'https://localpresscafe.com.au', 'https://localpresscafe.com.au'),
  ('Penny University', 'Cafe', 'Kingston', 'https://www.pennyuniversity.com.au', 'https://www.pennyuniversity.com.au'),
  ('Cream Cafe', 'Cafe', 'Belconnen', 'https://www.creamcafe.com.au', 'https://www.creamcafe.com.au'),
  ('Pilot', 'Restaurant', 'Ainslie', 'https://www.pilotrestaurant.com', 'https://www.pilotrestaurant.com'),
  ('Lazy Su', 'Restaurant', 'Braddon', 'https://lazy-su.com.au', 'https://lazy-su.com.au'),
  ('Such and Such', 'Restaurant', 'Braddon', 'https://www.suchandsuchcafe.com.au', 'https://www.suchandsuchcafe.com.au'),
  ('Eightysix', 'Restaurant', 'Braddon', 'https://www.eightysix.com.au', 'https://www.eightysix.com.au'),
  ('Akiba', 'Restaurant', 'Civic', 'https://www.akiba.com.au', 'https://www.akiba.com.au'),
  ('Aubergine', 'Restaurant', 'Griffith', 'https://www.aubergine.com.au', 'https://www.aubergine.com.au'),
  ('Pomegranate', 'Restaurant', 'Civic', 'https://www.pomegranaterestaurant.com.au', 'https://www.pomegranaterestaurant.com.au'),
  ('Pialligo Estate', 'Restaurant', 'Pialligo', 'https://www.pialligoestate.com.au', 'https://www.pialligoestate.com.au'),
  ('Bar Rochford', 'Bar', 'Civic', 'https://www.barrochford.com', 'https://www.barrochford.com'),
  ('Molly', 'Bar', 'Civic', 'https://mollybar.com.au', 'https://mollybar.com.au'),
  ('Hopscotch', 'Bar', 'Braddon', 'https://www.hopscotchbar.com.au', 'https://www.hopscotchbar.com.au'),
  ('Bentspoke Brewing Co', 'Brewery', 'Braddon', 'https://www.bentspokebrewing.com.au', 'https://www.bentspokebrewing.com.au'),
  ('Capital Brewing Co', 'Brewery', 'Fyshwick', 'https://capitalbrewing.co', 'https://capitalbrewing.co'),
  ('BlackMarket Restaurant', 'Restaurant', 'Hackett', 'https://blackmarketcanberra.com', 'https://blackmarketcanberra.com'),
  ('Canberra Theatre Centre', 'Venue', 'Civic', 'https://canberratheatrecentre.com.au', 'https://canberratheatrecentre.com.au'),
  ('Llewellyn Hall', 'Venue', 'Acton', 'https://llewellynhall.com.au', 'https://llewellynhall.com.au'),
  ('GIO Stadium Canberra', 'Venue', 'Bruce', 'https://giostadiumcanberra.com.au', 'https://giostadiumcanberra.com.au'),
  ('Capital Region Farmers Market', 'Market', 'Mitchell', 'https://capitalregionfarmersmarket.com.au', 'https://capitalregionfarmersmarket.com.au'),
  ('Old Bus Depot Markets', 'Market', 'Kingston', 'https://obdm.com.au', 'https://obdm.com.au'),
  ('Palace Electric', 'Cinema', 'Acton', 'https://www.palacecinemas.com.au/cinemas/electric', 'https://www.palacecinemas.com.au'),
  ('National Gallery of Australia', 'Gallery', 'Parkes', 'https://nga.gov.au', 'https://nga.gov.au'),
  ('National Portrait Gallery', 'Gallery', 'Parkes', 'https://www.portrait.gov.au', 'https://www.portrait.gov.au'),
  ('National Film and Sound Archive', 'Cultural', 'Acton', 'https://www.nfsa.gov.au', 'https://www.nfsa.gov.au'),
  ('Questacon', 'Family', 'Parkes', 'https://www.questacon.edu.au', 'https://www.questacon.edu.au'),
  ('National Arboretum', 'Park', 'Molonglo Valley', 'https://www.nationalarboretum.act.gov.au', 'https://www.nationalarboretum.act.gov.au')
) as l(business_name, category, suburb, source_url, website_url)
where not exists (
  select 1 from public.listings l2
  where l2.city = 'canberra' and l2.business_name = l.business_name
);
