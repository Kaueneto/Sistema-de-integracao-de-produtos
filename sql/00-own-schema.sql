-- Execute no banco grupo3_db como administrador, uma única vez.
ALTER SCHEMA public OWNER TO grupo3_app;
GRANT USAGE, CREATE ON SCHEMA public TO grupo3_app;
