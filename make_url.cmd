Rem regexp replace ""\s{2,}" with " " in fillform.js and output to fillform.url file

powershell -Command "$content = [System.IO.File]::ReadAllText('fillform.js') -replace '\s{2,}',' '; Set-Content -Path fillform.url -Value '[InternetShortcut]', ('URL=javascript:' + $content)"