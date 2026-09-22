# Import a profile from Nolto

The hosted guide is at https://nolto.social/integrations, also linked from Self-hosting. This is a one-time, user-approved profile copy for application forms. It does not authenticate a candidate to your system and provides no ongoing access or verified claims.

Add the script once, and a button inside your existing form:

```html
<input name="full_name" data-nolto-field="name">
<input name="email" type="email" data-nolto-field="email">
<input name="profile_url" type="url" data-nolto-field="profileUrl">
<button type="button" data-nolto-import data-nolto-fields="name,email,profileUrl">
  Hämta från Nolto
</button>
<script src="https://nolto.social/embed/nolto-profile.js" defer></script>
```

The button does not submit the form. Candidates see the recipient origin, the requested fields and their actual values, then select fields and explicitly share. Email, phone and CV sections are unchecked by default. Unselected fields are absent, not blanked into existing form values. Cancellation leaves the form intact. The script emits ordinary bubbling `input` and `change` events, and a `nolto:profile` CustomEvent from the button with the shared object in `event.detail`.

For SPA forms added later call `Nolto.bind()`, or use the promise API directly in a click handler:

```js
try {
  const profile = await Nolto.requestProfile({
    fields: ['name', 'email', 'profileUrl', 'experience', 'education', 'skills']
  });
  // Apply these values through your form framework's state API.
} catch (error) {
  // Show cancellation, popup-blocking or timeout feedback.
}
```

Scalar fields: `name`, `headline`, `location`, `bio`, `profileUrl`, `handle`, `email`, `phone`, `website`.

`experience` is an array of `{title, company, description, start_date, end_date, is_current_role, location}`. `education` is an array of `{institution, degree, field, start_year, end_year}`. `skills` is a string array. Each CV list is limited to the first 100 entries. Internal database IDs, verification tokens, session tokens and private messages are never part of the export.

The SDK checks the exact Nolto origin, popup window and a random request ID before accepting a response. The consent page only sends to the displayed origin, never `*`. Host your form over HTTPS; localhost HTTP is accepted for development. Load the script from your own trusted Nolto instance for self-hosting; it derives its origin from the script URL. Your CSP must permit that script and a popup to the same origin. A restrictive Cross-Origin-Opener-Policy can sever the popup relationship; test the integration with your actual headers.

If sign-in is needed it opens a separate tab, preserving the relationship between the form and consent window. The candidate returns to the consent window after signing in. No third-party cookies, API key, backend credential or account at Nolto is required for the recruiting site. How the recipient stores the submitted application remains its responsibility.
