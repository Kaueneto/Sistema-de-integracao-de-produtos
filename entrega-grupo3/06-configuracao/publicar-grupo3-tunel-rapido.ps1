# Demonstração temporária. O PostgreSQL deve estar ativo na porta 5432.
# O hostname gerado muda a cada execução. O modo rápido TCP pode falhar.
# Compartilhe apenas o hostname e as credenciais do usuário de leitura.
cloudflared tunnel --url tcp://127.0.0.1:5432
