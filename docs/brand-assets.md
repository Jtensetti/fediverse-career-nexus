# Brand artwork

The artwork in `public/brand` comes from the four illustrations supplied for Nolto on 22 September 2026.

- `mascot.webp` is the colour mascot, used in navigation, sign-in and the footer. The browser icons and sharing image use the same artwork.
- `avatar-default.webp` is the grey portrait. `AvatarFallback` displays it for people when an image is absent, loading or unavailable. This is a display fallback; it does not write an avatar URL into anyone's profile. Organisation logos retain their existing fallback through `kind="organisation"`.
- `header.svg` and `footer.svg` are colour vector traces made with [VTracer 0.6.15](https://pypi.org/project/vtracer/0.6.15/). They contain paths, with no embedded raster image, script, font or external resource. Tracing simplifies the original gradients. Transparent margins and isolated low-opacity pixels were removed before conversion.

The SVGs retain their aspect ratios through a `viewBox` and automatic CSS height. They show the complete illustration on narrow screens, without cutting off the mascot or buildings. The four transparent pixels beneath the footer were removed from its viewBox. The traced landscape contours have been simplified and smoothed; small colour fragments along the road have been removed. The composition and the mascot's facial details remain intact.

Each SVG contains a light-palette stylesheet, selected with `prefers-color-scheme`. The original deep blues are the evening palette; the day palette uses pale blue-green scenery. Landscape palette rules are scoped to `#landscape`, separately from the `#mascot` details. The `#mascot-coat` and `#mascot-shirt` paths restore clothing areas that the original trace had merged with the hills; the coat has its own navy day colour and blue evening highlight. The header's tie and shirt edge use clean, independent shapes. Keep these clothing paths separate when changing the landscape palette.

`PublicArtwork` sets `color-scheme` from the page's `.dark` class, so the embedded image follows the visitor's explicit theme choice as well as system mode. This uses the browser's [inherited colour scheme for embedded SVGs](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme#inherited_color_scheme_in_embedded_elements); it needs no JavaScript image processing, duplicate paths or additional dependencies.

The homepage places the illustration behind its introduction and navigation. A matching sky extends above the illustration, leaving room for text without stretching the mascot. The SVG's upper edge blends into that sky. Keep `--hero-sky` in `homepage.css` aligned with the SVG sky colours (`#e2eeeb` by day, `#0e506d` by evening).

The public footer starts with its wordmark over the landscape. The scenery blends into `--footer-ground`, which continues behind the links without a separate image strip or gap. On small screens, text follows the shorter illustration to keep the mascot and links clear. Text stays in HTML, with colours controlled separately from the artwork.

The header is part of the public homepage. The illustrated footer appears only once authentication has resolved to a signed-out visitor. The existing theme control is also available in visitor navigation. User-supplied profile photos take precedence over the grey portrait, including when a replacement photo finishes loading.

Conversion settings: colour mode, stacked paths, spline fitting, speckle filter 8, colour precision 6, layer difference 24, corner threshold 60, segment length 5, splice threshold 45 and coordinate precision 2. No conversion library is shipped with the application.
