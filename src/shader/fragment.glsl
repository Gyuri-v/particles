// uniform sampler2D u_pointTexture;

varying vec4 v_color;

void main() {
  // 1. 텍스쳐로 불러오기
  // gl_FragColor = v_color * texture2D(u_pointTexture, gl_PointCoord);

  // 2. 
  // Light point
  float strength = distance(gl_PointCoord, vec2(0.5));
  strength = 1.0 - strength;
  strength = pow(strength, 10.0);

  // Final color
  vec4 color = mix(vec4(0.0), v_color, 1.0);
  gl_FragColor = color;

  // 3. 그냥 
  // gl_FragColor = vec4(0.5, 0.0, 1.0, 1.0);
}