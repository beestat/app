/**
 * Scene methods split from scene.js.
 */


/**
 * Add a skybox background. Generated using Spacescape with the Unity export
 * settings. After export: bottom is rotated CW 90°; top is roted 90°CCW.
 *
 * nx -> bk
 * ny -> dn
 * nz -> lf
 * px -> ft
 * py -> up
 * pz -> rt
 *
 * @link https://www.mapcore.org/topic/24535-online-tools-to-convert-cubemaps-to-panoramas-and-vice-versa/
 * @link https://jaxry.github.io/panorama-to-cubemap/
 * @link http://alexcpeterson.com/spacescape/
 */
beestat.component.scene.prototype.add_skybox_ = function() {
  const loader = new THREE.CubeTextureLoader();
  loader.setPath('img/visualize/skybox/');
  const texture = loader.load([
    'front.png',
    'back.png',
    'up.png',
    'down.png',
    'right.png',
    'left.png'
  ]);
  this.scene_.background = texture;
};


/**
 * Create a radial glow texture used for the sun halo sprite.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_sun_glow_texture_ = function() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  gradient.addColorStop(0.0, 'rgba(255, 255, 235, 1.0)');
  gradient.addColorStop(0.25, 'rgba(255, 230, 150, 0.75)');
  gradient.addColorStop(0.6, 'rgba(255, 170, 80, 0.25)');
  gradient.addColorStop(1.0, 'rgba(255, 120, 50, 0.0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};


/**
 * Create a compact bright sun-core texture.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_sun_core_texture_ = function() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.28, 'rgba(255, 247, 220, 1.0)');
  gradient.addColorStop(0.56, 'rgba(255, 225, 165, 0.82)');
  gradient.addColorStop(0.78, 'rgba(255, 190, 110, 0.28)');
  gradient.addColorStop(1.0, 'rgba(255, 150, 90, 0.0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};


/**
 * Create a soft star sprite texture.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_star_texture_ = function() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(245, 250, 255, 0.95)');
  gradient.addColorStop(0.65, 'rgba(210, 225, 255, 0.25)');
  gradient.addColorStop(1.0, 'rgba(200, 220, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};


/**
 * Create a circular particle texture for snow.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_snow_particle_texture_ = function() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.4, 'rgba(245, 250, 255, 0.9)');
  gradient.addColorStop(1.0, 'rgba(240, 245, 255, 0.0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};


/**
 * Create a soft circular particle texture for rain.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_rain_particle_texture_ = function() {
  const width = 56;
  const height = 56;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    width * 0.5
  );
  gradient.addColorStop(0.0, 'rgba(195, 218, 255, 0.95)');
  gradient.addColorStop(0.55, 'rgba(175, 205, 255, 0.55)');
  gradient.addColorStop(1.0, 'rgba(165, 198, 255, 0.0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};


/**
 * Create a soft cloud texture used for weather cloud sprites.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_cloud_texture_ = function() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  const circles = [
    {'x': 0.36, 'y': 0.56, 'r': 0.2},
    {'x': 0.5, 'y': 0.5, 'r': 0.24},
    {'x': 0.64, 'y': 0.56, 'r': 0.2},
    {'x': 0.5, 'y': 0.64, 'r': 0.22}
  ];

  circles.forEach(function(circle) {
    const gradient = context.createRadialGradient(
      size * circle.x,
      size * circle.y,
      0,
      size * circle.x,
      size * circle.y,
      size * circle.r
    );
    gradient.addColorStop(0.0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.55, 'rgba(240,245,255,0.55)');
    gradient.addColorStop(1.0, 'rgba(240,245,255,0.0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(size * circle.x, size * circle.y, size * circle.r, 0, Math.PI * 2);
    context.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};


/**
 * Draw the moon phase into the reusable moon canvas texture.
 *
 * @param {number} phase Moon phase from SunCalc (0=new, 0.25=first quarter,
 *   0.5=full, 0.75=last quarter).
 */
beestat.component.scene.prototype.update_moon_phase_texture_ = function(phase) {
  if (this.moon_phase_canvas_ === undefined) {
    this.moon_phase_canvas_ = document.createElement('canvas');
    this.moon_phase_canvas_.width = 256;
    this.moon_phase_canvas_.height = 256;
    this.moon_phase_texture_ = new THREE.CanvasTexture(this.moon_phase_canvas_);
  }

  const canvas = this.moon_phase_canvas_;
  const context = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = 110;

  context.clearRect(0, 0, size, size);

  // Base dark moon disk.
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fillStyle = '#2f3442';
  context.fill();

  // Lit region generated procedurally from phase (no image assets).
  context.save();
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.clip();

  context.fillStyle = '#dde3ef';
  const terminator = radius * Math.cos(2 * Math.PI * phase);
  const waxing = phase <= 0.5;
  for (let y = -radius; y <= radius; y++) {
    const x_edge = Math.sqrt(Math.max(0, radius * radius - y * y));
    // Curved terminator produces natural crescent/gibbous shapes.
    const x_terminator = terminator * Math.sqrt(Math.max(0, 1 - (y * y) / (radius * radius)));
    let x_start;
    let x_end;
    if (waxing) {
      x_start = Math.max(-x_edge, x_terminator);
      x_end = x_edge;
    } else {
      x_start = -x_edge;
      x_end = Math.min(x_edge, -x_terminator);
    }

    if (x_end > x_start) {
      context.fillRect(center + x_start, center + y, x_end - x_start, 1);
    }
  }
  context.restore();

  // Subtle rim to keep the disk readable on the skybox.
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  context.lineWidth = 2;
  context.stroke();

  this.moon_phase_texture_.needsUpdate = true;
};

