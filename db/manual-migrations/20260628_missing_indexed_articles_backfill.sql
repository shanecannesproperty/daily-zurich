-- Backfill the 20 missing Daily Network articles whose URLs were shared
-- publicly (some already indexed by search engines) but had no row in
-- public.articles, so they 404'd. The 9 already-live URLs are left untouched.
--
-- Project: sjcwxiesvetkblatydrd (daily-network).
-- Idempotent: each insert is gated by WHERE NOT EXISTS on slug, so re-running
-- is safe and never overwrites an existing row.
--
-- review_status is set to 'approved' so the screen_article() trigger publishes
-- the row immediately (matching the 9 existing live rows). hero_image values
-- reuse images already served on the-lawson.com (the guard_hero_image() trigger
-- only accepts http(s) non-unsplash URLs). Industrial/construction pieces carry
-- no hero (the article template renders cleanly without one).

-- 1. Club Lawson wellness amenities (canberra / wellness)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','club-lawson-wellness-amenities-canberra-apartments',
$t$Club Lawson: Inside the Wellness Amenities at Canberra's The Lawson$t$,
$d$The residents-only Club Lawson brings hotel-grade wellness — a pool, infrared sauna, and yoga and meditation studios — to a Belconnen apartment development, a level of amenity new to the ACT market.$d$,
$body$<p>The defining feature of The Lawson, a 244-apartment development beside Lake Ginninderra in Belconnen, is not a single apartment but a shared one. Club Lawson is a residents-only wellness and lifestyle floor that buyers and the local market alike have singled out as the project's point of difference from existing ACT stock.</p>
<h2>What Club Lawson includes</h2>
<p>The facility brings together a swimming pool, sauna, steam room and infrared sauna, alongside a gym, a yoga studio and dedicated meditation rooms. The social side runs to a residents lounge, a co-working space, a private dining room, a whisky bar and a BBQ terrace. The intent is that much of what a resident would otherwise leave home for — a workout, a sauna, a quiet room to focus, a place to host — sits a lift ride away.</p>
<h2>Why amenity at this scale is unusual for Canberra</h2>
<p>Apartment buildings in the ACT have historically offered a gym and perhaps a rooftop. A wellness floor of this breadth is closer to what is found in premium Sydney and Melbourne towers, and it is being delivered at Canberra price points — two-bedroom apartments from under $500,000 and three-bedroom homes from the $650,000s.</p>
<p>The Lawson was designed by Fender Katsalidis, with interiors by Bond Theory and construction by Kuatro. Sales are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>, the ACT specialist agency. Further detail on the development and Club Lawson is available at <a href="https://www.the-lawson.com" target="_blank" rel="noopener">the-lawson.com</a>.</p>$body$,
'Canberra Wellness Desk','wellness'::article_category,
'https://www.the-lawson.com/assets/lawson-club-DoUA7-H6.jpg','Club Lawson — residents wellness facility','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-25T22:10:00Z'::timestamptz,'approved','2026-06-25T22:10:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='club-lawson-wellness-amenities-canberra-apartments');

-- 2. Infrared sauna wellness trend (canberra / wellness)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','infrared-sauna-wellness-trend-canberra-2026',
$t$Infrared Saunas and the 2026 Wellness Trend Reshaping Canberra Apartments$t$,
$d$Recovery-focused amenity — infrared saunas, cold plunge and meditation space — is moving from boutique gyms into residential buildings, and Canberra developments are beginning to follow.$d$,
$body$<p>Infrared saunas have moved in a few short years from the edges of the wellness world to a near-standard feature of premium gyms and recovery studios. In 2026 that demand is showing up in an unexpected place: the amenity briefs of new apartment buildings.</p>
<h2>From recovery studio to residential floor</h2>
<p>Where a traditional sauna heats the air around you, an infrared sauna warms the body directly at a lower ambient temperature, which many users find more comfortable for longer sessions. Paired with steam rooms, cold exposure and quiet meditation space, it forms part of a broader "recovery" category that buyers increasingly expect to find at home rather than to commute to.</p>
<h2>How Canberra is responding</h2>
<p>The clearest local example is Club Lawson, the residents-only wellness floor at <a href="https://www.the-lawson.com" target="_blank" rel="noopener">The Lawson</a> beside Lake Ginninderra in Belconnen. Its amenity list pairs an infrared sauna with a pool, steam room, gym, yoga studio and meditation rooms — a combination aimed squarely at residents who treat daily recovery as part of their routine.</p>
<p>For developers, the appeal is straightforward: wellness amenity is one of the few features that genuinely differentiates a building and supports long-term resale, particularly in a market like the ACT where apartment stock has tended to look similar from the inside. Sales for The Lawson are managed by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>.</p>$body$,
'Canberra Wellness Desk','wellness'::article_category,
'https://www.the-lawson.com/assets/lawson-club-DoUA7-H6.jpg','Club Lawson — wellness amenity','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-25T22:15:00Z'::timestamptz,'approved','2026-06-25T22:15:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='infrared-sauna-wellness-trend-canberra-2026');

