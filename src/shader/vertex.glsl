uniform float uSize;
uniform float uScroll;

attribute float aScale;
attribute vec3 aRandomness;
attribute vec3 aPositionCat;

varying vec3 vColor;

void main() {
  // position
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  // Randomness
  // modelPosition.xyz += aRandomness;

  // Animation
  modelPosition.xyz = modelPosition.xyz * (1.0 - uScroll) - aPositionCat.xyz * uScroll;

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