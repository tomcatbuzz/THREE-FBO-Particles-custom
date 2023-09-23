varying vec2 vUv;
uniform float uProgress;
uniform int uRenderMode;
uniform vec3 uSource;
uniform sampler2D uCurrentPosition;
uniform sampler2D uDirections;
uniform vec3 uMouse;
uniform float uTime;
float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
    float offset = rand(vUv);
    vec3 position = texture2D( uCurrentPosition, vUv ).xyz;
    vec4 direction = texture2D( uDirections, vUv );

    // position.xyz += direction.xyz * 0.01;

    // Gravity
    if(uRenderMode==0) {
      float life = 1. - clamp((uTime - direction.a)/15., 0., 1.);
      float speedlife = clamp(life, 0.1, 1.);
      position.xyz = position.xyz + speedlife*direction.xyz * 0.01 + vec3(0., -1., 0.)*0.005;
      gl_FragColor = vec4( position, life);
    }

    // Directions
    if(uRenderMode==1) {
      float rnd1 = rand(vUv) - 0.5;
      float rnd2 = rand(vUv + vec2(0.1, 0.1)) - 0.5;
      float rnd3 = rand(vUv + vec2(0.3, 0.3)) - 0.5;
        gl_FragColor = vec4( uSource + vec3(rnd1, rnd2, rnd3)*0.2, uTime);
    }

    // Positions
    if(uRenderMode==2) {
      float rnd1 = rand(vUv) - 0.5;
      float rnd2 = rand(vUv + vec2(0.1, 0.1)) - 0.5;
      float rnd3 = rand(vUv + vec2(0.3, 0.3)) - 0.5;
        gl_FragColor = vec4( uSource + vec3(rnd1, rnd2, rnd3)*0.1, 1.);
    }

    // gl_FragColor = vec4( position, 1.);
}