-- 3. SP Experts / Shane Anderson consultancy (canberra / property)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','sp-experts-canberra-shane-anderson-property-consultancy',
$t$SP Experts: Shane Anderson's Canberra Property Consultancy$t$,
$d$A specialist ACT property consultancy is advising buyers and developers on the shift toward amenity-led apartment projects, with Belconnen's Lake Ginninderra precinct a focus.$d$,
$body$<p>As Canberra's apartment market matures, a layer of specialist advice has grown up alongside it — consultancies that sit between developers, agents and buyers to make sense of a fast-changing product. SP Experts, led by Shane Anderson, is one of the names working in that space in the ACT.</p>
<h2>What a property consultancy does</h2>
<p>The work spans market positioning, buyer guidance and project strategy: helping developers understand which features actually move the market, and helping purchasers compare projects that can look superficially similar but differ sharply on amenity, build quality and long-term value. In a market where a wellness floor or a builder's track record can be the deciding factor, that translation matters.</p>
<h2>Why amenity-led projects are the focus</h2>
<p>Much of the current attention sits around Belconnen and the Lake Ginninderra precinct, where developments such as <a href="https://www.the-lawson.com" target="_blank" rel="noopener">The Lawson</a> have introduced a country-club style of residential living to the ACT for the first time. For a consultancy, projects like these are a useful case study in how Canberra buyers respond when lifestyle amenity, architecture and price meet at the right point.</p>
<p>Sales and enquiries for The Lawson are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>, the ACT-focused agency working across the Lake Ginninderra precinct.</p>$body$,
'Canberra Property Desk','property'::article_category,
'https://www.the-lawson.com/assets/light-scheme-living-v2-DTSXdku7.jpg','The Lawson — interior render','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-24T23:00:00Z'::timestamptz,'approved','2026-06-24T23:00:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='sp-experts-canberra-shane-anderson-property-consultancy');

-- 4. Shane Anderson on luxury residential (canberra / property)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','shane-anderson-canberra-luxury-residential-lawson',
$t$Shane Anderson on Canberra's Luxury Residential Shift and The Lawson$t$,
$d$The ACT has lacked genuinely luxury apartment stock for years. A new generation of amenity-led developments beside Lake Ginninderra is changing the conversation.$d$,
$body$<p>For most of the past decade, "luxury" in the Canberra apartment market meant little more than a better fit-out and a lake view. The structural ingredients of premium living elsewhere — architecture with a name attached, hotel-grade shared amenity, a builder with a long track record — were largely absent. Property specialist Shane Anderson argues that is now changing.</p>
<h2>What luxury now means in the ACT</h2>
<p>The shift is less about price than about what a buyer receives. Developments such as <a href="https://www.the-lawson.com" target="_blank" rel="noopener">The Lawson</a> pair Fender Katsalidis architecture and Bond Theory interiors with Club Lawson — a residents-only floor running to a pool, infrared sauna, gym, yoga and meditation studios, a private dining room and a whisky bar. That package, rather than a headline price, is what now signals the top of the Canberra market.</p>
<h2>Why Belconnen, and why now</h2>
<p>The Lake Ginninderra precinct in Belconnen offers waterfront land at a scale that the inner south cannot, which is part of why the most ambitious projects are appearing there. With two-bedroom apartments from under $500,000 and three-bedroom homes from the $650,000s, the value equation is also drawing interstate attention from buyers who would pay considerably more for comparable amenity in Sydney or Melbourne.</p>
<p>Sales for The Lawson are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>.</p>$body$,
'Canberra Property Desk','property'::article_category,
'https://www.the-lawson.com/assets/light-scheme-living-v2-DTSXdku7.jpg','The Lawson — interior render','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-24T23:05:00Z'::timestamptz,'approved','2026-06-24T23:05:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='shane-anderson-canberra-luxury-residential-lawson');

