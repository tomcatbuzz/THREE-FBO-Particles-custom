varying vec2 vUv;
uniform float time;
void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_PointSize = 1.;
    gl_Position = projectionMatrix * mvPosition;
}
