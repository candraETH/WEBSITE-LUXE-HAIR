$imgs = Get-ChildItem -Path './public/images' -Filter '#*' -File
foreach ($f in $imgs) {
  $dest = Join-Path $f.DirectoryName ($f.Name.TrimStart('#'))
  Copy-Item -Path $f.FullName -Destination $dest -Force
  Write-Output "Copied: $($f.Name) -> $([System.IO.Path]::GetFileName($dest))"
}
