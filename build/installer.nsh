; Refuse to install on Windows versions this build cannot run on.
;
; This package bundles Electron 33, which requires Windows 10 or later --
; Electron dropped Windows 7/8/8.1 support in Electron 23, and Electron 22
; (the last version that supported them) went end-of-life in 2023.
;
; Without this check the installer fails late and cryptically on Windows 7,
; typically while creating the Start Menu shortcut:
;   "...\Start Menu\Programs\FINTronClient.lnk  Unspecified error"
; Windows 7 users should install the separate win7 build instead, which is
; pinned to Electron 22.
;
; Inserted into Function .onInit (installer only -- the uninstaller uses
; un.onInit, so this never blocks uninstalling).

!include "WinVer.nsh"
!include "LogicLib.nsh"

!macro preInit
  ${IfNot} ${AtLeastWin10}
    ; A silent install (/S) must never block on a dialog -- NSIS still shows
    ; MessageBox under /S, which would hang scripted deployments. Report the
    ; failure through the exit code instead.
    ${IfNot} ${Silent}
      MessageBox MB_OK|MB_ICONSTOP \
        "FINTronClient requires Windows 10 or later.$\r$\n$\r$\nThis build is based on Electron 33, which does not run on Windows 7 or 8.1.$\r$\n$\r$\nPlease install the separate Windows 7 package instead:$\r$\n    FINTronClient-Setup-<version>-win7.exe"
    ${EndIf}
    SetErrorLevel 1
    Abort
  ${EndIf}
!macroend