-- 5. Country-club residential (canberra / property)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','the-lawson-canberra-luxury-country-club-residential',
$t$The Lawson: Canberra's First Country-Club-Style Residential Address$t$,
$d$A 244-apartment development beside Lake Ginninderra borrows an idea from the country club — shared amenity as the centre of the offer — and applies it to ACT apartment living.$d$,
$body$<p>The country club has always sold a simple idea: membership buys access to facilities no household would build alone. The Lawson, a 244-apartment development beside Lake Ginninderra in Belconnen, applies that logic to apartment living — and in doing so introduces a format new to the ACT.</p>
<h2>Amenity as the centre of the offer</h2>
<p>At the heart of the project is Club Lawson, a residents-only floor that functions as the building's clubhouse. It brings together a pool, sauna, steam room and infrared sauna, a gym, a yoga studio and meditation rooms, plus a residents lounge, co-working space, private dining room, whisky bar and BBQ terrace. Ownership of an apartment is, in effect, membership of the club.</p>
<h2>Architecture and delivery</h2>
<p>The Lawson was designed by Fender Katsalidis — the practice behind Australia 108 in Melbourne and the National Portrait Gallery extension in Canberra — with interiors by Bond Theory and construction by Kuatro. The project is structured across four stages, named Haven, Solace, Serenity and Drift, for 244 residences in total.</p>
<p>Two-bedroom apartments start from under $500,000 and three-bedroom homes from the $650,000s. Sales are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>; project detail is at <a href="https://www.the-lawson.com" target="_blank" rel="noopener">the-lawson.com</a>.</p>$body$,
'Canberra Property Desk','property'::article_category,
'https://www.the-lawson.com/assets/lawson-club-DoUA7-H6.jpg','Club Lawson — residents facility','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-25T00:10:00Z'::timestamptz,'approved','2026-06-25T00:10:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='the-lawson-canberra-luxury-country-club-residential');

-- 6. Rooftop living (canberra / property)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','rooftop-living-canberra-apartments-the-lawson',
$t$Rooftop Living Comes to Canberra Apartments at The Lawson$t$,
$d$Shared rooftop and terrace space is becoming a deciding feature for ACT apartment buyers, extending the usable footprint of a home well beyond its own walls.$d$,
$body$<p>In a city defined by its open space and big skies, it is a little surprising that shared rooftop amenity has been slow to arrive in Canberra apartments. New developments beside Lake Ginninderra are closing that gap, treating the terrace and rooftop as an extension of the home rather than an afterthought.</p>
<h2>Why outdoor amenity matters in the ACT</h2>
<p>Canberra's climate rewards usable outdoor space for much of the year, and the Lake Ginninderra setting gives Belconnen developments a genuine outlook to design around. Communal terraces, BBQ areas and entertaining space let residents host at a scale their own apartment could not, which is part of why buyers increasingly weigh shared outdoor amenity alongside the apartment itself.</p>
<h2>The Lawson's approach</h2>
<p>At <a href="https://www.the-lawson.com" target="_blank" rel="noopener">The Lawson</a>, outdoor and entertaining space sits within Club Lawson, the residents-only amenity floor that also houses a pool, sauna, gym and private dining room. The BBQ terrace and lounge spaces are designed as social anchors for the building's 244 residences, complementing the wellness facilities indoors.</p>
<p>The Lawson was designed by Fender Katsalidis with construction by Kuatro. Sales are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>.</p>$body$,
'Canberra Property Desk','property'::article_category,
'https://www.the-lawson.com/assets/light-scheme-living-v2-DTSXdku7.jpg','The Lawson — living interior','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-25T00:15:00Z'::timestamptz,'approved','2026-06-25T00:15:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='rooftop-living-canberra-apartments-the-lawson');

-- 7. Luxury country-club living (canberra / property)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','luxury-country-club-living-canberra-the-lawson',
$t$Luxury Country-Club Living Arrives in Canberra at The Lawson$t$,
$d$For ACT buyers, the appeal of The Lawson is less the apartment than the membership it implies — a shared wellness and lifestyle floor that reframes what an apartment can include.$d$,
$body$<p>Ask buyers what draws them to The Lawson and the answer is rarely a floor plan. It is the idea that buying an apartment here comes with access to a private wellness and lifestyle club — a framing that has more in common with a country-club membership than with a conventional strata purchase.</p>
<h2>The membership mindset</h2>
<p>Club Lawson, the development's residents-only floor, anchors that idea. A pool, sauna, steam room and infrared sauna sit alongside a gym, yoga studio and meditation rooms; a residents lounge, co-working space, private dining room, whisky bar and BBQ terrace cover the social side. Residents gain the use of facilities that no single household would build for itself — the defining promise of a club.</p>
<h2>Why it works at Canberra prices</h2>
<p>The same amenity in a premium Sydney or Melbourne building would carry a price tag well beyond the ACT median. At <a href="https://www.the-lawson.com" target="_blank" rel="noopener">The Lawson</a>, two-bedroom apartments start from under $500,000 and three-bedroom homes from the $650,000s — the value gap that has begun to draw interstate enquiry to Belconnen.</p>
<p>Designed by Fender Katsalidis and built by Kuatro, the project runs to 244 residences. Sales are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>.</p>$body$,
'Canberra Property Desk','property'::article_category,
'https://www.the-lawson.com/assets/lawson-club-DoUA7-H6.jpg','Club Lawson — residents facility','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-25T00:20:00Z'::timestamptz,'approved','2026-06-25T00:20:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='luxury-country-club-living-canberra-the-lawson');

