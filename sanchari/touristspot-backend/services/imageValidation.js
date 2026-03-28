const sharp = require('sharp');

const MIN_WIDTH = 400;
const MIN_HEIGHT = 400;
const MIN_VARIANCE = 260; // blank/flat image threshold
const MIN_BRIGHTNESS = 55; // dark image threshold
const MIN_LAPLACIAN_VARIANCE = 120; // blur threshold

function getMeanAndVariance(values) {
  if (!values.length) return { mean: 0, variance: 0 };
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / values.length;
  let sq = 0;
  for (const v of values) sq += Math.pow(v - mean, 2);
  return { mean, variance: sq / values.length };
}

async function getGrayStats(buffer) {
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(160, 160, { fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return getMeanAndVariance(data);
}

async function getLaplacianVariance(buffer) {
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
    .convolve({
      width: 3,
      height: 3,
      kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return getMeanAndVariance(data).variance;
}

async function validateImageForSpot(buffer) {
  const checks = [];

  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  checks.push({
    rule: 'dimension_min_400x400',
    passed: width >= MIN_WIDTH && height >= MIN_HEIGHT,
    details: { width, height, minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT },
    rejectMessage: 'Image too small. Minimum required size is 400x400.',
  });

  const grayStats = await getGrayStats(buffer);
  checks.push({
    rule: 'blank_pixel_variance',
    passed: grayStats.variance >= MIN_VARIANCE,
    details: { variance: Number(grayStats.variance.toFixed(2)), minVariance: MIN_VARIANCE },
    rejectMessage: 'Image appears blank or too flat.',
  });

  checks.push({
    rule: 'brightness_not_too_dark',
    passed: grayStats.mean >= MIN_BRIGHTNESS,
    details: { brightness: Number(grayStats.mean.toFixed(2)), minBrightness: MIN_BRIGHTNESS },
    rejectMessage: 'Image is too dark. Capture in better light.',
  });

  const laplacianVariance = await getLaplacianVariance(buffer);
  checks.push({
    rule: 'blur_laplacian_sharpness',
    passed: laplacianVariance >= MIN_LAPLACIAN_VARIANCE,
    details: {
      laplacianVariance: Number(laplacianVariance.toFixed(2)),
      minLaplacianVariance: MIN_LAPLACIAN_VARIANCE,
    },
    rejectMessage: 'Image is blurry. Please capture a sharper photo.',
  });

  checks.push({
    rule: 'selfie_detection_disabled',
    passed: true,
    details: { reason: 'Selfie detection disabled (no TensorFlow/face model dependencies in dev build).' },
    rejectMessage: 'Selfie detected.',
  });

  const failed = checks.find((c) => !c.passed);
  if (failed) {
    return {
      accepted: false,
      reason: failed.rejectMessage,
      failedRule: failed.rule,
      checks,
    };
  }

  return {
    accepted: true,
    reason: 'Image passed all spot validation rules.',
    checks,
  };
}

module.exports = { validateImageForSpot };

