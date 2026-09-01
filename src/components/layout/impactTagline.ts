import type { CSSProperties } from 'react'

/**
 * Shared styling for the word "Impact" in the "Tenant Focused – Community Impact"
 * tagline that sits under the logo in the header and the footer.
 *
 * Set in Playfair Display Black (weight 900), loaded and self-hosted by Next via
 * next/font in the root layout and exposed as the --font-playfair CSS variable —
 * no third-party font request at page load.
 *
 * The fill is a brushed gold metallic: a banded vertical gradient that mimics the
 * light and shade running across polished metal, layered over fine horizontal
 * striations for the brushed grain, then clipped to the letterforms. The gold
 * tones are sampled from the brass table legs in the home page hero photo.
 *
 * Because the fill is painted rather than a flat colour, the text stays legible on
 * the navy header and footer as well as on the white header after scrolling, so a
 * single treatment covers every state.
 */
export const IMPACT_METALLIC: CSSProperties = {
  fontFamily: 'var(--font-playfair), Georgia, "Times New Roman", serif',
  fontWeight: 900,
  backgroundImage: [
    // Brushed grain — very fine alternating light/dark horizontal lines.
    'repeating-linear-gradient(0deg,' +
      ' rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px,' +
      ' rgba(90,60,10,0.10) 1px, rgba(90,60,10,0.10) 2px)',
    // Metal reflection — dark edges, bright speculars, a shaded waist.
    'linear-gradient(180deg,' +
      ' #8A6520 0%,' +
      ' #D9B45C 12%,' +
      ' #F6E3A9 26%,' +
      ' #C89A3C 38%,' +
      ' #9A6E22 50%,' +
      ' #C89A3C 62%,' +
      ' #F2DC9E 76%,' +
      ' #C08B3C 88%,' +
      ' #7A5216 100%)',
  ].join(', '),
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  // Applied after the clip, so it lifts the metal off the background on both the
  // navy and the white header. Kept blur-free so the edge stays crisp at the
  // small size the tagline runs at.
  filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.30))',
}
