# Brand artwork

The artwork in `public/brand` comes from the four illustrations supplied for Nolto on 22 September 2026.

- `mascot.webp` is the colour mascot, used in navigation, sign-in and the footer. The browser icons and sharing image use the same artwork.
- `avatar-default.webp` is the grey portrait. `AvatarFallback` displays it for people when an image is absent, loading or unavailable. This is a display fallback; it does not write an avatar URL into anyone's profile. Organisation logos retain their existing fallback through `kind="organisation"`.
- `header.svg` and `footer.svg` are colour vector traces made with [VTracer 0.6.15](https://pypi.org/project/vtracer/0.6.15/). They contain paths, with no embedded raster image, script, font or external resource. Tracing simplifies the original gradients. Transparent margins and isolated low-opacity pixels were removed before conversion.

The SVGs retain their aspect ratios through a `viewBox` and automatic CSS height. They show the complete illustration on narrow screens, without cutting off the mascot or buildings. Transparent contours reveal the page background in both themes. Text stays in HTML; its contrast and the footer link colours are controlled separately from the artwork.

The header is part of the public homepage. The illustrated footer appears only once authentication has resolved to a signed-out visitor. The existing theme control is also available in visitor navigation. User-supplied profile photos take precedence over the grey portrait, including when a replacement photo finishes loading.

Conversion settings: colour mode, stacked paths, spline fitting, speckle filter 8, colour precision 6, layer difference 24, corner threshold 60, segment length 5, splice threshold 45 and coordinate precision 2. No conversion library is shipped with the application.
