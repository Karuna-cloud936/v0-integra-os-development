; Integra Server Installer Script for Inno Setup

#define MyAppName "Integra Server"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Integra Systems"
#define MyAppExeName "integra-server.exe"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\IntegraServer
DefaultGroupName={#MyAppName}
OutputDir=output
OutputBaseFilename=integra-server-setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\server\integra-server.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\server\README.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"
Name: "startupicon"; Description: "Run server on Windows startup"; GroupDescription: "Startup options:"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Integra Server"; Flags: nowait postinstall skipifsilent

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "IntegraServer"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: startupicon

[Code]
var
  ServerPortPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  ServerPortPage := CreateInputQueryPage(wpSelectDir,
    'Server Configuration', 'Configure server settings',
    'Please specify the port number for the Integra Server (default: 3001)');
  ServerPortPage.Add('Port:', False);
  ServerPortPage.Values[0] := '3001';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = ServerPortPage.ID then
  begin
    if (StrToIntDef(ServerPortPage.Values[0], 0) < 1024) or 
       (StrToIntDef(ServerPortPage.Values[0], 0) > 65535) then
    begin
      MsgBox('Please enter a valid port number between 1024 and 65535.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;
