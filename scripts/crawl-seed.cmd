@echo off
REM 로컬 발견(신규 등록) 주기 실행 — Windows 작업 스케줄러가 부른다.
REM 왜 있나: 신규 등록은 일회성 폭증이라 Actions 무료 분(월 2,000)으로 때우면
REM 매일 되풀이되는 할인 추적이 한도에 밀린다. 사유는 LOCAL_SEED_SOURCES 주석.
REM 지우려면: schtasks /Delete /TN "gamearound-crawl-seed" /F
setlocal
cd /d "%~dp0.."
set "LOG=%TEMP%\gamearound-crawl-seed.log"
echo. >> "%LOG%"
echo ==== %DATE% %TIME% 시작 ==== >> "%LOG%"
call pnpm crawl:seed >> "%LOG%" 2>&1
echo ==== %DATE% %TIME% 끝 (종료코드 %ERRORLEVEL%) ==== >> "%LOG%"
endlocal
