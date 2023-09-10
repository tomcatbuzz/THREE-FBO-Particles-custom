varying vec2 vUv;
uniform float uProgress;
uniform sampler2D uCurrentPosition;
uniform sampler2D uOriginalPosition;
uniform sampler2D uOriginalPosition1;
uniform vec3 uMouse;
uniform float uTime;
float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
    float offset = rand(vUv);
    vec3 position = texture2D( uCurrentPosition, vUv ).xyz;
    vec3 original = texture2D( uOriginalPosition, vUv ).xyz;
    vec3 original1 = texture2D( uOriginalPosition1, vUv ).xyz;

    // vec2 velocity = texture2D( uCurrentPosition, vUv ).zw;

    vec3 finalOriginal = original;

    // velocity *= 0.99;

    // particle attraction to shape force
    vec3 direction = normalize( finalOriginal - position );
    float dist = length( finalOriginal - position );
    if( dist > 0.01 ) {
        position += direction  * 0.001;
    }
    



    // mouse repel force
    float mouseDistance = distance( position, uMouse );
    float maxDistance = 0.3;
    if( mouseDistance < maxDistance ) {
        vec3 direction = normalize( position - uMouse );
        position += direction * ( 1.0 - mouseDistance / maxDistance ) * 0.1;
    }


    // lifespan of a particle
    float lifespan = 10.;
    float age = mod( uTime+ lifespan*offset, lifespan );
    if(age<0.1){
        // velocity = vec2(0.0,0.001);
        position.xyz = finalOriginal;
    }



    // position.xy += velocity;

    
    gl_FragColor = vec4( position, 1.);
}