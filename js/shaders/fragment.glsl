varying vec2 vUv;
uniform sampler2D uTexture;
void main() {
    vec4 color = texture2D( uTexture, vUv );
    gl_FragColor = vec4( 1.,1.,1., 1. );
    // gl_FragColor = color;
}