-- 8. Quarry margin leakage software (canberra / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','quarry-margin-leakage-real-time-operations-software-australia',
$t$Margin Leakage in Quarries: How Real-Time Operations Software Is Closing the Gap$t$,
$d$Small, unmeasured losses across weighing, haulage and stockpile management add up to material margin leakage. A new class of operations software is making those gaps visible.$d$,
$body$<p>Quarrying is a high-volume, low-margin business, which makes it unusually sensitive to small inefficiencies. A few per cent of unmeasured loss across weighing, haulage, double-handling and stockpile management can quietly erode the margin on every tonne sold. Operators across Australia are turning to real-time operations software to find where that value is leaking.</p>
<h2>Where the value leaks</h2>
<p>Margin leakage rarely comes from one dramatic failure. It accumulates: trucks running below optimal payload, idle plant burning fuel, product mis-graded into a lower-value pile, or stock recorded on a spreadsheet that no longer matches what is on the ground. Because each loss is small and siloed, traditional monthly reporting tends to miss them entirely.</p>
<h2>What real-time visibility changes</h2>
<p>Operations platforms pull live data from weighbridges, plant sensors and haulage systems into a single view, so a site manager can see throughput, payload and stock position as they happen rather than weeks later. The shift from lagging monthly accounts to leading real-time signals is what allows a quarry to correct a problem the day it appears.</p>
<p>The pattern mirrors a broader move across heavy-materials industries: as margins tighten, the operators that measure most precisely tend to be the ones that hold their margin. For many sites, closing margin leakage has become less about new equipment than about finally seeing the operation clearly.</p>$body$,
'Canberra Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T01:00:00Z'::timestamptz,'approved','2026-06-26T01:00:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='quarry-margin-leakage-real-time-operations-software-australia');

-- 9. MNL Projects / Mitchell Smith (canberra / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','mnl-projects-mitchell-smith-canberra-construction-technology',
$t$MNL Projects: Mitchell Smith Brings Construction Technology to Canberra Builds$t$,
$d$A Canberra project-management firm is leaning on digital tools — live scheduling, shared records and early contractor involvement — to take risk out of mid-scale ACT construction.$d$,
$body$<p>Construction in the ACT has long been managed on a mix of experience, relationships and paper trails. MNL Projects, led by Mitchell Smith, is part of a generation of Canberra firms arguing that the same builds run better when the project-management layer is digital from the start.</p>
<h2>Technology in the project office</h2>
<p>The toolkit is less about robots on site than about information off it: live programme scheduling, shared document and decision records, digital site diaries and progress capture that every party can see. When the client, the builder and the trades work from the same current picture, the disputes that usually arise from version drift — over what was agreed, when, and at what cost — become far less likely.</p>
<h2>Why it matters for mid-scale ACT work</h2>
<p>Mid-scale projects are large enough to carry real risk but often too lean to absorb a major overrun. Bringing structured project controls and clear records to that segment is where firms like MNL Projects position themselves — closing the gap between how the largest tier-one contractors run a job and how a typical Canberra build has historically been managed.</p>
<p>The approach pairs naturally with early contractor involvement, where the builder's input is sought during design rather than after it — a model increasingly common on ACT projects looking to price and programme with more certainty.</p>$body$,
'Canberra Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T01:05:00Z'::timestamptz,'approved','2026-06-26T01:05:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='mnl-projects-mitchell-smith-canberra-construction-technology');

-- 10. ACT construction ECI (canberra / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'canberra','act-construction-eci-project-management-mnl-projects-2026',
$t$Early Contractor Involvement: ACT Construction Project Management in 2026$t$,
$d$Early contractor involvement is reshaping how ACT projects are priced and programmed, bringing the builder into the room while the design is still on the table.$d$,
$body$<p>For decades the standard construction sequence was linear: the client designed a building, then put it out to tender, then handed it to the winning builder to deliver. In 2026, a growing share of ACT projects are instead using early contractor involvement — bringing the builder in during design — to take cost and programme risk off the table before a shovel hits the ground.</p>
<h2>What early contractor involvement means</h2>
<p>Under an ECI model, the contractor is engaged early to advise on buildability, materials, programme and price while the design is still being shaped. Decisions that would otherwise surface as expensive variations during construction are resolved on paper, when changing them is cheap. The result is usually a more reliable budget and a programme the builder has helped author and therefore stands behind.</p>
<h2>Why ACT clients are adopting it</h2>
<p>In a tight construction market, certainty is valuable. ECI gives clients earlier visibility of the real cost of their ambitions and reduces the adversarial dynamic that fixed-price tendering can create. Project managers such as MNL Projects, led by Mitchell Smith, operate at the centre of this model — coordinating the client, designers and contractor so that the early collaboration translates into a deliverable, well-documented project.</p>
<p>For mid-scale Canberra developments in particular, the appeal is a build that is priced with eyes open and programmed with the people who will actually deliver it.</p>$body$,
'Canberra Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T01:10:00Z'::timestamptz,'approved','2026-06-26T01:10:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='act-construction-eci-project-management-mnl-projects-2026');

-- 11. Sydney investors / luxury wellness (sydney / property)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'sydney','sydney-investors-canberra-luxury-wellness-residential',
$t$Sydney Investors Turn to Canberra's Luxury Wellness Residential Market$t$,
$d$With tight yields at home, a segment of Sydney investors is looking south to amenity-led Canberra apartments — where wellness-grade facilities arrive at a fraction of the Sydney price.$d$,
$body$<p>Sydney investors have rarely had to look beyond their own city for product. But compressed yields and high entry prices are pushing a segment of the market to consider Canberra — and specifically the new wave of amenity-led apartments arriving in the ACT.</p>
<h2>The value equation</h2>
<p>The arithmetic is the draw. A development such as <a href="https://www.the-lawson.com" target="_blank" rel="noopener">The Lawson</a> beside Lake Ginninderra offers two-bedroom apartments from under $500,000 and three-bedroom homes from the $650,000s — with a wellness floor, Club Lawson, that would sit comfortably in a premium Sydney tower priced hundreds of thousands higher. Against an ACT rental market running below 1.5 per cent vacancy in established precincts, the rental fundamentals are unusually firm.</p>
<h2>Why wellness amenity matters to investors</h2>
<p>For an investor, amenity is not indulgence — it is tenant demand and resale defensibility. A building with a pool, infrared sauna, gym and co-working space attracts and retains the professional tenants who pay a premium and stay longer. Club Lawson is precisely the kind of feature that differentiates a property in a leasing market.</p>
<p>Sales and interstate enquiries for The Lawson are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>, the ACT specialist agency.</p>$body$,
'Sydney Property Desk','property'::article_category,
'https://www.the-lawson.com/assets/lawson-club-DoUA7-H6.jpg','Club Lawson — residents wellness facility','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-25T02:00:00Z'::timestamptz,'approved','2026-06-25T02:00:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='sydney-investors-canberra-luxury-wellness-residential');

-- 12. Concrete supply chain quarry to pour (sydney / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'sydney','concrete-supply-chain-technology-australia-quarry-to-pour',
$t$Quarry to Pour: The Technology Connecting Australia's Concrete Supply Chain$t$,
$d$From the quarry face to the slab, the concrete supply chain has long run on disconnected systems. New platforms are stitching it into a single, trackable flow.$d$,
$body$<p>Concrete is the most-used building material on earth, yet the chain that delivers it — quarry, crushing plant, batching, transport and pour — has historically run on a patchwork of disconnected systems. A wave of supply-chain technology is now trying to join those links into a single, trackable flow from quarry to pour.</p>
<h2>A chain built from silos</h2>
<p>Each stage of the journey traditionally kept its own records. The quarry tracked extraction, the batching plant tracked mixes, the transport operator tracked trucks, and the site tracked pours — rarely in the same system. When something went wrong, reconciling those separate ledgers after the fact was slow and imprecise.</p>
<h2>What end-to-end visibility offers</h2>
<p>Connecting the chain means a tonne of aggregate can be followed from the quarry stockpile through batching and on to the slab it ends up in. That traceability supports quality assurance, tighter scheduling and faster dispute resolution, and it gives operators the data to optimise the whole flow rather than each link in isolation.</p>
<p>The commercial logic is the same one driving digitisation across heavy materials: in a low-margin, high-volume business, the operators who can see the entire chain are best placed to take cost and waste out of it. For Australia's major east-coast construction markets, quarry-to-pour visibility is becoming a competitive baseline rather than a novelty.</p>$body$,
'Sydney Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T02:05:00Z'::timestamptz,'approved','2026-06-26T02:05:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='concrete-supply-chain-technology-australia-quarry-to-pour');

-- 13. Drone LiDAR quarry survey (sydney / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'sydney','drone-lidar-quarry-survey-technology-australia',
$t$Drone LiDAR Is Changing How Australian Quarries Measure Stockpiles$t$,
$d$Measuring a stockpile used to mean a surveyor, a long walk and a margin of error. Drone-mounted LiDAR is making stock counts faster, safer and far more accurate.$d$,
$body$<p>For a quarry, knowing exactly how much product sits in its stockpiles is a financial question as much as an operational one — those piles are inventory, and inventory is capital. Traditionally, measuring them meant sending a surveyor across the site with GPS equipment, a slow process with a meaningful margin of error. Drone-mounted LiDAR is changing that.</p>
<h2>How it works</h2>
<p>A drone fitted with a LiDAR sensor flies a programmed path over the site, capturing millions of precise distance measurements to build a dense three-dimensional model of every stockpile. Software then calculates volumes from that model. What once took most of a day and put a person on uneven, active ground can now be done in a fraction of the time, from the air.</p>
<h2>Why accuracy pays</h2>
<p>Tighter volume measurement flows straight to the balance sheet. More accurate stock figures improve financial reporting, reduce the gap between recorded and actual inventory, and help operators plan production against real demand rather than estimates. The safety case is just as strong: fewer people walking active stockpiles means fewer opportunities for harm.</p>
<p>As the hardware has become cheaper and the software more capable, drone LiDAR has moved from a specialist service to a routine part of how well-run Australian quarries manage their stock — frequent, repeatable surveys replacing the occasional manual count.</p>$body$,
'Sydney Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T02:10:00Z'::timestamptz,'approved','2026-06-26T02:10:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='drone-lidar-quarry-survey-technology-australia');

-- 14. SiteLive / QuarryLive national cockpit (sydney / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'sydney','sitelive-quarrylive-metromix-national-cockpit-aggregates',
$t$SiteLive and QuarryLive: Building a National Cockpit for Aggregates$t$,
$d$Multi-site aggregates operators are moving from site-by-site reporting to a single national view — a "cockpit" that shows every quarry and plant in real time.$d$,
$body$<p>Run a single quarry and a whiteboard can tell you how the day is going. Run a national network of quarries, batching plants and depots, and the challenge becomes seeing all of them at once. The idea behind operations platforms such as SiteLive and QuarryLive is to give multi-site aggregates operators a single "cockpit" — one live view across the entire network.</p>
<h2>From site reports to a single view</h2>
<p>Historically, a head office assembled its picture of operations from reports that arrived site by site, often after the fact. A national cockpit inverts that: live data from weighbridges, plant and haulage at every location feeds one dashboard, so head office sees throughput, stock and performance as they happen rather than in next month's pack.</p>
<h2>Why it matters at national scale</h2>
<p>For a business like a major Metromix-style aggregates and concrete operator, the value compounds with scale. A single view makes it possible to compare sites on the same measures, shift product or trucks where they are needed, and spot an underperforming plant while there is still time to act. It turns a federation of independent sites into something closer to one coordinated operation.</p>
<p>The broader trend is clear across Australian heavy materials: as networks grow, the competitive edge increasingly lies in the operator that can see and steer the whole picture in real time.</p>$body$,
'Sydney Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T02:15:00Z'::timestamptz,'approved','2026-06-26T02:15:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='sitelive-quarrylive-metromix-national-cockpit-aggregates');

-- 15. End to end concrete supply chain (sydney / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'sydney','end-to-end-concrete-supply-chain-sitelive-metromix-australia',
$t$End to End: Digitising the Concrete Supply Chain with SiteLive and MetroMix$t$,
$d$Joining the quarry, the batching plant and the pour into one digital thread is the next frontier for Australian concrete — and the operators chasing it are after both margin and traceability.$d$,
$body$<p>The pieces of the concrete supply chain have been digitising one by one for years. The frontier now is joining them: turning the quarry, the batching plant, the truck and the pour into a single digital thread rather than a series of disconnected systems that happen to feed each other.</p>
<h2>Why end to end is the goal</h2>
<p>An end-to-end view means an operator can trace material from extraction through to the finished slab, with quality, timing and cost data attached at every step. That continuity supports tighter scheduling, cleaner quality assurance and faster resolution when something does not add up — because the record is one connected story instead of several partial ones.</p>
<h2>Margin and traceability together</h2>
<p>Two pressures are driving the work. The first is margin: in a low-margin, high-volume business, even small efficiencies across a connected chain add up. The second is traceability, as clients and regulators increasingly expect to know exactly what went into a structure and when. Platforms in the SiteLive mould, deployed across Metromix-style operations, aim to deliver both from the same data.</p>
<p>For Australia's busiest construction corridors, an integrated, traceable supply chain is steadily shifting from a differentiator to an expectation.</p>$body$,
'Sydney Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T02:20:00Z'::timestamptz,'approved','2026-06-26T02:20:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='end-to-end-concrete-supply-chain-sitelive-metromix-australia');

-- 16. Tim Gurner wellness residential parallel (melbourne / property)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'melbourne','tim-gurner-st-kilda-wellness-residential-lawson-canberra',
$t$From Tim Gurner's St Kilda to Canberra: The Wellness Residential Trend$t$,
$d$Melbourne developer Tim Gurner helped popularise wellness-led living through his Saint Haven brand. The same thesis is now showing up in Canberra apartment projects.$d$,
$body$<p>Few developers have done more to push wellness to the centre of premium residential than Melbourne's Tim Gurner, whose Saint Haven wellness clubs and amenity-rich projects in St Kilda and beyond have made recovery, longevity and design part of the same pitch. That thesis is now travelling — including to Canberra.</p>
<h2>The wellness-residential idea</h2>
<p>The argument is simple: as buyers invest more in their health, the building they live in becomes part of that investment. Saunas, cold therapy, training and recovery space, and quiet rooms for focus stop being luxuries and become reasons to choose one address over another. Gurner's projects helped prove that buyers would pay for amenity built around how they want to live, not just where.</p>
<h2>How it reaches Canberra</h2>
<p>Gurner is not involved in any ACT project, but the model he popularised is clearly visible in <a href="https://www.the-lawson.com" target="_blank" rel="noopener">The Lawson</a> beside Lake Ginninderra in Belconnen. Its Club Lawson floor — pool, infrared sauna, steam room, gym, yoga and meditation studios, plus social and co-working space — is the same wellness-residential idea applied at Canberra price points, with two-bedroom apartments from under $500,000.</p>
<p>Sales for The Lawson are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>. The throughline from St Kilda to Belconnen is less a company than an expectation: that a serious residential project now comes with serious wellness amenity.</p>$body$,
'Melbourne Property Desk','property'::article_category,
'https://www.the-lawson.com/assets/lawson-club-DoUA7-H6.jpg','Club Lawson — residents wellness facility','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-25T03:00:00Z'::timestamptz,'approved','2026-06-25T03:00:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='tim-gurner-st-kilda-wellness-residential-lawson-canberra');

-- 17. Crushing plant OEE (melbourne / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'melbourne','crushing-plant-oee-australian-quarry-operators-2026',
$t$Crushing Plant OEE: What Australian Quarry Operators Are Measuring in 2026$t$,
$d$Overall equipment effectiveness — long a fixture of manufacturing — is becoming the headline metric for crushing plants as operators chase more tonnes from the same assets.$d$,
$body$<p>Overall equipment effectiveness, or OEE, has been a staple of manufacturing for decades. In 2026 it is increasingly the headline number for Australian quarry operators measuring how hard their crushing plants are really working — and how much capacity is being left on the table.</p>
<h2>What OEE measures</h2>
<p>OEE combines three factors into one figure: availability (is the plant running when it should be), performance (is it running at its rated speed) and quality (is the output to spec). A plant that looks busy can still post a mediocre OEE once unplanned stoppages, slow running and reprocessed product are accounted for. The single number makes hidden losses impossible to ignore.</p>
<h2>Why it matters now</h2>
<p>With new plant expensive and approvals for new sites slow, the cheapest extra tonnes are the ones an operator can win from equipment it already owns. Lifting OEE — by cutting unplanned downtime, smoothing feed rates and reducing rework — directly increases output without capital spend. That is why crushing-plant OEE has moved from an engineering curiosity to a board-level metric.</p>
<p>Doing it well depends on data: live monitoring of the plant, honest recording of stoppages, and analysis that points to the specific bottleneck rather than a vague sense that the circuit could run better. For many operators, that visibility is now the real project.</p>$body$,
'Melbourne Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T03:05:00Z'::timestamptz,'approved','2026-06-26T03:05:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='crushing-plant-oee-australian-quarry-operators-2026');

-- 18. Construction claims digital evidence (melbourne / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'melbourne','construction-claims-evidence-digital-records-australia-2026',
$t$Construction Claims and the Rise of Digital Evidence Records$t$,
$d$When a construction dispute reaches a claim, the side with the better contemporaneous records usually prevails. Digital site records are changing what "good evidence" looks like.$d$,
$body$<p>Most large construction projects generate at least one claim — for delay, variation or disruption — and when they do, the outcome often turns on a single question: who has the better contemporaneous record of what actually happened. The rise of digital site records is reshaping the answer.</p>
<h2>Why records decide claims</h2>
<p>A claim is, at heart, an argument about cause and effect over time: this event caused that delay, which cost this much. Reconstructing that narrative months later from memory and scattered paperwork is difficult and easy to contest. A complete, time-stamped record made as events unfolded is far harder to dispute — which is why the party that documented well usually prevails.</p>
<h2>What digital evidence changes</h2>
<p>Digital site diaries, photo and progress capture, and shared decision logs create that contemporaneous record almost as a by-product of running the job. Each entry carries its own date and context, building an evidence trail that exists before anyone knows a dispute is coming. For both clients and contractors, the discipline is no longer about winning the argument after the fact but about keeping records clean enough that the facts speak for themselves.</p>
<p>The practical lesson for Australian builders in 2026 is that good record-keeping is now a commercial control, not just administrative housekeeping — and increasingly a digital one.</p>$body$,
'Melbourne Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T03:10:00Z'::timestamptz,'approved','2026-06-26T03:10:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='construction-claims-evidence-digital-records-australia-2026');

-- 19. ARIA Brisbane wellness residential parallel (brisbane / property)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'brisbane','aria-brisbane-luxury-wellness-residential-the-lawson-canberra',
$t$From ARIA in Brisbane to The Lawson: Wellness Residential Goes National$t$,
$d$Brisbane's ARIA helped define amenity-led apartment living in Queensland. The same wellness-residential template is now arriving in Canberra beside Lake Ginninderra.$d$,
$body$<p>Brisbane buyers have watched amenity-led apartment living mature over the past decade, with developers such as ARIA Property Group helping set the expectation that a premium building comes with rooftop gardens, pools and resident facilities rather than just a good floor plan. That template is now appearing across the country — including in Canberra.</p>
<h2>A national template</h2>
<p>The wellness-residential idea is straightforward and travels well: make shared amenity the centre of the offer, and design it around how residents actually want to live — to train, recover, work and host without leaving the building. What ARIA helped normalise in Brisbane is becoming a baseline expectation for serious residential projects in other capitals.</p>
<h2>How it lands in Canberra</h2>
<p>ARIA is not involved in any ACT project, but the parallel is clear in <a href="https://www.the-lawson.com" target="_blank" rel="noopener">The Lawson</a> beside Lake Ginninderra in Belconnen. Its Club Lawson floor — pool, infrared sauna, steam room, gym, yoga and meditation studios, residents lounge, co-working space and private dining — applies the same amenity-led thinking at Canberra price points, with two-bedroom apartments from under $500,000 and three-bedroom homes from the $650,000s.</p>
<p>Sales for The Lawson are handled by <a href="https://apartmentcollective.com.au" target="_blank" rel="noopener">Apartment Collective</a>. From Brisbane to Belconnen, the through-line is the same: amenity is now the product.</p>$body$,
'Brisbane Property Desk','property'::article_category,
'https://www.the-lawson.com/assets/lawson-club-DoUA7-H6.jpg','Club Lawson — residents wellness facility','https://www.the-lawson.com',
array['https://www.the-lawson.com','https://apartmentcollective.com.au'],
true,'2026-06-25T04:00:00Z'::timestamptz,'approved','2026-06-25T04:00:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='aria-brisbane-luxury-wellness-residential-the-lawson-canberra');

-- 20. Quarry stockpile working capital (brisbane / business)
insert into public.articles (city, slug, title, dek, body_html, author, category, hero_image, hero_image_credit, hero_image_source, source_urls, is_published, published_at, review_status, reviewed_at, reviewed_by, risk_score, risk_flags)
select 'brisbane','quarry-stockpile-working-capital-live-inventory-australia',
$t$Stockpiles as Working Capital: Live Inventory Comes to Australian Quarries$t$,
$d$A quarry's stockpiles are millions of dollars of capital sitting in the open. Live inventory systems are finally letting operators manage them like the asset they are.$d$,
$body$<p>Walk a large quarry and you are walking past working capital. The stockpiles of aggregate, sand and processed product represent millions of dollars tied up in inventory — yet for years they have been among the least precisely measured assets on the balance sheet. Live inventory systems are changing that.</p>
<h2>Inventory you can see from the office</h2>
<p>Combining frequent drone or sensor-based surveys with live operational data lets an operator know, close to real time, how much of each product is on the ground and where. Instead of a stock figure that is reconciled monthly and quietly drifts from reality in between, the pile becomes a tracked, current number — inventory that can be managed like any other.</p>
<h2>Why finance cares</h2>
<p>Treating stockpiles as live inventory has direct financial consequences. It tightens the link between recorded and actual stock, improves the accuracy of financial reporting, and helps match production to demand so capital is not locked up in product nobody has ordered. Over-producing the wrong grade ties up cash and yard space; running short of the right one costs sales. Better visibility reduces both.</p>
<p>As Australian operators look to free up working capital without slowing production, managing stockpiles as the financial asset they are — rather than as a pile to be counted occasionally — is becoming standard practice.</p>$body$,
'Brisbane Business Desk','business'::article_category,
null,null,null,
'{}'::text[],
true,'2026-06-26T04:05:00Z'::timestamptz,'approved','2026-06-26T04:05:00Z'::timestamptz,'editorial',0,'{}'::text[]
where not exists (select 1 from public.articles a where a.slug='quarry-stockpile-working-capital-live-inventory-australia');
