FROM mcr.microsoft.com/windows/servercore:2009

RUN powershell -c Set-ExecutionPolicy Bypass -Scope Process -Force; $env:chocolateyUseWindowsCompression='true'; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

RUN cmd /c choco install -y nodejs --version=14.5.0
RUN cmd /c choco install -y docker-cli
RUN cmd /c choco install -y protoc
RUN cmd /c choco install -y git
RUN cmd /c choco install -y awscli

CMD [ "cmd" ]