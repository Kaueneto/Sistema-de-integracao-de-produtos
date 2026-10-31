-- Execute no banco postgres, uma única vez, como administrador.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grupo3_app') THEN
    CREATE ROLE grupo3_app NOLOGIN;
  END IF;
END $$;
-- No pgAdmin, abra Login/Group Roles > grupo3_app > Properties,
-- ative Can login e defina uma senha. Não guarde a senha neste arquivo.
