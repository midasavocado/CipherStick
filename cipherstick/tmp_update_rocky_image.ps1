$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$phrase = 'The 4 names that the PHM book is dedicated to .pages.dev (only names)'
$width = $phrase.Length * 8
$paths = @(
  'ProjectFindRocky\image.png',
  'ProjectFindRocky\help\image.png'
)

function Get-Crc32([byte[]]$Bytes) {
  $crc = [uint32]::MaxValue
  foreach ($b in $Bytes) {
    $crc = $crc -bxor [uint32]$b
    for ($i = 0; $i -lt 8; $i++) {
      if (($crc -band 1) -ne 0) {
        $crc = (($crc -shr 1) -bxor 0xedb88320)
      } else {
        $crc = ($crc -shr 1)
      }
    }
  }
  return ($crc -bxor 0xffffffff)
}

function New-BigEndianBytes([uint32]$Value) {
  return [byte[]]@(
    (($Value -shr 24) -band 0xff),
    (($Value -shr 16) -band 0xff),
    (($Value -shr 8) -band 0xff),
    ($Value -band 0xff)
  )
}

function New-PngChunk([string]$Type, [byte[]]$Data) {
  $typeBytes = [System.Text.Encoding]::ASCII.GetBytes($Type)
  $lenBytes = New-BigEndianBytes ([uint32]$Data.Length)
  $crcInput = New-Object byte[] ($typeBytes.Length + $Data.Length)
  [Array]::Copy($typeBytes, 0, $crcInput, 0, $typeBytes.Length)
  [Array]::Copy($Data, 0, $crcInput, $typeBytes.Length, $Data.Length)
  $crcBytes = New-BigEndianBytes (Get-Crc32 $crcInput)

  $chunk = New-Object byte[] (12 + $Data.Length)
  [Array]::Copy($lenBytes, 0, $chunk, 0, 4)
  [Array]::Copy($typeBytes, 0, $chunk, 4, 4)
  [Array]::Copy($Data, 0, $chunk, 8, $Data.Length)
  [Array]::Copy($crcBytes, 0, $chunk, 8 + $Data.Length, 4)
  return $chunk
}

function Set-PngMetadata([string]$Path, [string]$TextValue) {
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $ms = New-Object System.IO.MemoryStream
  $ms.Write($bytes, 0, 8)

  $commentData = [System.Text.Encoding]::UTF8.GetBytes("Comment$([char]0)$TextValue")
  $xmp = @"
<?xpacket begin='`u{FEFF}' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x='adobe:ns:meta/'><rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'><rdf:Description rdf:about='uuid:faf5bdd5-ba3d-11da-ad31-d33d75182f1b' xmlns:exif='http://ns.adobe.com/exif/1.0/'><exif:UserComment><rdf:Alt xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'><rdf:li xml:lang='x-default'>$TextValue</rdf:li></rdf:Alt></exif:UserComment></rdf:Description><rdf:Description xmlns:dc='http://purl.org/dc/elements/1.1/'><dc:creator><rdf:Seq xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'><rdf:li>$TextValue</rdf:li></rdf:Seq></dc:creator></rdf:Description><rdf:Description xmlns:dc='http://purl.org/dc/elements/1.1/'><dc:rights><rdf:Alt xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'><rdf:li xml:lang='x-default'>$TextValue</rdf:li></rdf:Alt></dc:rights><dc:title><rdf:Alt xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'><rdf:li xml:lang='x-default'>$TextValue</rdf:li></rdf:Alt></dc:title></rdf:Description></rdf:RDF></x:xmpmeta>
<?xpacket end='w'?>
"@
  $itxtPrefix = [byte[]](88, 77, 76, 58, 99, 111, 109, 46, 97, 100, 111, 98, 101, 46, 120, 109, 112, 0, 0, 0, 0, 0)
  $xmpBytes = [System.Text.Encoding]::UTF8.GetBytes($xmp)
  $itxtData = New-Object byte[] ($itxtPrefix.Length + $xmpBytes.Length)
  [Array]::Copy($itxtPrefix, 0, $itxtData, 0, $itxtPrefix.Length)
  [Array]::Copy($xmpBytes, 0, $itxtData, $itxtPrefix.Length, $xmpBytes.Length)

  $pos = 8
  $inserted = $false
  while ($pos -lt $bytes.Length) {
    $len = [int](($bytes[$pos] -shl 24) -bor ($bytes[$pos + 1] -shl 16) -bor ($bytes[$pos + 2] -shl 8) -bor $bytes[$pos + 3])
    $type = [System.Text.Encoding]::ASCII.GetString($bytes, $pos + 4, 4)
    $chunkLen = 12 + $len

    if ($type -notin @('tEXt', 'iTXt', 'zTXt')) {
      $ms.Write($bytes, $pos, $chunkLen)

      if (-not $inserted -and ($type -eq 'IHDR' -or $type -eq 'pHYs')) {
        $commentChunk = New-PngChunk 'tEXt' $commentData
        $itxtChunk = New-PngChunk 'iTXt' $itxtData
        $ms.Write($commentChunk, 0, $commentChunk.Length)
        $ms.Write($itxtChunk, 0, $itxtChunk.Length)
        $inserted = $true
      }
    }

    $pos += $chunkLen
  }

  if (-not $inserted) {
    throw "Could not find metadata insertion point in $Path"
  }

  [System.IO.File]::WriteAllBytes($Path, $ms.ToArray())
  $ms.Dispose()
}

$bitmap = New-Object System.Drawing.Bitmap($width, 1)
$bitString = ($phrase.ToCharArray() | ForEach-Object {
  [Convert]::ToString([byte][char]$_, 2).PadLeft(8, '0')
}) -join ''

for ($x = 0; $x -lt $bitString.Length; $x++) {
  if ($bitString[$x] -eq '1') {
    $bitmap.SetPixel($x, 0, [System.Drawing.Color]::Black)
  } else {
    $bitmap.SetPixel($x, 0, [System.Drawing.Color]::White)
  }
}

foreach ($path in $paths) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  Set-PngMetadata $path $phrase
}
$bitmap.Dispose()

$zipPath = Join-Path (Get-Location) 'ProjectFindRocky\help.zip'
$tempDir = Join-Path $env:TEMP ('rocky-help-' + [guid]::NewGuid().ToString())
[System.IO.Directory]::CreateDirectory($tempDir) | Out-Null
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $tempDir)
Copy-Item -Force 'ProjectFindRocky\help\image.png' (Join-Path $tempDir 'image.png')
Remove-Item $zipPath -Force
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath)
Remove-Item $tempDir -Recurse -Force

Write-Output "rebuilt image.png width=$width bits=$($bitString.Length)"
Write-Output 'updated help.zip'
