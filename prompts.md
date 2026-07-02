# Prompts Used for Test Generation

This file contains the raw prompts used with an LLM (Claude) to generate test cases for the Login, Dashboard, and REST API modules, exactly as written. Notes below each module describe what didn't work on the first pass and what was changed.

---

## Login Module

### Prompt

```
I'm building a Playwright TypeScript framework for saucedemo.com.
Help me write test cases for the login page. Cover valid login,
invalid credentials, locked out user, and brute-force lockout using
the site's real fixture accounts like standard_user and locked_out_user.

Before writing any test — tell me what scenarios are NOT actually
possible on this demo site (like forgot password or real session expiry)
and mark those as test.fixme with a comment explaining why. I don't
want fake flows.
```

### What didn't work first time / what changed

```
First output invented a /forgot-password route that doesn't exist on
saucedemo. The model just assumed a generic login form and hallucinated
a full forgot-password flow — which 404s in reality.

I told it to use the real fixture accounts and mark anything not
supported as test.fixme with a reason. Session expiry also isn't real
on this demo site, so I reframed it as: "if you go directly to
/inventory.html without logging in, does it redirect you?" — that's
the actual testable behavior.
```

---

## Dashboard Module

### Prompt

```
Now help me write tests for the inventory page at
https://www.saucedemo.com/inventory.html after logging in as standard_user.

Cover: product cards loading, names and prices being well-formed,
the sort dropdown working correctly (parse prices as numbers, not strings),
and mobile viewport layout.

For "permission-based visibility" — I know saucedemo has no real roles
system. Think about what's the closest real thing we can actually test here.
Hint: problem_user shows broken images. Use that as the real-world analog.
Use data-test attributes for selectors.
```

### What didn't work first time / what changed

```
The model tried to test "permission-based visibility" literally, which
makes no sense here — saucedemo has no roles or permissions system at all.

I redirected it: problem_user is the closest real thing. That account
loads broken images — which is something a test can actually catch as
a regression. Also the sort test was comparing prices as strings, so
"10" was coming before "9" and the test was passing incorrectly. Had
to explicitly tell it to parse as numbers before comparing.
```

---

## REST API Module

### Prompt

```
Help me write Playwright API tests against https://reqres.in/api.
Cover: login and token validation, full CRUD on /users, 4xx/5xx
error handling, and schema validation on the paginated list endpoint.

One thing — the API now requires an x-api-key header (they added this
recently). Read it from process.env.REQRES_API_KEY, don't hardcode it.

For rate limiting: if we can't reliably get a 429 from a shared public
demo API without flaky failures, just skip it and document why instead
of writing a fake assertion that always passes.
```

### What didn't work first time / what changed

```
First generated tests assumed reqres.in endpoints were fully open.
They weren't anymore — the site had added a mandatory x-api-key header
since the last time this was tested. Every request was returning 401
and I initially thought it was a code bug.

Once I figured out what changed, I updated the tests to read the key
from process.env.REQRES_API_KEY. For rate limiting — a shared public
demo API isn't going to reliably return 429 on demand, so I dropped
that test completely and documented why rather than writing an assertion
that fakes a pass.
```