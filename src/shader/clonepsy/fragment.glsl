// uniform sampler2D u_pointTexture;

varying vec4 v_color;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float circle = step(length(uv), 0.5);
  gl_FragColor = vec4(vec3(circle), 1.0) * v_color;

  // gl_FragColor = vec4(0.5, 0.0, 1.0, 1.0);
}