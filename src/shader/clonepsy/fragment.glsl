uniform sampler2D u_pointTexture;

varying vec4 v_color;

void main() {
  gl_FragColor = v_color * texture2D(u_pointTexture, gl_PointCoord);
}