#!/usr/bin/env python3
"""The check after a deploy: does the live site serve this build, and does its API answer?

Why it exists. On 18 Oct 2026 a deploy reported success while the live API answered 500 and 503
and then hung, for about 12 minutes; the same commit deployed cleanly half an hour later (board
A20). The unit tests cannot see that, because the code was fine: only the live site shows it.
Without this check the pipeline stays green while the demo is down. Replace it only with
something that checks the live site at least as well.

It passes when, within the time budget:
  1. the live page loads the same script bundle as the built index.html, when one is given, so
     the front end that was tested is the one being served;
  2. GET /api/vehicles answers 200 with a non-empty JSON list that includes the worked example's
     car;
  3. POST /api/quote with the worked example, starting a week from today, answers 200 with
     227.19 a year and 20.45 a month (contracts/examples/quote-worked-example.json).
Each check is retried until it passes or the budget runs out. A check that never passes fails the
run and prints what the site last answered.

Standard library only, so it runs on the pipeline's Linux agent and on Windows alike:
    python3 tools/smoke_live.py <site-url> [<built index.html>]
    python  tools\\smoke_live.py https://wonderful-mushroom-05443000f.6.azurestaticapps.net

Timings, in seconds, from the environment (the defaults suit a real deploy):
    SMOKE_BUDGET_SECONDS           360  the whole check
    SMOKE_INTERVAL_SECONDS          15  between tries
    SMOKE_REQUEST_TIMEOUT_SECONDS   60  one request (Static Web Apps cuts a function at 45)
"""

import datetime
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

# The worked example's car and price: contracts/examples/quote-worked-example.json. The price
# holds while the driver (born 12 March 1984) is 30 to 49 on the start date, so until 2034.
WORKED_EXAMPLE_CAR = "vw-golf-2021"
WORKED_EXAMPLE_ANNUAL = 227.19
WORKED_EXAMPLE_MONTHLY = 20.45

BUNDLE = re.compile(r"/assets/index-[A-Za-z0-9_-]+\.js")


def log(message):
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%H:%M:%SZ")
    print(f"[{stamp}] {message}", flush=True)


def fail(message):
    # Azure DevOps reads this line and shows the message on the run's summary page.
    if os.environ.get("TF_BUILD"):
        print(f"##vso[task.logissue type=error]{message}", flush=True)
    log(f"FAILED: {message}")
    sys.exit(1)


def seconds(name, default):
    return float(os.environ.get(name, default))


def answered(status, text, limit=200):
    return f"gave no answer ({text})" if status is None else f"answered {status}: {text[:limit]}"


def request(url, timeout, body=None):
    """One request. Returns (status, text); status is None when no answer came back."""
    headers = {"Cache-Control": "no-cache", "Accept": "application/json, text/html"}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as error:
        return None, str(error)


def worked_example_body():
    # A week ahead keeps the start date inside the API's window (today to 30 days ahead, London
    # time) whatever the time zone of the machine running this.
    start = datetime.date.today() + datetime.timedelta(days=7)
    return {
        "vehicleId": WORKED_EXAMPLE_CAR, "carValue": 14500, "overnight": "driveway",
        "mileage": "5to10k", "use": "commuting", "dateOfBirth": "1984-03-12", "licenceYears": 20,
        "postcode": "PE38 9AB", "noClaimsYears": 6, "claimsLast5Years": 0,
        "cover": "comprehensive", "voluntaryExcess": 250, "startDate": start.isoformat(),
        "breakdown": True, "legalExpenses": False,
    }


def check_page(site, expected_bundle):
    status, text = request(f"{site}/?smoke={int(time.time())}", TIMEOUT)
    if status != 200:
        return False, f"the page {answered(status, text)}"
    if expected_bundle is None:
        return True, "the page answered 200"
    live = BUNDLE.search(text)
    if live is None or live.group(0) != expected_bundle:
        return False, f"the page loads {live.group(0) if live else 'no bundle'}, the build made {expected_bundle}"
    return True, f"the page loads this build's {expected_bundle}"


def check_vehicles(site):
    status, text = request(f"{site}/api/vehicles", TIMEOUT)
    if status != 200:
        return False, f"/api/vehicles {answered(status, text)}"
    try:
        cars = json.loads(text)
        ids = [car["id"] for car in cars]
    except (ValueError, TypeError, KeyError) as error:
        return False, f"/api/vehicles answered 200 but not a list of cars ({error}): {text[:200]}"
    if WORKED_EXAMPLE_CAR not in ids:
        return False, f"/api/vehicles has no {WORKED_EXAMPLE_CAR}: {ids}"
    return True, f"/api/vehicles answered 200 with {len(ids)} cars"


def check_quote(site):
    status, text = request(f"{site}/api/quote", TIMEOUT, worked_example_body())
    if status != 200:
        return False, f"/api/quote {answered(status, text, 300)}"
    try:
        quote = json.loads(text)
        annual, monthly = quote["annual"], quote["monthly"]
    except (ValueError, TypeError, KeyError) as error:
        return False, f"/api/quote answered 200 but not a quote ({error}): {text[:300]}"
    if (annual, monthly) != (WORKED_EXAMPLE_ANNUAL, WORKED_EXAMPLE_MONTHLY):
        return False, f"the worked example priced at {annual} and {monthly}, expected {WORKED_EXAMPLE_ANNUAL} and {WORKED_EXAMPLE_MONTHLY}"
    return True, f"the worked example priced at {annual} a year and {monthly} a month"


def until_it_passes(name, check, deadline):
    tries = 0
    while True:
        tries += 1
        passed, said = check()
        log(f"{name}, try {tries}: {said}")
        if passed:
            return
        if time.monotonic() + INTERVAL > deadline:
            fail(f"{name} did not pass within {BUDGET:.0f} s. Last answer: {said}")
        time.sleep(INTERVAL)


def main(args):
    if len(args) not in (1, 2):
        print(__doc__)
        return 2
    site = args[0].rstrip("/")
    expected_bundle = None
    if len(args) == 2:
        with open(args[1], encoding="utf-8") as built:
            found = BUNDLE.search(built.read())
        if found is None:
            fail(f"{args[1]} names no script bundle, so there is nothing to compare the live page with")
        expected_bundle = found.group(0)

    log(f"Checking {site}, budget {BUDGET:.0f} s, a try every {INTERVAL:.0f} s")
    deadline = time.monotonic() + BUDGET
    until_it_passes("The page", lambda: check_page(site, expected_bundle), deadline)
    until_it_passes("The car list", lambda: check_vehicles(site), deadline)
    until_it_passes("The worked example", lambda: check_quote(site), deadline)
    log("PASSED: the live site serves this build and its API answers.")
    return 0


BUDGET = seconds("SMOKE_BUDGET_SECONDS", 360)
INTERVAL = seconds("SMOKE_INTERVAL_SECONDS", 15)
TIMEOUT = seconds("SMOKE_REQUEST_TIMEOUT_SECONDS", 60)

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
