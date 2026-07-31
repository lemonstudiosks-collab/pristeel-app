# PRISTEEL Gmail Panel

Ky Google Workspace Add-on shfaq një panel të dukshëm në anën e djathtë të Gmail-it.
Kur hapet një email, paneli tregon subjektin, dërguesin dhe numrin e attachment-eve, pastaj hap workflow-n e PRISTEEL për:

- krijimin e një projekti të ri;
- lidhjen e thread-it me një projekt ekzistues;
- importimin e skedarëve të klientit në dosjen Google Drive të projektit.

## Instalimi për testim

1. Hape `https://script.google.com` me llogarinë që përdor Gmail-in e PRISTEEL.
2. Krijo një projekt të ri Apps Script me emrin `PRISTEEL Gmail Panel`.
3. Në `Code.gs`, zëvendëso kodin me përmbajtjen e skedarit `Code.gs` nga kjo dosje.
4. Te `Project Settings`, aktivizo `Show appsscript.json manifest file in editor`.
5. Hape `appsscript.json` dhe zëvendësoje me përmbajtjen e skedarit të kësaj dosjeje.
6. Ruaj projektin.
7. Shko te `Deploy` → `Test deployments` → `Install`.
8. Jep lejet e kërkuara dhe rifresko Gmail-in.
9. Në anën e djathtë të Gmail-it do të shfaqet ikona PRISTEEL. Klikoje një herë dhe mbaje panelin hapur.

Paneli nuk ruan skedarët vetë. Ai i dërgon ID-të e sigurta të emailit dhe thread-it te platforma. Platforma kërkon autorizimin Gmail dhe Drive, krijon ose lidh projektin dhe ruan skedarët në Google Drive.
