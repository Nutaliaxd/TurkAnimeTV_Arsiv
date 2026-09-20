# Repodaki değişiklikleri (silinen/değişen/eklenen her şey) tek komutla GitHub'a gönderir.
# Kullanım (repo kök klasöründe):
#   .\guncelle.ps1
#   .\guncelle.ps1 -Message "olu linkler temizlendi"
#   .\guncelle.ps1 -Force        # çok sayıda dosya silinecekse güvenlik durdurmasını geç
param(
    [string]$Repo = $PSScriptRoot,
    [string]$Message = "",
    [int]$MaxSilinen = 500,      # bundan fazla dosya silinecekse durur (yanlış script'e karşı emniyet)
    [switch]$Force
)

Set-Location $Repo
$branch = (git branch --show-current).Trim()
if (-not $branch) { $branch = "main" }

git add -A
$degisen = @(git diff --cached --name-status)
if ($degisen.Count -eq 0) {
    Write-Host "Değişiklik yok, yapılacak bir şey yok." -ForegroundColor Green
    exit 0
}

$silinen = @($degisen | Where-Object { $_ -match '^D' }).Count
Write-Host "`nDeğişiklik özeti:" -ForegroundColor Cyan
git diff --cached --shortstat

if ($silinen -gt $MaxSilinen -and -not $Force) {
    git reset -q    # sadece stage'i geri alır, dosyalara dokunmaz
    Write-Host "`nDURDUM: $silinen dosya silinmiş görünüyor (sınır: $MaxSilinen)." -ForegroundColor Red
    Write-Host "Bilerek yaptıysan -Force ile tekrar çalıştır. Değilse 'git status' ile bak." -ForegroundColor Yellow
    exit 1
}

if (-not $Message) { $Message = "veri guncellemesi " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
git commit -q -m $Message

git pull --rebase -q origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "pull --rebase çakışma verdi. 'git status' ile bak, çözüp 'git rebase --continue' yap." -ForegroundColor Red
    exit 1
}

for ($i = 1; $i -le 5; $i++) {
    git push -u origin $branch
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nGitHub'a gönderildi. Pages 1-2 dakikada güncellenir." -ForegroundColor Green
        exit 0
    }
    Write-Host "Push başarısız ($i/5), 15 sn sonra tekrar..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}
Write-Host "Push 5 denemede başarısız. İnterneti kontrol edip scripti tekrar çalıştır." -ForegroundColor Red
exit 1
