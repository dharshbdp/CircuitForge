# circuitforge agent rules and workflow

## project context

circuitforge is a windows desktop iot application.

-   repository: https://github.com/dharshbdp/circuitforge.git
-   local repository: `z:\circuitforge`
-   desktop app: `z:\circuitforge\app`
-   stack: electron, react, typescript
-   user experience level: beginner with git and desktop development
-   terminal: windows powershell
-   use `npm.cmd`, not `npm`, because powershell blocks `npm.ps1`

## primary objective

build circuitforge incrementally.

the first usable milestone is a desktop application that:

1.  opens successfully
2.  lists available serial ports
3.  lets the user select and connect to a serial device
4.  displays incoming serial messages
5.  clearly shows connection status and errors

do not implement block editing, simulation, code generation, ai
features, device firmware, cloud syncing, or automatic updates until
this milestone works.

## core rules

-   explain each proposed action in plain language before asking the
    user to run it
-   give one small, verifiable step at a time
-   do not make large rewrites, scaffold a second application, or
    replace the chosen stack without explaining why and receiving
    approval
-   do not delete source files, git history, `.git`,
    `package-lock.json`, or project configuration without explicit
    approval
-   it is acceptable to delete and recreate `node_modules` when
    troubleshooting dependencies
-   do not run `npm audit fix --force`
-   do not approve package install scripts broadly; approve only known,
    necessary packages after explaining why
-   do not expose secrets, commit `.env` files, api keys, device
    credentials, or personal data
-   keep dependencies minimal and prefer established, maintained
    packages
-   use typescript strictly and avoid `any` unless there is a documented
    reason
-   keep the electron main process, preload bridge, and react renderer
    clearly separated
-   do not expose unrestricted node.js access to the renderer; use a
    narrow, typed preload api

## existing setup issue

the application was generated with:

``` powershell
npm.cmd create @quick-start/electron@latest app
```

the starter app currently fails to start because electron's executable
was not downloaded.

### known facts

-   node version: `v26.7.0`
-   expected electron executable:
    `z:\circuitforge\app\node_modules\electron\dist\electron.exe`
-   current status: missing

`npm.cmd run dev`:

-   starts the renderer server
-   then fails with: `Error: Electron uninstall`

### previous checks

``` powershell
Test-Path .\node_modules\electron\dist\electron.exe
# False

Get-ChildItem Env:ELECTRON*
# No output
```

do not assume the cause. diagnose it carefully.

prefer moving to a current node.js lts version and reinstalling
dependencies cleanly if the current node version is incompatible or
unstable.

## recommended project structure

``` text
CircuitForge/
├── app/
│   ├── src/
│   │   ├── main/
│   │   ├── preload/
│   │   └── renderer/
│   ├── package.json
│   └── electron-builder.yml
├── docs/
├── assets/
├── README.md
├── .gitignore
└── ANTIGRAVITY.md
```

within the app, keep serial communication in the electron main process.

the react renderer must request actions through the preload api and must
not access serial devices directly.

## development workflow

for every feature:

1.  state the feature's small, testable outcome
2.  identify which files will change and why
3.  make the smallest implementation that can work
4.  run the app and test the relevant behavior
5.  report what worked, what did not, and the next smallest step
6.  suggest a focused git commit only after the feature works

### feature sequence

1.  starter app opens
2.  basic circuitforge branding and layout
3.  serial port discovery
4.  device selection and connection
5.  incoming serial monitor
6.  clear error and reconnect states
7.  saved connection preferences
8.  packaging for windows

## git workflow

use small, meaningful commits.

before each commit:

``` powershell
git status
git diff
```

suggested commit messages:

``` text
chore: initialize electron react application
docs: add circuitforge roadmap
feat: list available serial ports
feat: connect to selected serial device
feat: display incoming serial messages
fix: show serial connection errors
```

never commit:

``` text
node_modules/
out/
dist/
release/
.env
.env.*
*.log
```

after a successful commit:

``` powershell
git push
```

explain what each git command does because the user is learning git.

## quality requirements

-   the app must remain usable when no serial devices are connected
-   error messages must explain what the user can do next
-   hardware access must not freeze the interface
-   validate and sanitize data received over serial connections
-   keep the ui simple, clear, and dark-friendly
-   add comments only where they explain a non-obvious decision
-   update the readme and `docs/` when an architectural decision changes

## communication style

-   be practical and concise
-   avoid jargon where possible
-   never claim something is fixed without showing how it was verified
-   when blocked, show the exact error and propose the safest next
    diagnostic step
