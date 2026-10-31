param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-zA-Z0-9.-]+$')]
  [string]$Hostname
)

# Encaminha o banco do Grupo 1 para uma porta local. Deixe este terminal aberto.
cloudflared access tcp --hostname $Hostname --url 127.0.0.1:15437
