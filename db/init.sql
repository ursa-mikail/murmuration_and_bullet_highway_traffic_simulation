CREATE TABLE layouts(id serial PRIMARY KEY, slug text UNIQUE, name text, blurb text, kind text, params jsonb);
CREATE TABLE runs(id serial PRIMARY KEY, layout text, score int, avg_speed real, created_at timestamptz DEFAULT now());
INSERT INTO layouts(slug,name,blurb,kind,params) VALUES
('halo','The Halo','Ring road, 6 interchanges','loop','{"k":6,"R":330}'),
('orbital','Orbital','Huge ring, 3 interchanges','loop','{"k":3,"R":520}'),
('cogwheel','Cogwheel','Tight ring, 12 interchanges','loop','{"k":12,"R":380}'),
('spine','The Spine','Twin carriageway, 5 interchanges','spine','{"k":5,"L":1800}'),
('express','Express','Twin carriageway, 2 interchanges','spine','{"k":2,"L":2200}');
