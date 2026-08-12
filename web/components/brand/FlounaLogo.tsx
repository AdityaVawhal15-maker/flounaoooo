// Flouna brand mark — the eight-petal lotus.
//
// Drawn as vector rather than exported from Figma: the design file holds the
// mark as a placed raster (its SVG export is a 1.1MB embedded PNG), which would
// look soft on retina and could not take a colour. Here one petal shape is
// defined once and rotated, so the file stays tiny, scales cleanly to any size,
// and inherits `currentColor` — letting the same mark sit on cream, on the
// accent, or knocked out in white without shipping a second asset.
//
// Geometry, arrived at by rendering against the Figma artwork:
//   - Petals are lenses pointed at BOTH ends, all converging on one centre.
//   - `PINCH` keeps each petal hugging its own axis as it leaves the centre.
//     This is the whole trick: petals this full (up to 33 units of half-width)
//     would otherwise cross their 45°-apart neighbours and collapse the middle
//     into a blob. Pinching the base buys the fullness without the overlap.
//   - Cardinal petals run longer than the diagonals, and the horizontal pair is
//     widest — that asymmetry is what reads as a bloom instead of a star.

const PINCH = 0.28; // control-point distance from centre, as a fraction of length
const BELLY = 0.55; // where along the length the petal is widest

/** One petal, tip pointing up from the origin. */
function petal(length: number, halfWidth: number) {
  const cx = halfWidth * PINCH;
  const cy = -length * PINCH;
  const by = -length * BELLY;
  return `M0 0C${cx} ${cy} ${halfWidth} ${by} 0 ${-length}C${-halfWidth} ${by} ${-cx} ${cy} 0 0Z`;
}

const PETALS = [
  ...[0, 180].map((deg) => ({ deg, d: petal(88, 28) })), // vertical pair
  ...[90, 270].map((deg) => ({ deg, d: petal(97, 33) })), // horizontal pair, widest
  ...[45, 135, 225, 315].map((deg) => ({ deg, d: petal(65, 23) })), // diagonals
];

export function FlounaLogo({
  size = 40,
  className,
  strokeWidth = 6,
  title = "Flouna",
}: {
  size?: number;
  className?: string;
  /** In viewBox units (the box is 210 wide), so the stroke scales with the mark. */
  strokeWidth?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-105 -105 210 210"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      >
        {PETALS.map(({ deg, d }) => (
          <path key={deg} d={d} transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  );
}
