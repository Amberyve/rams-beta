-- Optional sample data so the dashboard isn't empty on first run.
-- Run AFTER schema.sql. Safe to skip, or delete these rows later from the app.

begin;

insert into public.researchers (full_name, email, campus, college, cluster, research_center, researcher_type, expertise, education, specializations) values
 ('Maria L. Santos',   'mlsantos@isatu.edu.ph',  'Main (La Paz)', 'College of Computing and Informatics', 'ICT',          'Center for AI Research', 'Faculty', 'Machine learning for healthcare',  '{"PhD in Computer Science","MS Information Technology"}', '{"Machine Learning","Health Informatics"}'),
 ('Jose R. Villanueva','jrvillanueva@isatu.edu.ph','Main (La Paz)', 'College of Engineering and Architecture','Engineering', 'Renewable Energy Lab',   'Faculty', 'Solar microgrids',                  '{"PhD in Electrical Engineering"}',                      '{"Renewable Energy","Power Systems"}'),
 ('Ana P. Dela Cruz',  'apdelacruz@isatu.edu.ph', 'Miagao',        'College of Arts and Sciences',          'Natural Sciences','Food Innovation Center','Faculty', 'Food chemistry and product development','{"MS Chemistry"}',                               '{"Food Science","Product Development"}');

insert into public.campuses (name)
select distinct btrim(campus) from public.researchers where nullif(btrim(campus), '') is not null
on conflict (name) do nothing;
insert into public.colleges (name)
select distinct btrim(college) from public.researchers where nullif(btrim(college), '') is not null
on conflict (name) do nothing;
insert into public.research_centers (name)
select distinct btrim(research_center) from public.researchers where nullif(btrim(research_center), '') is not null
on conflict (name) do nothing;

insert into public.research_projects (researcher_id, title, applicability, status, publication_date)
select r.id, v.title, v.applicability, v.status::public.research_status, v.pub::date
from (values
  ('Maria L. Santos',    'Stress Detection from Wearable Signals Using Deep Learning', 'Healthcare monitoring devices',          'ongoing',   '2026-03-15'),
  ('Jose R. Villanueva', 'Rice-Husk Biomass Gasifier for Rural Electrification',       'Off-grid power for farming communities', 'completed', '2025-11-02'),
  ('Ana P. Dela Cruz',   'Shelf-life Extension of Guimaras Mango Puree',               'Food processing MSMEs',                  'completed', '2025-06-20')
) as v(researcher, title, applicability, status, pub)
join public.researchers r on r.full_name = v.researcher;

insert into public.patents (title, inventors, filing_date, application_no, category, commercialization) values
 ('Portable Biomass Gasifier with Tar Filter', 'J. R. Villanueva; K. M. Tan', '2025-08-11', '1-2025-000412', 'Utility Model', 'Licensing in negotiation'),
 ('Automated Seaweed Drying Rack',              'A. P. Dela Cruz',             '2024-12-03', '2-2024-001198', 'Industrial Design', 'Not yet commercialized');

insert into public.trademarks (mark_name, reg_number, reg_date, owner) values
 ('ISAT U Research Hub', '4-2025-0000871', '2025-09-30', 'Iloilo Science and Technology University');

insert into public.copyrights (title, authors, publisher, pub_year) values
 ('RAMS: Research Asset Management System (Software)', 'ISAT U CCI', 'ISAT U Press', 2024);

insert into public.graduate_students (full_name, thesis_title, applicability, program, college, grad_year, email) values
 ('Carlo M. Reyes', 'Fake News Detection for Hiligaynon Social Media Posts', 'Media literacy tools for LGUs', 'MS Computer Science', 'College of Computing and Informatics', 2026, 'cmreyes@isatu.edu.ph');

insert into public.laboratories (name, description, location) values
 ('AI & Data Science Laboratory', 'GPU workstations for machine-learning research', 'CCI Building, 3F'),
 ('Food Innovation Laboratory',   'Pilot-scale food processing and testing',       'Miagao Campus');

insert into public.services (name, description, price, unit) values
 ('Large-format printing', 'Poster printing for research conferences', 350, 'per sheet'),
 ('Proximate analysis',    'Moisture, ash, fat, protein, fiber',       1500, 'per sample');

insert into public.equipment (name, description, price, laboratory_id, condition)
select 'GPU Workstation (RTX 4090)', 'Deep-learning training workstation', 285000, id, 'Good' from public.laboratories where name = 'AI & Data Science Laboratory';

commit;
