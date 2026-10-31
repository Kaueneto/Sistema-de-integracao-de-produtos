-- Execute no banco grupo3_db como administrador. Defina a senha em canal privado.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'usuario_integracao_g5') THEN
    CREATE ROLE usuario_integracao_g5 NOLOGIN;
  END IF;
END $$;
GRANT CONNECT ON DATABASE grupo3_db TO usuario_integracao_g5;
GRANT USAGE ON SCHEMA public TO usuario_integracao_g5;
GRANT SELECT ON public.vw_integracao_produtos TO usuario_integracao_g5;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'integracao') THEN
    REVOKE USAGE ON SCHEMA integracao FROM usuario_integracao_g5;
  END IF;
END $$;
REVOKE ALL ON produtos FROM usuario_integracao_g5;
-- No pgAdmin, ative LOGIN e atribua uma senha forte ao usuário. Nunca salve a senha neste arquivo.
