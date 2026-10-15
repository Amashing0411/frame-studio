// The app runs as three classic (non-module) scripts that share one global scope, exactly like the original
// single-file build: vendor libraries, then the engine, then the studio. Each bundle is the listed files joined
// in this order, so order matters. tools/vite-classic-scripts.js serves them in dev and emits them on build.
//
// Paths starting with src/ are project files; everything else is resolved inside node_modules.

const webmDurationFix = {
  why: 'Keep the final fixed-rate video frame in the WebM container duration (otherwise exports report one frame short).',
  find: '__privateSet(this, _duration, Math.max(__privateGet(this, _duration), msTimestamp));',
  replace: '/* Studio fix: retain the final fixed-rate video frame in the container duration. */ __privateSet(this, _duration, Math.max(__privateGet(this, _duration), chunk.trackNumber === VIDEO_TRACK_NUMBER && __privateGet(this, _options).video.frameRate ? chunk.timestamp / 1000 + 1000 / __privateGet(this, _options).video.frameRate : msTimestamp));',
};

export default {
  vendor: {
    separator: '\n;\n',
    files: [
      'three/build/three.min.js',
      'three/examples/js/controls/OrbitControls.js',
      'three/examples/js/utils/SkeletonUtils.js',
      'three/examples/js/loaders/GLTFLoader.js',
      'three/examples/js/exporters/GLTFExporter.js',
      { file: 'webm-muxer/build/webm-muxer.js', patches: [webmDurationFix] },
      'mp4-muxer/build/mp4-muxer.js',
    ],
  },
  engine: {
    files: [
      'src/engine/00-renderer.js',
      'src/engine/01-sky-weather.js',
      'src/engine/02-helpers.js',
      'src/engine/03-scenery.js',
      'src/engine/04-vehicles.js',
      'src/engine/05-characters.js',
      'src/engine/06-world.js',
      'src/engine/07-fx.js',
      'src/engine/08-state.js',
      'src/engine/09-navigation.js',
      'src/engine/10-faces-poses.js',
      'src/engine/11-life.js',
      'src/engine/12-camera.js',
      'src/engine/13-validation.js',
      'src/engine/14-step.js',
      'src/engine/15-samples.js',
    ],
  },
  studio: {
    files: [
      'src/assets/01-archetypes.js',
      'src/assets/02-recipes.js',
      'src/studio/03-transport.js',
      'src/studio/04-audio.js',
      'src/studio/05-capture.js',
      'src/studio/06-editor.js',
      'src/studio/07-workshop.js',
      'src/assets/08-mesh-factory.js',
      'src/studio/09-cameras-save.js',
      'src/studio/10-rig.js',
      'src/studio/11-camera-paths-chatter.js',
      'src/studio/12-story-delivery.js',
      'src/studio/13-talking.js',
      'src/assets/14-characters-v3.js',
      'src/studio/15-balloons.js',
      'src/assets/16-world-revamp.js',
      'src/studio/17-water-hazards.js',
      'src/studio/18-safe-zones.js',
      'src/assets/19-cast.js',
      'src/studio/20-ui-shell.js',
      'src/studio/21-guide.js',
      'src/studio/99-boot.js',
    ],
  },
};
