/** Parent radii. Keep the inner 3.25 radii linear so physical ring boundaries
 * and nearby satellites share a scale; compress only the space farther out.
 * This is a display transform, never used for ephemeris or metric calculation. */
export function localDisplayDistance(distanceInParentRadii:number):number {
 return distanceInParentRadii<=3.25?distanceInParentRadii:3.25+.48*Math.log(distanceInParentRadii/3.25);
}
