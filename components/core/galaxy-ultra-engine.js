// ═══════════════════════════════════════════════════════
//  GALAXY ULTRA ENGINE — Path-Tracing Inspired Upgrade
//  Volumetric ray-marched nebula, accretion disk,
//  gravitational lensing, force graph mode
//  Loaded AFTER analytics-pro-engine.js to override
// ═══════════════════════════════════════════════════════

(function() {
    'use strict';

    // Safety check
    if (typeof apGxState === 'undefined') {
        console.warn('[Galaxy Ultra] analytics-pro-engine.js must load first');
        return;
    }

    // ── Three.js Lazy-Loader ──
    var _threeLoading = false;
    var _threeCallbacks = [];
    var _threeReady = false;
    function _loadThreeJS(callback) {
        if (_threeReady || (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined')) {
            _threeReady = true;
            callback(true);
            return;
        }
        _threeCallbacks.push(callback);
        if (_threeLoading) return;
        _threeLoading = true;
        var urls = [
            'https://cdn.jsdelivr.net/npm/three@0.145.0/build/three.min.js',
            'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/controls/OrbitControls.js',
            'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/EffectComposer.js',
            'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/RenderPass.js',
            'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/UnrealBloomPass.js',
            'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/ShaderPass.js',
            'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/shaders/CopyShader.js',
            'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/shaders/LuminosityHighPassShader.js'
        ];
        var i = typeof THREE !== 'undefined' ? 1 : 0;
        function next() {
            if (i >= urls.length) {
                _threeLoading = false;
                var ready = typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined';
                _threeReady = ready;
                var callbacks = _threeCallbacks.splice(0);
                callbacks.forEach(function(cb) { cb(ready); });
                return;
            }
            var s = document.createElement('script');
            s.src = urls[i++];
            var advanced = false;
            var timeoutId = window.setTimeout(function() {
                console.error('[Galaxy] Three.js Timeout: ' + s.src);
                advance();
            }, 15000);
            function advance() {
                if (advanced) return;
                advanced = true;
                window.clearTimeout(timeoutId);
                next();
            }
            s.onload = advance;
            s.onerror = function() {
                console.error('[Galaxy] Three.js Ladefehler: ' + urls[i-1]);
                advance();
            };
            document.head.appendChild(s);
        }
        next();
    }

    // Shared by 3D City as well: both visualizations use one loader queue.
    window._loadThreeJS = _loadThreeJS;

    // ── Extended state ──
    apGxState.volumetricNebula = null;
    apGxState.accretionDisk = null;
    apGxState.accretionGroup = null;
    apGxState.lensingPass = null;
    apGxState.forceGraphMode = false;
    apGxState.forceGraphInstance = null;
    apGxState.warpActive = false;
    apGxState.jetParticles = null;

    // ═══════════════════════════════════════
    //  GLSL SHADERS
    // ═══════════════════════════════════════

    // ── Noise (reuse from original if available, else define) ──
    var ultraNoiseGLSL = (typeof apGxNoiseGLSL !== 'undefined') ? apGxNoiseGLSL : [
        'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
        'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
        'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
        'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
        'float snoise(vec3 v){',
        '  const vec2 C=vec2(1.0/6.0,1.0/3.0);',
        '  const vec4 D=vec4(0.0,0.5,1.0,2.0);',
        '  vec3 i=floor(v+dot(v,C.yyy));',
        '  vec3 x0=v-i+dot(i,C.xxx);',
        '  vec3 g=step(x0.yzx,x0.xyz);',
        '  vec3 l=1.0-g;',
        '  vec3 i1=min(g.xyz,l.zxy);',
        '  vec3 i2=max(g.xyz,l.zxy);',
        '  vec3 x1=x0-i1+C.xxx;',
        '  vec3 x2=x0-i2+C.yyy;',
        '  vec3 x3=x0-D.yyy;',
        '  i=mod289(i);',
        '  vec4 p=permute(permute(permute(',
        '    i.z+vec4(0.0,i1.z,i2.z,1.0))',
        '    +i.y+vec4(0.0,i1.y,i2.y,1.0))',
        '    +i.x+vec4(0.0,i1.x,i2.x,1.0));',
        '  float n_=0.142857142857;',
        '  vec3 ns=n_*D.wyz-D.xzx;',
        '  vec4 j=p-49.0*floor(p*ns.z*ns.z);',
        '  vec4 x_=floor(j*ns.z);',
        '  vec4 y_=floor(j-7.0*x_);',
        '  vec4 x=x_*ns.x+ns.yyyy;',
        '  vec4 y=y_*ns.x+ns.yyyy;',
        '  vec4 h=1.0-abs(x)-abs(y);',
        '  vec4 b0=vec4(x.xy,y.xy);',
        '  vec4 b1=vec4(x.zw,y.zw);',
        '  vec4 s0=floor(b0)*2.0+1.0;',
        '  vec4 s1=floor(b1)*2.0+1.0;',
        '  vec4 sh=-step(h,vec4(0.0));',
        '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;',
        '  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
        '  vec3 p0=vec3(a0.xy,h.x);',
        '  vec3 p1=vec3(a0.zw,h.y);',
        '  vec3 p2=vec3(a1.xy,h.z);',
        '  vec3 p3=vec3(a1.zw,h.w);',
        '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
        '  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;',
        '  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);',
        '  m=m*m;',
        '  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
        '}'
    ].join('\n');

    // ── Optimized noise: max 2 octaves FBM, cheap ridged noise ──
    var ultraFbmGLSL = [
        'float fbm2(vec3 p){',
        '  return snoise(p) * 0.6 + snoise(p * 2.0 + vec3(100.0)) * 0.3;',
        '}',
        '// Ridged noise: 2 octaves only for performance',
        'float ridged(vec3 p){',
        '  float n1 = 1.0 - abs(snoise(p));',
        '  float n2 = 1.0 - abs(snoise(p * 2.1 + vec3(100.0)));',
        '  return n1 * n1 * 0.6 + n2 * n2 * 0.3;',
        '}'
    ].join('\n');

    // ── Volumetric Nebula Ray-March Shader ──
    var volumetricVertexShader = [
        'varying vec3 vWorldPos;',
        'varying vec3 vViewDir;',
        'uniform vec3 uCamPos;',
        'void main(){',
        '  vec4 worldPos = modelMatrix * vec4(position, 1.0);',
        '  vWorldPos = worldPos.xyz;',
        '  vViewDir = normalize(worldPos.xyz - uCamPos);',
        '  gl_Position = projectionMatrix * viewMatrix * worldPos;',
        '}'
    ].join('\n');

    var volumetricFragmentShader = [
        'uniform float uTime;',
        'uniform vec3 uCamPos;',
        'varying vec3 vWorldPos;',
        'varying vec3 vViewDir;',
        '',
        ultraNoiseGLSL,
        ultraFbmGLSL,
        '',
        '// Galaxy density — optimized: ~4 snoise per call',
        'void galaxyDensity(vec3 p, out float density, out float dustF, out float emF){',
        '  float r = length(p.xz);',
        '  float angle = atan(p.z, p.x);',
        '  float diskFade = exp(-p.y * p.y * 5.0);',
        '  float radFade = exp(-r * 0.04) * smoothstep(1.0, 5.0, r) + exp(-r * 0.25) * 0.3;',
        '',
        '  // Spiral arms: 2 major + 2 minor',
        '  float logR = log(max(r, 0.3));',
        '  float sp = angle - logR * 2.5 + uTime * 0.005;',
        '  float arm1 = pow(max(cos(sp), 0.0), 4.0);',
        '  float arm2 = pow(max(cos(sp + 3.14159), 0.0), 4.0) * 0.8;',
        '  float arm3 = pow(max(cos(sp + 1.3), 0.0), 6.0) * 0.3;',
        '  float arms = arm1 + arm2 + arm3;',
        '',
        '  // Filaments + turbulence: only 4 snoise total',
        '  float filament = ridged(p * 0.08);',
        '  float turb = fbm2(p * 0.05 + uTime * 0.002) * 0.5 + 0.5;',
        '',
        '  dustF = pow(max(cos(sp + 0.3), 0.0), 3.0) * filament * diskFade * smoothstep(3.0, 8.0, r) * 0.5;',
        '  emF = pow(max(snoise(p * 0.15 + vec3(7.7,3.1,5.5)), 0.0), 4.0) * arms * diskFade * smoothstep(5.0, 12.0, r);',
        '  density = diskFade * radFade * (arms * 0.6 + 0.12) * turb * (filament * 0.4 + 0.6);',
        '}',
        '',
        'void main(){',
        '  vec3 rayDir = normalize(vViewDir);',
        '  vec3 rayPos = vWorldPos;',
        '  vec4 accum = vec4(0.0);',
        '  float stepLen = 4.0;',
        '  float transmittance = 1.0;',
        '',
        '  for(int i = 0; i < 20; i++){',
        '    float dens, dustF, emF;',
        '    galaxyDensity(rayPos, dens, dustF, emF);',
        '',
        '    if(dens > 0.003){',
        '      float r = length(rayPos.xz);',
        '      vec3 starlight = mix(vec3(0.9,0.8,0.6), vec3(0.65,0.7,0.8), smoothstep(5.0,40.0,r)) * 0.25;',
        '      vec3 scattered = vec3(0.2,0.3,0.5) * dustF * 0.1;',
        '      // Emission: H-alpha / OIII mix',
        '      float ionMix = snoise(rayPos * 0.12 + 3.3) * 0.5 + 0.5;',
        '      vec3 emCol = mix(vec3(0.7,0.1,0.15), vec3(0.05,0.4,0.35), ionMix);',
        '      vec3 col = starlight * dens + scattered + emCol * emF * 0.8 + vec3(0.8,0.55,0.3) * exp(-r*0.15) * 0.05;',
        '',
        '      transmittance *= exp(-dustF * stepLen * 0.3);',
        '      float alpha = dens * 0.035 * transmittance;',
        '      accum.rgb += col * alpha * transmittance;',
        '      accum.a += alpha;',
        '    }',
        '    rayPos += rayDir * stepLen;',
        '    if(accum.a > 0.5 || transmittance < 0.1) break;',
        '  }',
        '  accum.rgb *= transmittance * 0.4 + 0.6;',
        '  gl_FragColor = accum;',
        '}'
    ].join('\n');

    // ── Accretion Disk Shader ──
    var accretionVertexShader = [
        'varying vec3 vPos;',
        'varying vec3 vNormal;',
        'uniform float uTime;',
        'void main(){',
        '  vPos = position;',
        '  vNormal = normalize(normalMatrix * normal);',
        '  // Subtle warp animation',
        '  vec3 p = position;',
        '  float wave = sin(atan(p.z, p.x) * 6.0 + uTime * 2.0) * 0.15;',
        '  p.y += wave * (1.0 - smoothstep(0.0, 2.0, length(p.xz)));',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
        '}'
    ].join('\n');

    var accretionFragmentShader = [
        'uniform float uTime;',
        'varying vec3 vPos;',
        'varying vec3 vNormal;',
        '',
        ultraNoiseGLSL,
        '',
        'void main(){',
        '  float radius = length(vPos.xz);',
        '  float angle = atan(vPos.z, vPos.x);',
        '',
        '  // ISCO (Innermost Stable Circular Orbit) at ~3 Schwarzschild radii',
        '  float rISCO = 2.5;',
        '  float rOuter = 9.0;',
        '  float normR = (radius - rISCO) / (rOuter - rISCO);',
        '  normR = clamp(normR, 0.0, 1.0);',
        '',
        '  // Effective temperature: T ~ r^(-3/4) (Shakura-Sunyaev thin disk)',
        '  float temp = pow(max(1.0 - normR, 0.01), 0.75);',
        '',
        '  // Keplerian orbital velocity for Doppler effect',
        '  float orbitalV = 1.0 / sqrt(max(radius, rISCO));',
        '  // Doppler beaming: approaching side boosted by D^3',
        '  float dopplerShift = 1.0 + orbitalV * sin(angle + uTime * orbitalV * 3.0) * 0.6;',
        '  float dopplerBoost = pow(dopplerShift, 3.0);',
        '',
        '  // Gravitational redshift: stronger near ISCO',
        '  float gravRedshift = sqrt(1.0 - rISCO / max(radius, rISCO + 0.1));',
        '',
        '  // MHD turbulence: single noise call for performance',
        '  float turbulence = 1.0 + snoise(vec3(angle * 5.0, radius * 3.0, uTime * 1.2)) * 0.2;',
        '',
        '  // Magnetic hotspots: subtle bright flares',
        '  float hotspot1 = exp(-pow(mod(angle - uTime * 1.8, 6.283), 2.0) * 5.0 - pow(normR - 0.2, 2.0) * 25.0) * 0.6;',
        '  float hotspot2 = exp(-pow(mod(angle - uTime * 1.2 + 2.1, 6.283), 2.0) * 6.0 - pow(normR - 0.35, 2.0) * 20.0) * 0.3;',
        '',
        '  // Planck blackbody approximation colors',
        '  // 60000K (inner): warm-white, 8000K (mid): white, 2500K (outer): deep red',
        '  vec3 col60k = vec3(1.0, 0.92, 0.78);',    // Very hot warm-white
        '  vec3 col12k = vec3(0.95, 0.92, 0.88);',   // White
        '  vec3 col5k  = vec3(1.0, 0.65, 0.25);',    // Yellow-orange
        '  vec3 col2k  = vec3(0.6, 0.08, 0.01);',    // Deep red/IR
        '',
        '  vec3 col = col2k;',
        '  col = mix(col, col5k, smoothstep(0.0, 0.3, temp));',
        '  col = mix(col, col12k, smoothstep(0.3, 0.65, temp));',
        '  col = mix(col, col60k, smoothstep(0.75, 1.0, temp));',
        '',
        '  // Apply gravitational redshift (shifts colors toward red)',
        '  col = mix(col * vec3(1.2, 0.8, 0.6), col, gravRedshift);',
        '',
        '  float brightness = turbulence * dopplerBoost * gravRedshift;',
        '  brightness += hotspot1 + hotspot2;',
        '',
        '  // Opacity: thin disk falloff at edges',
        '  float innerEdge = smoothstep(rISCO, rISCO + 1.2, radius);',
        '  float outerEdge = smoothstep(rOuter, rOuter - 2.5, radius);',
        '  float alpha = innerEdge * outerEdge * min(brightness, 1.0) * 0.85;',
        '',
        '  // ISCO plunge: matter brightens as it falls past ISCO',
        '  float plungeGlow = exp(-(radius - rISCO) * 3.0) * 0.4;',
        '  col += vec3(0.55, 0.38, 0.12) * plungeGlow;',
        '',
        '  gl_FragColor = vec4(col * brightness, alpha);',
        '}'
    ].join('\n');

    // ── Black Hole Event Horizon Shader ──
    var blackHoleVertexShader = [
        'varying vec3 vNormal;',
        'varying vec3 vViewDir;',
        'void main(){',
        '  vNormal = normalize(normalMatrix * normal);',
        '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
        '  vViewDir = normalize(-mvPos.xyz);',
        '  gl_Position = projectionMatrix * mvPos;',
        '}'
    ].join('\n');

    var blackHoleFragmentShader = [
        'varying vec3 vNormal;',
        'varying vec3 vViewDir;',
        'uniform float uTime;',
        'void main(){',
        '  float cosAngle = abs(dot(vNormal, vViewDir));',
        '  float fresnel = pow(1.0 - cosAngle, 4.0);',
        '',
        '  // Pure black interior: absorbs everything',
        '  // Only the photon sphere rim emits (gravitationally lensed photons)',
        '  float photonSphere = pow(fresnel, 12.0);',
        '  // Thin bright ring: photons orbiting at 1.5 Schwarzschild radii',
        '  vec3 rimColor = vec3(0.85, 0.65, 0.4) * photonSphere * 0.8;',
        '',
        '  // Subtle scattered disk light near the rim',
        '  float diskScatter = pow(fresnel, 5.0) * 0.1;',
        '  rimColor += vec3(0.9, 0.5, 0.2) * diskScatter;',
        '',
        '  // Hard black center: event horizon absorbs all',
        '  float alpha = 0.99;',
        '  gl_FragColor = vec4(rimColor, alpha);',
        '}'
    ].join('\n');

    // ── Relativistic Jet Shader ──
    var jetVertexShader = [
        'attribute float aOffset;',
        'attribute float aSpeed;',
        'varying float vAlpha;',
        'varying vec3 vColor;',
        'uniform float uTime;',
        'uniform float uPixelRatio;',
        'void main(){',
        '  float t = mod(uTime * aSpeed * 0.6 + aOffset, 1.0);',
        '  vec3 pos = position;',
        '  // Collimated jet: tight cone opening angle (~5 degrees)',
        '  float coneAngle = t * 0.08;',
        '  pos.y = pos.y > 0.0 ? t * 50.0 : -t * 50.0;',
        '  pos.x += sin(aOffset * 6.28) * coneAngle * 8.0;',
        '  pos.z += cos(aOffset * 6.28) * coneAngle * 8.0;',
        '  // Knots: periodic brightness (internal shocks)',
        '  float knot = pow(max(sin(t * 18.0 + aOffset * 3.14), 0.0), 4.0);',
        '  vAlpha = ((1.0 - t) * (1.0 - t) * 0.3 + knot * 0.2) * 0.5;',
        '  // Warm neutral jet, fading toward the dark background',
        '  vColor = mix(vec3(0.16, 0.12, 0.07), vec3(1.0, 0.86, 0.58), (1.0 - t) * (1.0 - t));',
        '  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);',
        '  gl_PointSize = (1.5 + knot * 2.0) * uPixelRatio * (100.0 / -mvPos.z);',
        '  gl_Position = projectionMatrix * mvPos;',
        '}'
    ].join('\n');

    var jetFragmentShader = [
        'varying float vAlpha;',
        'varying vec3 vColor;',
        'void main(){',
        '  float d = length(gl_PointCoord - vec2(0.5));',
        '  if(d > 0.5) discard;',
        '  float glow = exp(-d * d * 12.0);',
        '  gl_FragColor = vec4(vColor * glow, glow * vAlpha);',
        '}'
    ].join('\n');

    // (Shockwave rings removed — looked unrealistic)

    // ── Gravitational Lensing Post-Processing Shader ──
    var lensingFragmentShader = [
        'uniform sampler2D tDiffuse;',
        'uniform vec2 uCenter;',
        'uniform float uStrength;',
        'uniform float uRadius;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec2 dir = vUv - uCenter;',
        '  float dist = length(dir);',
        '  // Gravitational lens: bend light around center',
        '  float influence = smoothstep(uRadius, 0.0, dist);',
        '  float distortion = uStrength * influence * influence;',
        '  // Einstein ring: push light outward near center, pull inward further out',
        '  vec2 offset = normalize(dir + vec2(0.0001)) * distortion;',
        '  // Add slight rotation for frame-dragging effect',
        '  float rot = distortion * 0.5;',
        '  vec2 rotOffset = vec2(',
        '    offset.x * cos(rot) - offset.y * sin(rot),',
        '    offset.x * sin(rot) + offset.y * cos(rot)',
        '  );',
        '  vec2 uv = vUv - rotOffset;',
        '  vec4 color = texture2D(tDiffuse, uv);',
        '  // Amplify brightness near lensing zone (magnification)',
        '  color.rgb *= 1.0 + influence * 0.4;',
        '  // Subtle chromatic split in lensing zone',
        '  if(influence > 0.1){',
        '    float chromOffset = distortion * 0.3;',
        '    color.r = texture2D(tDiffuse, uv + normalize(dir) * chromOffset).r;',
        '    color.b = texture2D(tDiffuse, uv - normalize(dir) * chromOffset).b;',
        '  }',
        '  gl_FragColor = color;',
        '}'
    ].join('\n');

    // ── God Rays Post-Processing ──
    var godRayFragmentShader = [
        'uniform sampler2D tDiffuse;',
        'uniform vec2 uLightPos;',
        'uniform float uExposure;',
        'uniform float uDecay;',
        'uniform float uDensity;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec2 texCoord = vUv;',
        '  vec2 delta = (texCoord - uLightPos) * (1.0 / 24.0) * uDensity;',
        '  vec4 color = texture2D(tDiffuse, texCoord);',
        '  // Extract bright areas only',
        '  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));',
        '  vec4 rays = vec4(0.0);',
        '  float decay = 1.0;',
        '  vec2 tc = texCoord;',
        '  for(int i = 0; i < 24; i++){',
        '    tc -= delta;',
        '    vec4 s = texture2D(tDiffuse, tc);',
        '    float sLum = dot(s.rgb, vec3(0.299, 0.587, 0.114));',
        '    s *= step(0.5, sLum);',
        '    s *= decay;',
        '    rays += s;',
        '    decay *= uDecay;',
        '  }',
        '  gl_FragColor = color + rays * uExposure;',
        '}'
    ].join('\n');

    var postVertexShader = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }';

    // ═══════════════════════════════════════
    //  CONTROL FUNCTIONS
    // ═══════════════════════════════════════

    window.apGxToggleForceGraph = function(btn) {
        apGxState.forceGraphMode = !apGxState.forceGraphMode;
        btn.classList.toggle('active');

        var galaxyCanvas = document.getElementById('apGxContainer');
        var fgContainer = document.getElementById('apGxForceGraphContainer');

        if (apGxState.forceGraphMode) {
            // Switch to force graph mode
            if (galaxyCanvas) galaxyCanvas.style.display = 'none';
            if (fgContainer) {
                fgContainer.style.display = 'block';
                apGxInitForceGraph(fgContainer);
            }
            // Pause galaxy animation
            if (apGxState.animId) {
                cancelAnimationFrame(apGxState.animId);
                apGxState.animId = null;
            }
        } else {
            // Switch back to galaxy
            if (fgContainer) fgContainer.style.display = 'none';
            if (galaxyCanvas) galaxyCanvas.style.display = 'block';
            apGxDestroyForceGraph();
            // Resume galaxy animation
            if (apGxState.scene && apGxState._animateFn) {
                apGxState._animateFn();
            }
        }
    };

    window.apGxToggleWarp = function(btn) {
        apGxState.warpActive = !apGxState.warpActive;
        btn.classList.toggle('active');
    };

    // ═══════════════════════════════════════
    //  FORCE GRAPH
    // ═══════════════════════════════════════

    function apGxInitForceGraph(container) {
        if (typeof ForceGraph3D === 'undefined') {
            // Lazy-load the library on first use
            container.innerHTML = '<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⏳</div>3D Force Graph wird geladen…</div>';
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/3d-force-graph@1.73.0/dist/3d-force-graph.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = function() { apGxInitForceGraph(container); };
            script.onerror = function() {
                container.innerHTML = '<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⚠️</div>Force Graph konnte nicht geladen werden.</div>';
            };
            document.head.appendChild(script);
            return;
        }

        var entries = (typeof apEntries === 'function') ? apEntries() : [];
        var range = apGxState.range;
        var filtered = range > 0 ? entries.slice(-range) : entries;
        if (!filtered.length) {
            container.innerHTML = '<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">🔗</div>Keine Daten für Neural Graph</div>';
            return;
        }

        container.innerHTML = '';

        var colorMap = {
            work: '#f8fafc', school: '#f59e0b', vacation: '#94a3b8',
            holiday: '#94a3b8', gleittag: '#94a3b8', sick: '#ef4444'
        };

        // Build nodes
        var nodes = filtered.map(function(e, i) {
            var hours = e.worked || 0;
            var expected = e.expected || 8;
            var ratio = expected > 0 ? hours / expected : 0;
            var nodeColor = colorMap[e.type] || '#f8fafc';
            if (e.type === 'work') {
                if (ratio >= 1.0) nodeColor = '#22c55e';
                else if (ratio < 0.4) nodeColor = '#ef4444';
                else if (ratio < 0.7) nodeColor = '#f59e0b';
            }
            return {
                id: i,
                date: e.date,
                type: e.type || 'work',
                hours: hours,
                project: e.project || '',
                val: Math.max(1, hours * 2),
                color: nodeColor,
                label: new Date(e.date).toLocaleDateString(mwlLocale(), { day: '2-digit', month: 'short' })
            };
        });

        // Build links
        var links = [];
        for (var i = 1; i < nodes.length; i++) {
            var prev = nodes[i - 1], curr = nodes[i];
            var d1 = new Date(prev.date), d2 = new Date(curr.date);
            var dayDiff = Math.abs(d2 - d1) / 86400000;
            // Connect consecutive days
            if (dayDiff <= 2) {
                links.push({ source: prev.id, target: curr.id, color: 'rgba(255,255,255,0.14)', width: 0.5 });
            }
            // Connect same-project entries
            if (prev.project && prev.project === curr.project && dayDiff < 14) {
                links.push({ source: prev.id, target: curr.id, color: 'rgba(34,197,94,0.2)', width: 1 });
            }
        }

        // Cross-connect same projects (not just adjacent)
        var projectMap = {};
        nodes.forEach(function(n) {
            if (n.project) {
                if (!projectMap[n.project]) projectMap[n.project] = [];
                projectMap[n.project].push(n.id);
            }
        });
        Object.keys(projectMap).forEach(function(proj) {
            var ids = projectMap[proj];
            for (var j = 1; j < ids.length && j < 8; j++) {
                links.push({
                    source: ids[j - 1], target: ids[j],
                    color: 'rgba(6,182,212,0.1)', width: 0.3
                });
            }
        });

        var isLight = document.documentElement.getAttribute('data-theme') === 'light';

        var fg = ForceGraph3D({ controlType: 'orbit' })(container)
            .graphData({ nodes: nodes, links: links })
            .nodeVal('val')
            .nodeColor('color')
            .nodeOpacity(0.9)
            .nodeLabel(function(n) {
                return '<div style="background:rgba(0,0,0,0.85);color:#fff;padding:8px 12px;border-radius:10px;font-size:13px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.18)">' +
                    '<strong>' + n.label + '</strong><br>' +
                    '<span style="color:' + n.color + '">' + n.hours.toFixed(1) + 'h</span> · ' +
                    (n.project ? '<span style="opacity:0.7">' + n.project + '</span>' : n.type) +
                    '</div>';
            })
            .linkColor('color')
            .linkWidth('width')
            .linkDirectionalParticles(2)
            .linkDirectionalParticleWidth(0.8)
            .linkDirectionalParticleColor(function() { return 'rgba(255,255,255,0.3)'; })
            .backgroundColor(isLight ? '#f8fafc' : '#030305')
            .showNavInfo(false)
            .warmupTicks(80)
            .cooldownTime(3000);

        // Customize Three.js scene
        var scene = fg.scene();
        if (scene) {
            scene.fog = new THREE.FogExp2(isLight ? 0xf8fafc : 0x030305, 0.002);
        }

        // Add bloom-like glow via renderer
        var renderer = fg.renderer();
        if (renderer) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
        }

        apGxState.forceGraphInstance = fg;
    }

    function apGxDestroyForceGraph() {
        if (apGxState.forceGraphInstance) {
            apGxState.forceGraphInstance.pauseAnimation();
            apGxState.forceGraphInstance._destructor && apGxState.forceGraphInstance._destructor();
            apGxState.forceGraphInstance = null;
        }
        var fgContainer = document.getElementById('apGxForceGraphContainer');
        if (fgContainer) fgContainer.innerHTML = '';
    }

    // ═══════════════════════════════════════
    //  ENHANCED CLEANUP
    // ═══════════════════════════════════════
    var _origCleanup = apGxCleanup;
    apGxCleanup = function() {
        // Destroy force graph if active
        apGxDestroyForceGraph();
        apGxState.forceGraphMode = false;
        apGxState.volumetricNebula = null;
        apGxState.accretionDisk = null;
        apGxState.accretionGroup = null;
        apGxState.lensingPass = null;
        apGxState.warpActive = false;
        apGxState.jetParticles = null;
        apGxState._animateFn = null;
        // Call original cleanup
        _origCleanup();
    };

    // ═══════════════════════════════════════
    //  OVERRIDE: apRenderGalaxy
    //  Complete replacement with ultra effects
    // ═══════════════════════════════════════
    apRenderGalaxy = function() {
        if (typeof THREE === 'undefined') {
            var c = document.getElementById('apGxContainer');
            if (c) c.innerHTML = '<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⏳</div>Three.js wird geladen…</div>';
            _loadThreeJS(function(ready) {
                if (ready) {
                    apRenderGalaxy();
                } else if (c) {
                    c.innerHTML = '<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">!</div>Three.js konnte nicht geladen werden.</div>';
                }
            });
            return;
        }
        apGxCleanup();

        // Reset force graph UI
        var fgContainer = document.getElementById('apGxForceGraphContainer');
        if (fgContainer) fgContainer.style.display = 'none';
        var galaxyCanvas = document.getElementById('apGxContainer');
        if (galaxyCanvas) galaxyCanvas.style.display = 'block';
        var neuralBtn = document.getElementById('apGxNeuralBtn');
        if (neuralBtn) neuralBtn.classList.remove('active');

        var entries = (typeof apEntries === 'function') ? apEntries() : [];
        if (!entries.length) {
            document.getElementById('apGxContainer').innerHTML = '<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">🌌</div>Noch keine Daten für Galaxy</div>';
            return;
        }

        var range = apGxState.range;
        var filtered = range > 0 ? entries.slice(-range) : entries;
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';

        var container = document.getElementById('apGxContainer');
        var w = container.clientWidth, h = container.clientHeight;

        // ── Scene ──
        var scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(isLight ? 0xf8fafc : 0x030305, 0.0018);

        // ── Camera ──
        var camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 3000);
        camera.position.set(0, 40, 65);
        camera.lookAt(0, 0, 0);

        // ── Renderer ──
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        } catch (e) {
            console.warn('[Galaxy Ultra] WebGL init failed:', e.message);
        }
        if (!renderer) {
            container.innerHTML = '<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⚠️</div>WebGL nicht verfügbar.</div>';
            return;
        }
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.45;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.setClearColor(isLight ? 0xf8fafc : 0x030305, 1);
        container.appendChild(renderer.domElement);

        // ── Controls ──
        var OC = THREE.OrbitControls || (window.THREE && window.THREE.OrbitControls);
        if (!OC) { container.innerHTML = '<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">🔄</div>Controls laden… F5</div>'; renderer.dispose(); return; }
        var controls = new OC(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.04;
        controls.minDistance = 8;
        controls.maxDistance = 200;
        controls.autoRotate = !!window._apGxInitSettings.orbit;
        controls.autoRotateSpeed = 0.3;
        controls.maxPolarAngle = Math.PI * 0.85;
        controls.minPolarAngle = Math.PI * 0.15;

        var nebulaMat = { uniforms: { uTime: { value: 0 }, uCamPos: { value: { copy: function(){} } } } };
        apGxState.volumetricNebula = nebulaMat;

        // ════════════════════════════════════
        // 2. BLACK HOLE + ACCRETION DISK
        // ════════════════════════════════════
        var bhGroup = new THREE.Group();

        // Event horizon sphere (absorbs all light)
        var bhGeo = new THREE.SphereGeometry(1.6, 64, 64);
        var bhMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: blackHoleVertexShader,
            fragmentShader: blackHoleFragmentShader,
            transparent: true,
            depthWrite: true
        });
        bhGroup.add(new THREE.Mesh(bhGeo, bhMat));

        // Soft ambient glow — single canvas sprite, no rings or disks
        var bhGlowCanvas = document.createElement('canvas');
        bhGlowCanvas.width = 128; bhGlowCanvas.height = 128;
        var bhGCtx = bhGlowCanvas.getContext('2d');
        var bhGrad = bhGCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        bhGrad.addColorStop(0,   'rgba(255,255,255,0.1)');
        bhGrad.addColorStop(0.4, 'rgba(245,158,11,0.04)');
        bhGrad.addColorStop(1,   'rgba(0,0,0,0)');
        bhGCtx.fillStyle = bhGrad;
        bhGCtx.fillRect(0, 0, 128, 128);
        var bhGlowTex = new THREE.CanvasTexture(bhGlowCanvas);
        var bhGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: bhGlowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        bhGlowSprite.scale.set(14, 14, 1);
        bhGroup.add(bhGlowSprite);
        var diskMat = null;
        var innerDiskMat = null;

        // Core light
        var coreLight = new THREE.PointLight(0xf8fafc, 0.8, 60, 2);
        bhGroup.add(coreLight);

        scene.add(bhGroup);
        apGxState.accretionGroup = bhGroup;
        apGxState.coreLight = coreLight;

        // ════════════════════════════════════
        // 3. RELATIVISTIC JETS
        // Bipolar plasma jets above/below disk
        // ════════════════════════════════════
        var jetCount = 600;
        var jetGeo = new THREE.BufferGeometry();
        var jetPositions = new Float32Array(jetCount * 3);
        var jetOffsets = new Float32Array(jetCount);
        var jetSpeeds = new Float32Array(jetCount);

        for (var ji = 0; ji < jetCount; ji++) {
            var jAngle = Math.random() * Math.PI * 2;
            var jSpread = Math.random() * 0.8;
            // Half go up, half go down
            jetPositions[ji * 3] = Math.cos(jAngle) * jSpread;
            jetPositions[ji * 3 + 1] = ji < jetCount / 2 ? 1.0 : -1.0;
            jetPositions[ji * 3 + 2] = Math.sin(jAngle) * jSpread;
            jetOffsets[ji] = Math.random();
            jetSpeeds[ji] = 0.3 + Math.random() * 0.7;
        }

        jetGeo.setAttribute('position', new THREE.BufferAttribute(jetPositions, 3));
        jetGeo.setAttribute('aOffset', new THREE.BufferAttribute(jetOffsets, 1));
        jetGeo.setAttribute('aSpeed', new THREE.BufferAttribute(jetSpeeds, 1));

        var jetMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: jetVertexShader,
            fragmentShader: jetFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        var jetSystem = new THREE.Points(jetGeo, jetMat);
        scene.add(jetSystem);
        apGxState.jetParticles = jetMat;

        // ════════════════════════════════════
        // (Shockwave pulse rings removed — looked unrealistic)

        // ════════════════════════════════════
        // 5. BACKGROUND STAR FIELD (12000 stars)
        // ════════════════════════════════════
        var bgCount = 5000;
        var bgGeo = new THREE.BufferGeometry();
        var bgPositions = new Float32Array(bgCount * 3);
        var bgColors = new Float32Array(bgCount * 3);
        var bgSizes = new Float32Array(bgCount);
        var bgPhases = new Float32Array(bgCount);

        for (var bi = 0; bi < bgCount; bi++) {
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.acos(2 * Math.random() - 1);
            var bRadius = 100 + Math.random() * 600;
            bgPositions[bi * 3] = bRadius * Math.sin(phi) * Math.cos(theta);
            bgPositions[bi * 3 + 1] = bRadius * Math.sin(phi) * Math.sin(theta) * (0.3 + Math.random() * 0.7);
            bgPositions[bi * 3 + 2] = bRadius * Math.cos(phi);

            var temp = Math.random();
            // HR-diagram realistic distribution: 76% M-dwarf, 12% K, 8% G, 3% F, 1% A/B/O
            if (temp < 0.01) { bgColors[bi * 3] = 1.0; bgColors[bi * 3 + 1] = 0.86; bgColors[bi * 3 + 2] = 0.62; }       // O/B warm white (rare)
            else if (temp < 0.04) { bgColors[bi * 3] = 1.0; bgColors[bi * 3 + 1] = 0.9; bgColors[bi * 3 + 2] = 0.72; }   // A warm white
            else if (temp < 0.12) { bgColors[bi * 3] = 0.97; bgColors[bi * 3 + 1] = 0.95; bgColors[bi * 3 + 2] = 0.9; }   // F yellow-white
            else if (temp < 0.24) { bgColors[bi * 3] = 1.0; bgColors[bi * 3 + 1] = 0.89; bgColors[bi * 3 + 2] = 0.7; }    // G solar yellow
            else if (temp < 0.36) { bgColors[bi * 3] = 1.0; bgColors[bi * 3 + 1] = 0.72; bgColors[bi * 3 + 2] = 0.45; }   // K orange
            else { bgColors[bi * 3] = 1.0; bgColors[bi * 3 + 1] = 0.55; bgColors[bi * 3 + 2] = 0.3; }                     // M red dwarf (majority)

            bgSizes[bi] = 0.3 + Math.pow(Math.random(), 3) * 2.5;
            bgPhases[bi] = Math.random() * Math.PI * 2;
        }

        bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
        bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
        bgGeo.setAttribute('aSize', new THREE.BufferAttribute(bgSizes, 1));
        bgGeo.setAttribute('aPhase', new THREE.BufferAttribute(bgPhases, 1));

        var bgStarMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'attribute float aPhase;',
                'varying vec3 vColor;',
                'varying float vBrightness;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'void main(){',
                '  vColor = color;',
                '  float twinkle = sin(uTime * 1.5 + aPhase) * sin(uTime * 2.7 + aPhase * 1.3) * 0.3 + 0.7;',
                '  twinkle *= sin(uTime * 0.5 + aPhase * 0.7) * 0.15 + 0.85;',
                '  vBrightness = twinkle;',
                '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPos.z) * twinkle;',
                '  gl_PointSize = max(gl_PointSize, 0.5);',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vBrightness;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float core = exp(-dist * dist * 80.0);',
                '  float halo = exp(-dist * dist * 8.0) * 0.3;',
                '  float brightness = (core + halo) * vBrightness;',
                '  vec3 col = vColor * brightness;',
                '  col += vec3(1.0) * core * core * 0.5;',
                '  gl_FragColor = vec4(col, brightness);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        scene.add(new THREE.Points(bgGeo, bgStarMat));

        // ════════════════════════════════════
        // 6. SPIRAL ARM PARTICLES (15000)
        // Enhanced with warp-speed mode
        // ════════════════════════════════════
        var spiralCount = 7000;
        var spiralGeo = new THREE.BufferGeometry();
        var spiralPositions = new Float32Array(spiralCount * 3);
        var spiralColors = new Float32Array(spiralCount * 3);
        var spiralSizes = new Float32Array(spiralCount);
        var spiralVelocities = new Float32Array(spiralCount);
        var spiralPhases = new Float32Array(spiralCount);

        for (var sp = 0; sp < spiralCount; sp++) {
            var arm = sp % 4;
            var t = Math.pow(sp / spiralCount, 0.7) * Math.PI * 5;
            var baseRadius = 3 + t * 2.2;
            var armOffset = arm * (Math.PI * 2 / 4);
            var scatter = (Math.random() - 0.5) * (1.5 + t * 0.4) * (0.5 + Math.random());
            var yScatter = (Math.random() - 0.5) * (0.8 + baseRadius * 0.02);

            spiralPositions[sp * 3] = Math.cos(t + armOffset) * baseRadius + scatter;
            spiralPositions[sp * 3 + 1] = yScatter;
            spiralPositions[sp * 3 + 2] = Math.sin(t + armOffset) * baseRadius + scatter;

            var distFC = baseRadius / 50;
            var cNoise = Math.random() * 0.2;
            if (distFC < 0.3) {
                spiralColors[sp * 3] = 0.55 + cNoise * 0.3; spiralColors[sp * 3 + 1] = 0.2 + cNoise; spiralColors[sp * 3 + 2] = 0.9 + cNoise * 0.1;
            } else if (distFC < 0.6) {
                spiralColors[sp * 3] = 0.6 + cNoise; spiralColors[sp * 3 + 1] = 0.25; spiralColors[sp * 3 + 2] = 0.85 + cNoise * 0.5;
            } else {
                spiralColors[sp * 3] = 0.3 + cNoise; spiralColors[sp * 3 + 1] = 0.4 + cNoise; spiralColors[sp * 3 + 2] = 0.9 + cNoise * 0.5;
            }

            spiralSizes[sp] = 0.3 + Math.random() * 0.8 + (distFC < 0.3 ? 0.4 : 0);
            spiralVelocities[sp] = 1.0 / Math.sqrt(Math.max(baseRadius, 3)) * 0.15;
            spiralPhases[sp] = Math.random() * Math.PI * 2;
        }

        spiralGeo.setAttribute('position', new THREE.BufferAttribute(spiralPositions, 3));
        spiralGeo.setAttribute('color', new THREE.BufferAttribute(spiralColors, 3));
        spiralGeo.setAttribute('aSize', new THREE.BufferAttribute(spiralSizes, 1));
        spiralGeo.setAttribute('aVelocity', new THREE.BufferAttribute(spiralVelocities, 1));
        spiralGeo.setAttribute('aPhase', new THREE.BufferAttribute(spiralPhases, 1));

        var spiralMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }, uWarp: { value: 0.0 } },
            vertexShader: [
                'attribute float aSize;',
                'attribute float aVelocity;',
                'attribute float aPhase;',
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'uniform float uWarp;',
                'void main(){',
                '  vColor = color;',
                '  float speed = aVelocity + uWarp * aVelocity * 8.0;',
                '  float angle = speed * uTime;',
                '  float cosA = cos(angle); float sinA = sin(angle);',
                '  vec3 rotated = vec3(',
                '    position.x * cosA - position.z * sinA,',
                '    position.y,',
                '    position.x * sinA + position.z * cosA',
                '  );',
                '  rotated.y += sin(uTime * 0.5 + aPhase) * 0.15;',
                '  // Warp stretch: elongate along direction of motion',
                '  if(uWarp > 0.01){',
                '    float motionAngle = atan(rotated.z, rotated.x);',
                '    rotated.x += cos(motionAngle) * uWarp * 2.0;',
                '    rotated.z += sin(motionAngle) * uWarp * 2.0;',
                '  }',
                '  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);',
                '  float warpSize = 1.0 + uWarp * 3.0;',
                '  gl_PointSize = aSize * uPixelRatio * (180.0 / -mvPos.z) * warpSize;',
                '  gl_PointSize = max(gl_PointSize, 0.3);',
                '  float dist = length(rotated.xz);',
                '  vAlpha = (0.5 * (1.0 - smoothstep(0.0, 60.0, dist)) + 0.1) * (1.0 + uWarp * 2.0);',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float glow = exp(-dist * dist * 18.0);',
                '  float softEdge = 1.0 - smoothstep(0.0, 0.5, dist);',
                '  float brightness = glow * 0.8 + softEdge * 0.2;',
                '  gl_FragColor = vec4(vColor * brightness, brightness * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        scene.add(new THREE.Points(spiralGeo, spiralMat));

        // ════════════════════════════════════
        // 7. COSMIC DUST LANES (3000)
        // ════════════════════════════════════
        var dustCount = 3000;
        var dustGeo = new THREE.BufferGeometry();
        var dustPositions = new Float32Array(dustCount * 3);
        var dustSizes = new Float32Array(dustCount);

        for (var dl = 0; dl < dustCount; dl++) {
            var dArm = dl % 4;
            var dT = Math.pow(dl / dustCount, 0.6) * Math.PI * 5;
            var dR = 5 + dT * 2.0;
            var dOff = dArm * (Math.PI / 2) + 0.3;
            var dScatter = (Math.random() - 0.5) * (1.0 + dT * 0.2);

            dustPositions[dl * 3] = Math.cos(dT + dOff) * dR + dScatter;
            dustPositions[dl * 3 + 1] = (Math.random() - 0.5) * 0.6;
            dustPositions[dl * 3 + 2] = Math.sin(dT + dOff) * dR + dScatter;
            dustSizes[dl] = 1.0 + Math.random() * 3.0;
        }

        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));

        var dustMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'varying float vAlpha;',
                'void main(){',
                '  float angle = 0.02 * uTime / max(length(position.xz), 3.0);',
                '  float cosA = cos(angle); float sinA = sin(angle);',
                '  vec3 rotated = vec3(position.x * cosA - position.z * sinA, position.y, position.x * sinA + position.z * cosA);',
                '  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPos.z);',
                '  float dist = length(rotated.xz);',
                '  vAlpha = 0.25 * (1.0 - smoothstep(5.0, 55.0, dist));',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying float vAlpha;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float soft = 1.0 - smoothstep(0.0, 0.5, dist);',
                '  gl_FragColor = vec4(0.0, 0.0, 0.02, soft * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
        scene.add(new THREE.Points(dustGeo, dustMat));

        // ════════════════════════════════════
        // 8. EMISSION NEBULAE (1500)
        // ════════════════════════════════════
        var emCount = 1500;
        var emGeo = new THREE.BufferGeometry();
        var emPositions = new Float32Array(emCount * 3);
        var emColors = new Float32Array(emCount * 3);
        var emSizes = new Float32Array(emCount);

        for (var em = 0; em < emCount; em++) {
            var emArm = em % 4;
            var emT = Math.pow(em / emCount, 0.8) * Math.PI * 4.5;
            var emR = 6 + emT * 1.8;
            var emOff = emArm * (Math.PI / 2);
            var emScatter = (Math.random() - 0.5) * (2.0 + emT * 0.3);

            emPositions[em * 3] = Math.cos(emT + emOff) * emR + emScatter;
            emPositions[em * 3 + 1] = (Math.random() - 0.5) * 1.2;
            emPositions[em * 3 + 2] = Math.sin(emT + emOff) * emR + emScatter;

            var emType = Math.random();
            if (emType < 0.45) { emColors[em * 3] = 1.0; emColors[em * 3 + 1] = 0.3; emColors[em * 3 + 2] = 0.5; }
            else if (emType < 0.75) { emColors[em * 3] = 0.1; emColors[em * 3 + 1] = 0.8; emColors[em * 3 + 2] = 0.7; }
            else { emColors[em * 3] = 0.9; emColors[em * 3 + 1] = 0.15; emColors[em * 3 + 2] = 0.15; }

            emSizes[em] = 2.0 + Math.random() * 5.0;
        }

        emGeo.setAttribute('position', new THREE.BufferAttribute(emPositions, 3));
        emGeo.setAttribute('color', new THREE.BufferAttribute(emColors, 3));
        emGeo.setAttribute('aSize', new THREE.BufferAttribute(emSizes, 1));

        var emMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'void main(){',
                '  vColor = color;',
                '  float angle = 0.03 * uTime / max(length(position.xz), 4.0);',
                '  float cosA = cos(angle); float sinA = sin(angle);',
                '  vec3 rotated = vec3(position.x * cosA - position.z * sinA, position.y + sin(uTime * 0.3 + position.x * 0.5) * 0.2, position.x * sinA + position.z * cosA);',
                '  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (140.0 / -mvPos.z);',
                '  float dist = length(rotated.xz);',
                '  vAlpha = 0.08 * (1.0 - smoothstep(5.0, 50.0, dist));',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float glow = exp(-dist * dist * 6.0);',
                '  gl_FragColor = vec4(vColor * glow, glow * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        scene.add(new THREE.Points(emGeo, emMat));

        // ════════════════════════════════════
        // 9. INTERSTELLAR HAZE (5000)
        // ════════════════════════════════════
        var hazeCount = 5000;
        var hazeGeo = new THREE.BufferGeometry();
        var hazePositions = new Float32Array(hazeCount * 3);
        var hazeColors = new Float32Array(hazeCount * 3);
        var hazeSizes = new Float32Array(hazeCount);

        for (var hz = 0; hz < hazeCount; hz++) {
            var hAngle = Math.random() * Math.PI * 2;
            var hRadius = 2 + Math.random() * 48;
            hazePositions[hz * 3] = Math.cos(hAngle) * hRadius + (Math.random() - 0.5) * 5;
            hazePositions[hz * 3 + 1] = (Math.random() - 0.5) * 3;
            hazePositions[hz * 3 + 2] = Math.sin(hAngle) * hRadius + (Math.random() - 0.5) * 5;

            var hDist = hRadius / 48;
            hazeColors[hz * 3] = 0.5 + hDist * 0.2;
            hazeColors[hz * 3 + 1] = 0.2 + hDist * 0.15;
            hazeColors[hz * 3 + 2] = 0.8 + hDist * 0.2;
            hazeSizes[hz] = 0.5 + Math.random() * 1.5;
        }

        hazeGeo.setAttribute('position', new THREE.BufferAttribute(hazePositions, 3));
        hazeGeo.setAttribute('color', new THREE.BufferAttribute(hazeColors, 3));
        hazeGeo.setAttribute('aSize', new THREE.BufferAttribute(hazeSizes, 1));

        var hazeMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'void main(){',
                '  vColor = color;',
                '  float speed = 0.015 / max(length(position.xz), 2.0);',
                '  float angle = speed * uTime;',
                '  float cosA = cos(angle); float sinA = sin(angle);',
                '  vec3 rotated = vec3(position.x*cosA - position.z*sinA, position.y, position.x*sinA + position.z*cosA);',
                '  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (120.0 / -mvPos.z);',
                '  float dist = length(rotated.xz);',
                '  vAlpha = 0.12 * (1.0 - smoothstep(0.0, 50.0, dist));',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float soft = exp(-dist * dist * 10.0);',
                '  gl_FragColor = vec4(vColor * soft * 0.6, soft * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        scene.add(new THREE.Points(hazeGeo, hazeMat));

        // ════════════════════════════════════
        // 10. DATA STARS — Interactive work entries
        // ════════════════════════════════════
        var stars = [];
        var colorMapData = {
            'superstar': { hex: 0x22c55e, rgba: 'rgba(34,197,94,1)', spikes: 6 },
            'normal': { hex: 0xf8fafc, rgba: 'rgba(248,250,252,1)', spikes: 4 },
            'low': { hex: 0xf59e0b, rgba: 'rgba(245,158,11,1)', spikes: 4 },
            'red': { hex: 0xef4444, rgba: 'rgba(239,68,68,1)', spikes: 4 },
            'school': { hex: 0xf59e0b, rgba: 'rgba(245,158,11,1)', spikes: 4 },
            'special': { hex: 0x94a3b8, rgba: 'rgba(148,163,184,1)', spikes: 4 }
        };

        var monthGroups = {};
        filtered.forEach(function(e) {
            var key = e.date.substring(0, 7);
            if (!monthGroups[key]) monthGroups[key] = [];
            monthGroups[key].push(e);
        });
        var monthKeys = Object.keys(monthGroups).sort();

        monthKeys.forEach(function(monthKey, monthIdx) {
            var group = monthGroups[monthKey];
            var armAngleBase = (monthIdx / Math.max(monthKeys.length, 1)) * Math.PI * 4;
            var armRadius = 8 + monthIdx * (38 / Math.max(monthKeys.length, 1));

            group.forEach(function(entry, dayIdx) {
                var hours = entry.worked || 0;
                var expected = entry.expected || 8;
                var ratio = expected > 0 ? hours / expected : 0;
                var type = entry.type || 'work';

                var category;
                if (type === 'school') category = 'school';
                else if (type === 'vacation' || type === 'holiday' || type === 'gleittag') category = 'special';
                else if (type === 'sick') category = 'red';
                else if (ratio >= 1.0) category = 'superstar';
                else if (ratio >= 0.7) category = 'normal';
                else if (ratio >= 0.4) category = 'low';
                else category = 'red';

                var cm = colorMapData[category];
                var dayAngle = armAngleBase + (dayIdx / Math.max(group.length, 1)) * (Math.PI * 2 / Math.max(monthKeys.length, 1)) * 0.8;
                var rJitter = (Math.random() - 0.5) * 3;
                var yJitter = (Math.random() - 0.5) * 2.0;
                var px = Math.cos(dayAngle) * (armRadius + rJitter);
                var py = yJitter;
                var pz = Math.sin(dayAngle) * (armRadius + rJitter);

                var starSize = 0.4 + (hours / 12) * 1.4;
                if (category === 'superstar') starSize *= 1.5;

                var tex = apGxCreateStarTexture(cm.rgba, 256, cm.spikes);
                var spriteMat = new THREE.SpriteMaterial({
                    map: tex, transparent: true, opacity: 0.95,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                var sprite = new THREE.Sprite(spriteMat);
                sprite.scale.set(starSize * 2.8, starSize * 2.8, 1);
                sprite.position.set(px, py, pz);

                sprite.userData = {
                    date: entry.date, hours: hours, expected: expected,
                    type: type, diff: entry.diff || 0, project: entry.project || '',
                    ratio: ratio, category: category, baseScale: starSize * 2.8,
                    dayName: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(entry.date).getDay()]
                };

                scene.add(sprite);
                stars.push(sprite);

                // Superstar corona glow + companions
                if (category === 'superstar') {
                    // Soft radial corona — no ring meshes, pure sprite glow
                    var coronaCanvas = document.createElement('canvas');
                    coronaCanvas.width = 128; coronaCanvas.height = 128;
                    var cCtx = coronaCanvas.getContext('2d');
                    var cr = ((cm.hex >> 16) & 255), cg = ((cm.hex >> 8) & 255), cb = (cm.hex & 255);
                    var cGrad = cCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
                    cGrad.addColorStop(0,   'rgba(' + cr + ',' + cg + ',' + cb + ',0.18)');
                    cGrad.addColorStop(0.35,'rgba(' + cr + ',' + cg + ',' + cb + ',0.07)');
                    cGrad.addColorStop(0.7, 'rgba(' + cr + ',' + cg + ',' + cb + ',0.02)');
                    cGrad.addColorStop(1,   'rgba(0,0,0,0)');
                    cCtx.fillStyle = cGrad;
                    cCtx.fillRect(0, 0, 128, 128);
                    var coronaTex = new THREE.CanvasTexture(coronaCanvas);
                    var coronaSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
                    coronaSprite.scale.set(starSize * 8, starSize * 8, 1);
                    coronaSprite.position.copy(sprite.position);
                    scene.add(coronaSprite);

                    for (var cp = 0; cp < 3; cp++) {
                        var cpAngle = cp * (Math.PI * 2 / 3);
                        var cpDist = starSize * 2.5;
                        var cpSprite = new THREE.Sprite(new THREE.SpriteMaterial({
                            map: apGxCreateStarTexture(cm.rgba, 64, 4),
                            transparent: true, opacity: 0.6,
                            blending: THREE.AdditiveBlending, depthWrite: false
                        }));
                        cpSprite.scale.set(starSize * 0.4, starSize * 0.4, 1);
                        cpSprite.position.set(px + Math.cos(cpAngle) * cpDist, py + (Math.random() - 0.5) * 0.5, pz + Math.sin(cpAngle) * cpDist);
                        scene.add(cpSprite);
                    }
                }
            });
        });

        // ── Month labels ──
        var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        monthKeys.forEach(function(key, mi) {
            var mAngle = (mi / Math.max(monthKeys.length, 1)) * Math.PI * 4;
            var mR = 10 + mi * (38 / Math.max(monthKeys.length, 1));
            var parts = key.split('-');
            var label = monthNames[parseInt(parts[1], 10) - 1] + ' ' + parts[0].substring(2);
            var lCanvas = document.createElement('canvas');
            lCanvas.width = 256; lCanvas.height = 64;
            var lCtx = lCanvas.getContext('2d');

            lCtx.fillStyle = 'rgba(255,255,255,0.06)';
            lCtx.beginPath();
            lCtx.roundRect(28, 14, 200, 36, 18);
            lCtx.fill();

            lCtx.fillStyle = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
            lCtx.font = '600 22px "JetBrains Mono", monospace';
            lCtx.textAlign = 'center';
            lCtx.fillText(label, 128, 38);
            var lTex = new THREE.CanvasTexture(lCanvas);
            var lSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: lTex, transparent: true, depthWrite: false }));
            lSprite.scale.set(6, 1.5, 1);
            lSprite.position.set(Math.cos(mAngle) * (mR + 5), 4.5, Math.sin(mAngle) * (mR + 5));
            scene.add(lSprite);
        });

        // ── Constellation lines ──
        for (var ci = 1; ci < stars.length; ci++) {
            var prev = stars[ci - 1], curr = stars[ci];
            if (prev.userData.type === 'work' && curr.userData.type === 'work') {
                var cd1 = new Date(prev.userData.date), cd2 = new Date(curr.userData.date);
                var cDiff = Math.abs(cd2 - cd1) / 86400000;
                if (cDiff <= 3) {
                    var lineGeo = new THREE.BufferGeometry().setFromPoints([prev.position, curr.position]);
                    var lineMat = new THREE.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false });
                    scene.add(new THREE.Line(lineGeo, lineMat));
                }
            }
        }

        // ════════════════════════════════════
        // POST-PROCESSING PIPELINE (Enhanced)
        // ════════════════════════════════════
        var composer = null;
        var hasPost = typeof THREE.EffectComposer !== 'undefined' && typeof THREE.RenderPass !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined' && typeof THREE.ShaderPass !== 'undefined';
        if (hasPost) {
            composer = new THREE.EffectComposer(renderer);
            composer.addPass(new THREE.RenderPass(scene, camera));

            // 1) Bloom — subtle glow, not blinding
            var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 1.0, 0.4, 0.6);
            bloomPass.threshold = 0.6;
            bloomPass.strength = 0.45;
            bloomPass.radius = 0.3;
            composer.addPass(bloomPass);

            // 2) God Rays — volumetric light from core
            var godRayShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    uLightPos: { value: new THREE.Vector2(0.5, 0.5) },
                    uExposure: { value: 0.06 },
                    uDecay: { value: 0.95 },
                    uDensity: { value: 0.8 }
                },
                vertexShader: postVertexShader,
                fragmentShader: godRayFragmentShader
            };
            var godRayPass = new THREE.ShaderPass(godRayShader);
            composer.addPass(godRayPass);
            apGxState.godRayPass = godRayPass;

            // 3) Gravitational Lensing — space distortion near center
            var lensingShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
                    uStrength: { value: 0.015 },
                    uRadius: { value: 0.25 }
                },
                vertexShader: postVertexShader,
                fragmentShader: lensingFragmentShader
            };
            var lensingPass = new THREE.ShaderPass(lensingShader);
            composer.addPass(lensingPass);
            apGxState.lensingPass = lensingPass;

            // 4) Vignette
            var vignetteShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    uDarkness: { value: 1.8 },
                    uOffset: { value: 0.85 }
                },
                vertexShader: postVertexShader,
                fragmentShader: [
                    'uniform sampler2D tDiffuse;',
                    'uniform float uDarkness;',
                    'uniform float uOffset;',
                    'varying vec2 vUv;',
                    'void main(){',
                    '  vec4 color = texture2D(tDiffuse, vUv);',
                    '  vec2 uv = (vUv - vec2(0.5)) * vec2(uOffset);',
                    '  float vignette = 1.0 - dot(uv, uv);',
                    '  vignette = clamp(pow(vignette, uDarkness), 0.0, 1.0);',
                    '  color.rgb *= mix(0.1, 1.0, vignette);',
                    '  gl_FragColor = color;',
                    '}'
                ].join('\n')
            };
            composer.addPass(new THREE.ShaderPass(vignetteShader));

            apGxState.grainPass = null;
            apGxState.bloomPass = bloomPass;
        }

        // ── Save state ──
        apGxState.scene = scene;
        apGxState.camera = camera;
        apGxState.renderer = renderer;
        apGxState.controls = controls;
        apGxState.composer = composer;
        apGxState.stars = stars;
        apGxState.bgStarMat = bgStarMat;
        apGxState.spiralMat = spiralMat;
        apGxState.dustLaneMat = dustMat;
        apGxState.emMat = emMat;
        apGxState.hazeMat = hazeMat;
        apGxState.bhMat = bhMat;
        apGxState.raycaster = new THREE.Raycaster();
        apGxState.raycaster.params.Points = { threshold: 1 };
        apGxState.mouse = new THREE.Vector2();

        // ── Mouse move ──
        renderer.domElement.addEventListener('mousemove', function(ev) {
            var rect = renderer.domElement.getBoundingClientRect();
            apGxState.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
            apGxState.mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        });

        // ════════════════════════════════════
        // ANIMATION LOOP — Ultra Cinematic
        // ════════════════════════════════════
        var clock = new THREE.Clock();
        var warpLerp = 0;
        var _coreVec = new THREE.Vector3();
        var _lensVec = new THREE.Vector3();

        function animate() {
            apGxState.animId = requestAnimationFrame(animate);
            var elapsed = clock.getElapsedTime();
            controls.update();

            // Warp speed lerp
            var warpTarget = apGxState.warpActive ? 1.0 : 0.0;
            warpLerp += (warpTarget - warpLerp) * 0.03;
            spiralMat.uniforms.uWarp.value = warpLerp;

            // Update all shader uniforms
            bgStarMat.uniforms.uTime.value = elapsed;
            spiralMat.uniforms.uTime.value = elapsed;
            dustMat.uniforms.uTime.value = elapsed;
            emMat.uniforms.uTime.value = elapsed;
            hazeMat.uniforms.uTime.value = elapsed;
            bhMat.uniforms.uTime.value = elapsed;
            jetMat.uniforms.uTime.value = elapsed;

            // Volumetric nebula
            nebulaMat.uniforms.uTime.value = elapsed;
            nebulaMat.uniforms.uCamPos.value.copy(camera.position);

            // Film grain time
            if (apGxState.grainPass) apGxState.grainPass.uniforms.uTime.value = elapsed;

            // God rays: update light position in screen space
            if (apGxState.godRayPass) {
                _coreVec.set(0, 0, 0).project(camera);
                apGxState.godRayPass.uniforms.uLightPos.value.set(
                    _coreVec.x * 0.5 + 0.5,
                    _coreVec.y * 0.5 + 0.5
                );
            }

            // Gravitational lensing: update center in screen space
            if (apGxState.lensingPass) {
                _lensVec.set(0, 0, 0).project(camera);
                apGxState.lensingPass.uniforms.uCenter.value.set(
                    _lensVec.x * 0.5 + 0.5,
                    _lensVec.y * 0.5 + 0.5
                );
                // Stronger lensing when closer
                var camDist = camera.position.length();
                apGxState.lensingPass.uniforms.uStrength.value = 0.015 * Math.max(0, 1.0 - camDist / 200);
            }

            // Black hole group pulse
            var pulse = 1 + Math.sin(elapsed * 1.2) * 0.04 + Math.sin(elapsed * 2.8) * 0.02;
            bhGroup.scale.set(pulse, pulse, pulse);
            coreLight.intensity = 0.8 + Math.sin(elapsed * 1.5) * 0.12 + Math.sin(elapsed * 3.7) * 0.05;


            // Star twinkle
            for (var sti = 0; sti < stars.length; sti++) {
                var s = stars[sti];
                var twk = 1 + Math.sin(elapsed * 2.0 + sti * 0.9) * Math.sin(elapsed * 3.1 + sti * 1.3) * 0.12;
                var bs = s.userData.baseScale;
                s.scale.set(bs * twk, bs * twk, 1);
            }

            // Hover detection
            apGxState.raycaster.setFromCamera(apGxState.mouse, camera);
            var hits = apGxState.raycaster.intersectObjects(stars);
            var infoEl = document.getElementById('apGxInfoOverlay');

            if (apGxState.hoveredStar && apGxState.hoveredStar !== (hits.length > 0 ? hits[0].object : null)) {
                var hbs = apGxState.hoveredStar.userData.baseScale;
                apGxState.hoveredStar.scale.set(hbs, hbs, 1);
                apGxState.hoveredStar.material.opacity = 0.95;
            }

            if (hits.length > 0) {
                var hit = hits[0].object;
                if (hit.userData.date) {
                    hit.material.opacity = 1;
                    var hs = hit.userData.baseScale * 1.8;
                    hit.scale.set(hs, hs, 1);
                    apGxState.hoveredStar = hit;
                    var ud = hit.userData;
                    var typeLabels = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', sick: 'Krank', holiday: 'Feiertag', gleittag: 'Gleittag' };
                    if (infoEl) {
                        infoEl.innerHTML = '<div class="apgx-info-row"><span class="apgx-info-date">' + ud.dayName + ', ' + new Date(ud.date).toLocaleDateString(mwlLocale()) + '</span><span class="apgx-info-type">' + (typeLabels[ud.type] || ud.type) + '</span></div>' +
                            '<div class="apgx-info-row"><span class="apgx-info-hours">' + ud.hours.toFixed(2) + 'h / ' + ud.expected.toFixed(2) + 'h</span>' +
                            '<span class="apgx-info-diff" style="color:' + (ud.diff >= 0 ? '#22c55e' : '#ef4444') + '">' + (ud.diff >= 0 ? '+' : '') + ud.diff.toFixed(2) + 'h</span>' +
                            (ud.project ? '<span class="apgx-info-project">' + safeHTML(ud.project) + '</span>' : '') +
                            '</div>' +
                            '<div class="apgx-info-category" style="color:' + (colorMapData[ud.category] || colorMapData.normal).rgba.replace('1)', '0.9)') + '">' + ({ superstar: 'Superstar', normal: 'Nebula', low: 'Dwarf', red: 'Red Giant', school: 'Schule', special: 'Spezial' }[ud.category] || '') + '</div>';
                        infoEl.classList.add('visible');
                    }
                }
            } else {
                apGxState.hoveredStar = null;
                if (infoEl) infoEl.classList.remove('visible');
            }

            // Render — always use composer for consistent tonemapping
            if (composer) {
                if (apGxState.bloomPass) apGxState.bloomPass.enabled = apGxState.bloomEnabled;
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }

        apGxState._animateFn = animate;
        animate();

        // ── Resize ──
        window.addEventListener('resize', function() {
            if (!apGxState.renderer) return;
            var c = document.getElementById('apGxContainer');
            if (!c) return;
            var nw = c.clientWidth, nh = c.clientHeight;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
            if (composer) composer.setSize(nw, nh);
        });

        // ── Stats ──
        apGxRenderStats(filtered);
    };

    // ═══════════════════════════════════════
    //  INJECT CSS FOR FORCE GRAPH
    // ═══════════════════════════════════════
    var ultraCSS = document.createElement('style');
    ultraCSS.textContent = [
        '#apGxForceGraphContainer {',
        '  width: 100%; height: 500px; border-radius: 20px; overflow: hidden;',
        '  background: var(--bg-deep, #030305);',
        '}',
        '#apGxForceGraphContainer canvas {',
        '  border-radius: 20px;',
        '}',
        '[data-theme="light"] #apGxForceGraphContainer {',
        '  background: var(--bg-deep);',
        '}',
        '@media(max-width:640px){',
        '  #apGxForceGraphContainer { height: 350px; }',
        '}'
    ].join('\n');
    document.head.appendChild(ultraCSS);

    console.log('[Galaxy Ultra] Engine loaded — volumetric nebula, accretion disk, gravitational lensing, force graph ready');
})();
