uniform float uSize;
uniform float uScroll;
uniform vec3 uMouse;

attribute float aScale;
attribute vec3 aRandomness;
attribute vec3 aPositionTarget;

varying vec3 vColor;

void main() {

  // position
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  // Animation
  modelPosition.xyz = modelPosition.xyz * (1.0 - uScroll) + aPositionTarget.xyz * uScroll;

  // Randomness
  modelPosition.xyz += aRandomness;

  // Mouse move
  // float distanceToMouse = pow(1.0 - clamp( length(uMouse.xyz - modelPosition.xyz) - 3.0, 0.0, 1.0 ), 2.0);
  // vec3 dir = modelPosition.xyz - uMouse.xyz;
  // // modelPosition.xy += distanceToMouse;
  // modelPosition.xyz = mix(modelPosition.xyz, uMouse.xyz + normalize(dir) * 1.0, distanceToMouse);

  // 새로운 방법
  vec3 seg = modelPosition.xyz - uMouse.xyz;
  vec3 dir = normalize(seg);
  float dist = length(seg);
  if ( dist < 5.0 ) {
    float force = clamp(1.0 / (dist * dist), -0.0, 0.5);
    modelPosition.xyz += dir * force;
    // vNormal = force / 0.5;
  }
  

  // 적용
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;

  // size
  gl_PointSize = uSize * aScale;
  gl_PointSize *= (1.0 / - viewPosition.z);

  // Color
  vColor = color;
}