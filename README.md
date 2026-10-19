# Since Until

Static HTML, CSS and JavaScript app showing the time since or until a date, in years, months, days, hours, minutes and seconds.

## Install Deno

Skip this if `deno --version` already prints a version.

macOS:

    brew install deno

macOS or Linux, without Homebrew:

    curl -fsSL https://deno.land/install.sh | sh

Windows (PowerShell):

    irm https://deno.land/install.ps1 | iex

Required version: Deno 2.9.7, the version `dev.ts` was tested on.  Other versions are untested.  To match it after installing:

    deno upgrade --version 2.9.7

Open a new terminal and run `deno --version` to confirm.  The dev server needs no dependencies, so there is no install step for the project itself.  Other install methods are listed at https://docs.deno.com/runtime/getting_started/installation/.

## Run

    deno task dev

Open http://localhost:8000.  `dev.ts` reloads open pages when any file changes and replaces `sw.js` with a worker that unregisters itself, so cached files never go stale.  Pass a port with `deno task dev 9000`.  Any static server also works, for example `python3 -m http.server 8000`, without live reload.  Opening `index.html` directly also works, without the service worker.

## Test

    deno task test

Runs `tests/countdown_test.ts` with `TZ=America/New_York`, so the DST case is deterministic.  The tests pin current behavior of `js/countdown.js`, and check that every file in the `sw.js` precache list exists.  They do not cover `app.js` or `dev.ts`.  GitHub Actions runs them on every pull request (`.github/workflows/test.yml`) on Deno 2.9.7.

## Behavior

- Two examples sit in a collapsed Examples section below the clock: the end of the Roman Empire (September 4, 476, local midnight, proleptic Gregorian) and the end of Donald Trump's 2nd term (January 20, 2029, 12:00 PM Eastern).  Clicking one loads it.  The first visit opens on the second.
- Auto mode hides leading zero units (under a year hides years, under a month hides months, and so on).
- Past 20 years, auto mode hides hours, minutes and seconds.
- Light or dark theme follows the system setting until the toggle is used.  The toggle's choice is saved in this browser.
- Each unit can be set to Auto, Show or Hide.
- The share link stores the name, the target instant and any non-auto unit settings in the URL hash.  No server is involved.
- `sw.js` caches every asset for offline use.  Bump `CACHE_NAME` when any asset changes.  Add new assets to its `ASSETS` list.
