# TurkAnime arşivini GitHub'a gruplar halinde yükler ve sonunda doğrular.
# Çalıştırma:  powershell -ExecutionPolicy Bypass -File .\yukle.ps1
# Yarıda kesilirse aynı komutu tekrar çalıştır, kaldığı yerden devam eder.

param(
    [string]$Repo = "C:\dev\TurkAnimeTV_Arsiv",
    [string]$Folder = "animeler",
    [int]$ChunkSize = 300     # her commit'teki anime klasörü sayısı (~4-5 bin dosya)
)

Set-Location $Repo
git config core.longpaths true
git config http.postBuffer 524288000

$branch = (git branch --show-current).Trim()
if (-not $branch) { $branch = "main" }
Write-Host "Repo: $Repo | Branch: $branch" -ForegroundColor Cyan

function Push-WithRetry {
    for ($i = 1; $i -le 5; $i++) {
        git push -u origin $branch
        if ($LASTEXITCODE -eq 0) { return $true }
        Write-Host "Push başarısız ($i/5), 15 sn sonra tekrar deneniyor..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15
    }
    return $false
}

function Add-CommitPush([string[]]$Paths, [string]$Message) {
    # Yolları dosyaya yazıp git'e verir (komut satırı uzunluk sınırına takılmaz, BOM'suz UTF-8)
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllLines($tmp, $Paths)
    git --literal-pathspecs add --pathspec-from-file="$tmp"
    Remove-Item $tmp -Force

    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  (yeni değişiklik yok, atlandı)" -ForegroundColor DarkGray
        return
    }
    git commit -q -m $Message
    if (-not (Push-WithRetry)) {
        Write-Host "HATA: Push 5 denemede de başarısız. İnternetini kontrol edip scripti tekrar çalıştır." -ForegroundColor Red
        exit 1
    }
}

# 1) Kök dizindeki dosyalar (animeler hariç)
$root = Get-ChildItem -Force | Where-Object { $_.Name -notin @('.git', $Folder) } | ForEach-Object { $_.Name }
if ($root) {
    Write-Host "Kök dosyalar ekleniyor..." -ForegroundColor Cyan
    Add-CommitPush $root "temel dosyalar"
}

# 2) animeler klasörü: gruplar halinde
$items = @(Get-ChildItem $Folder -Force | Sort-Object Name | ForEach-Object { "$Folder/$($_.Name)" })
$total = $items.Count
$chunks = [Math]::Ceiling($total / $ChunkSize)
Write-Host "$total öğe, $chunks grup halinde yüklenecek." -ForegroundColor Cyan

for ($i = 0; $i -lt $total; $i += $ChunkSize) {
    $end = [Math]::Min($i + $ChunkSize, $total) - 1
    $n = [Math]::Floor($i / $ChunkSize) + 1
    Write-Host "[$n/$chunks] $($items[$i]) ... $($items[$end])" -ForegroundColor Green
    Add-CommitPush $items[$i..$end] "animeler: grup $n/$chunks"
}

# 3) Açıkta kalan bir şey varsa süpür
Write-Host "Kalanlar kontrol ediliyor..." -ForegroundColor Cyan
Add-CommitPush @('.') "kalan dosyalar"

# 4) DOĞRULAMA
Write-Host "`n=== DOĞRULAMA ===" -ForegroundColor Cyan
git fetch -q

$untracked = @(git ls-files --others --exclude-standard).Count
$dirty     = @(git status --porcelain).Count
$ahead     = [int](git rev-list --count "origin/$branch..HEAD")
$behind    = [int](git rev-list --count "HEAD..origin/$branch")
$local     = @(git ls-files).Count
$remote    = @(git ls-tree -r "origin/$branch" --name-only).Count
$ignored   = @(git ls-files --others --ignored --exclude-standard).Count

function Show($ok, $text) {
    if ($ok) { Write-Host "[OK]   $text" -ForegroundColor Green }
    else     { Write-Host "[FAIL] $text" -ForegroundColor Red }
}
Show ($untracked -eq 0)    "Eklenmemiş dosya: $untracked"
Show ($dirty -eq 0)        "Commit'lenmemiş değişiklik: $dirty"
Show ($ahead -eq 0)        "Push'lanmamış commit: $ahead"
Show ($local -eq $remote)  "Yerel takip edilen: $local | GitHub'daki: $remote"
Write-Host "[BİLGİ] .gitignore ile bilerek atlanan dosya: $ignored" -ForegroundColor DarkGray

if ($untracked -eq 0 -and $dirty -eq 0 -and $ahead -eq 0 -and $local -eq $remote) {
    Write-Host "`nHer şey GitHub'a yüklendi." -ForegroundColor Green
} else {
    Write-Host "`nBir kontrol başarısız. Scripti tekrar çalıştırmak genelde çözer." -ForegroundColor Yellow
}
