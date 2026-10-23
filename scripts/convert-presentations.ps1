param([string]$Repository = (Split-Path $PSScriptRoot -Parent))
$ErrorActionPreference='Stop'
$report=Get-Content -LiteralPath (Join-Path $Repository '.course-work/import-report.json') -Raw | ConvertFrom-Json
$powerpoint=New-Object -ComObject PowerPoint.Application
try {
  foreach($course in $report) {
    foreach($deck in $course.presentations) {
      if(Test-Path -LiteralPath $deck.target) { continue }
      $presentation=$null
      try {
        # Read-only, no document window, no macros or source edits.
        $powerpoint.AutomationSecurity=3
        $presentation=$powerpoint.Presentations.Open($deck.source,-1,0,0)
        $presentation.SaveAs($deck.target,32)
        Write-Output ("Exported " + [IO.Path]::GetFileName($deck.target) + " / " + $course.course)
      } finally { if($presentation) { $presentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) } }
    }
  }
} finally { $powerpoint.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint) }
