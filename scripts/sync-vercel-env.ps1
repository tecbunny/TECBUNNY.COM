# Sync local .env variables to Vercel project
# Usage: .\sync-vercel-env.ps1 -EnvFile ".env"
param(
    [string]$EnvFile = ".env",
    [ValidateSet("production","preview","development")]
    [string]$Environment = "production"
)

if (-not (Test-Path $EnvFile)) {
    Write-Error "Env file '$EnvFile' not found."
    exit 1
}

# Ensure Vercel CLI is installed and user is logged in
try {
    & vercel --version > $null
} catch {
    Write-Error "Vercel CLI not found. Install with 'npm i -g vercel' and log in."
    exit 1
}

# Read and sync each key=value pair
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    # Skip empty lines or comments
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    # Split on first '='
    $parts = $line -split '=', 2
    if ($parts.Length -lt 2) { return }
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    Write-Host "Setting Vercel env var '$key' in '$Environment'..."
    # Use --force to overwrite existing value, pipe value from stdin
    $value | & vercel env add $key $Environment --force
}

Write-Host "Environment variables synced to Vercel ($Environment) successfully."