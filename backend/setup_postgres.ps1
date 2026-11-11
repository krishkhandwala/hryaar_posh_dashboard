$ErrorActionPreference = "Stop"

$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $psql)) {
    Write-Error "psql.exe not found at $psql. Install PostgreSQL 18 or adjust the path."
}

$pgPassSecure = Read-Host -AsSecureString "Enter your PostgreSQL 'postgres' superuser password"
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassSecure)
$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$appUser = "hryaar_user"
$appDb = "hryaar_posh"
$appPassBytes = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($appPassBytes)
$appPass = [Convert]::ToBase64String($appPassBytes) -replace '[^a-zA-Z0-9]', 'A'

$secretBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($secretBytes)
$jwtSecret = ($secretBytes | ForEach-Object { $_.ToString("x2") }) -join ""

Write-Host "Creating role '$appUser' and database '$appDb'..."
& $psql -U postgres -v ON_ERROR_STOP=1 -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$appUser') THEN CREATE ROLE $appUser WITH LOGIN PASSWORD '$appPass'; ELSE ALTER ROLE $appUser WITH PASSWORD '$appPass'; END IF; END `$`$;"

$dbExists = & $psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$appDb';"
if ($dbExists -ne "1") {
    & $psql -U postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $appDb OWNER $appUser;"
}

$env:PGPASSWORD = $null

$envFile = Join-Path $PSScriptRoot ".env"
@"
ENVIRONMENT=production
SEED_DEMO_DATA=false
SECRET_KEY=$jwtSecret
DATABASE_URL=postgresql+psycopg://$appUser`:$appPass@localhost:5432/$appDb
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:3001","http://127.0.0.1:3001","https://app.hryaar.com"]
"@ | Set-Content -Path $envFile -Encoding UTF8

Write-Host "Wrote $envFile. Initializing PostgreSQL schema and seed data..."
Push-Location $PSScriptRoot
try {
    & ".\venv\Scripts\python.exe" -m app.db.seed
    Write-Host "PostgreSQL setup complete!"
} finally {
    Pop-Location
}

