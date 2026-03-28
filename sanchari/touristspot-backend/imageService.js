const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { validateImageForSpot } = require('./services/imageValidation');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const inFlightDownloads = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRemoteUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function getSpotImageFilename(spotId) {
  return `spot_img_${spotId}.jpg`;
}

function hasUsableLocalFile(filename) {
  if (!filename || isRemoteUrl(filename)) return false;
  const filePath = path.join(UPLOADS_DIR, filename);
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 8000;
}

function getCategoryFallbackFilename(category) {
  const safeCategory = String(category || 'General').toLowerCase();
  return `category_fallback_${safeCategory}.jpg`;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, options, resolve);
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function readResponseBuffer(response, sourceUrl) {
  if (response.statusCode === 301 || response.statusCode === 302) {
    const redirectUrl = new URL(response.headers.location, sourceUrl).toString();
    return downloadImageBuffer(redirectUrl);
  }

  if (response.statusCode !== 200) {
    throw new Error(`HTTP ${response.statusCode}`);
  }

  const contentType = String(response.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('image/')) {
    throw new Error(`Invalid content-type: ${contentType || 'unknown'}`);
  }

  const chunks = [];
  for await (const chunk of response) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function downloadImageBuffer(url) {
  const response = await makeRequest(url, {
    headers: {
      'User-Agent': 'TouristSpotApp/1.0',
      Accept: 'image/jpeg,image/png,image/webp,image/*',
    },
    timeout: 30000,
  });
  return readResponseBuffer(response, url);
}

async function saveProcessedImage(buffer, filename) {
  const filePath = path.join(UPLOADS_DIR, filename);
  await sharp(buffer)
    .rotate()
    .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, progressive: true })
    .toFile(filePath);

  if (!hasUsableLocalFile(filename)) {
    throw new Error('Saved sample image is too small');
  }

  return filename;
}

async function downloadAndValidateImage(url, filename) {
  const buffer = await downloadImageBuffer(url);
  const validation = await validateImageForSpot(buffer);
  if (!validation.accepted) {
    throw new Error(`Rejected sample image: ${validation.failedRule}`);
  }

  return saveProcessedImage(buffer, filename);
}

async function searchWikimediaImage(query) {
  if (!query) return null;

  return new Promise((resolve) => {
    const encodedQuery = encodeURIComponent(query.replace(/ /g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`;

    https.get(url, {
      headers: {
        'User-Agent': 'TouristSpotApp/1.0 (educational project)',
        Accept: 'application/json',
      },
      timeout: 10000,
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json?.thumbnail?.source) {
            resolve(json.thumbnail.source.replace(/\/\d+px-/, '/1200px-').replace(/ /g, '_'));
            return;
          }
        } catch (error) {
          // Ignore parse failures.
        }
        resolve(null);
      });
    }).on('error', () => resolve(null))
      .on('timeout', () => resolve(null));
  });
}

const fallbackImages = {
  Temple: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Golden_Temple%2C_Amritsar%2C_India_-_Aug_2019.jpg/1200px-Golden_Temple%2C_Amritsar%2C_India_-_Aug_2019.jpg',
  Nature: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Athirappilly_Waterfalls.jpg/1200px-Athirappilly_Waterfalls.jpg',
  Beach: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Calangute_beach_Goa.jpg/1200px-Calangute_beach_Goa.jpg',
  Historical: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/1200px-Taj_Mahal_%28Edited%29.jpeg',
  Landmark: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/1200px-Taj_Mahal_%28Edited%29.jpeg',
  General: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Varanasi_Ghats.jpg/1200px-Varanasi_Ghats.jpg',
};

const placeholderTheme = {
  Temple: { start: '#d97706', end: '#f59e0b', icon: 'Temple' },
  Nature: { start: '#166534', end: '#22c55e', icon: 'Nature' },
  Beach: { start: '#0369a1', end: '#38bdf8', icon: 'Beach' },
  Historical: { start: '#7c2d12', end: '#f97316', icon: 'Historic' },
  Landmark: { start: '#7f1d1d', end: '#ef4444', icon: 'Landmark' },
  General: { start: '#312e81', end: '#8b5cf6', icon: 'Travel' },
};

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function createPlaceholderImage(spot, filename) {
  if (hasUsableLocalFile(filename)) {
    return filename;
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  const theme = placeholderTheme[spot.category] || placeholderTheme.General;
  const title = escapeSvgText(spot.name);
  const subtitle = escapeSvgText(spot.city ? `${spot.city}, ${spot.country || ''}` : spot.category || 'Tourist spot');
  const badge = escapeSvgText(theme.icon);
  const svg = `
    <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${theme.start}"/>
          <stop offset="100%" stop-color="${theme.end}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)"/>
      <circle cx="980" cy="160" r="180" fill="rgba(255,255,255,0.10)"/>
      <circle cx="170" cy="760" r="220" fill="rgba(0,0,0,0.10)"/>
      <rect x="72" y="620" width="220" height="56" rx="28" fill="rgba(15,23,42,0.28)"/>
      <text x="182" y="657" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff">${badge}</text>
      <text x="72" y="754" font-family="Arial, sans-serif" font-size="74" font-weight="800" fill="#ffffff">${title}</text>
      <text x="72" y="812" font-family="Arial, sans-serif" font-size="34" font-weight="500" fill="rgba(255,255,255,0.88)">${subtitle}</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 92, progressive: true })
    .toFile(filePath);

  return filename;
}

async function ensureCategoryFallbackImage(category) {
  const filename = getCategoryFallbackFilename(category);
  if (hasUsableLocalFile(filename)) {
    return filename;
  }

  const url = fallbackImages[category] || fallbackImages.General;
  try {
    await downloadAndValidateImage(url, filename);
    return filename;
  } catch (error) {
    return null;
  }
}

async function downloadImageWithRetry(spot, filename, retries = 2) {
  if (hasUsableLocalFile(filename)) {
    return filename;
  }

  const candidateQueries = [
    spot.name,
    [spot.name, spot.city].filter(Boolean).join(' '),
    [spot.name, spot.country].filter(Boolean).join(' '),
  ].filter(Boolean);

  for (const query of candidateQueries) {
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const imageUrl = await searchWikimediaImage(query);
        if (imageUrl) {
          await downloadAndValidateImage(imageUrl, filename);
          return filename;
        }
        break;
      } catch (error) {
        if (String(error.message || '').includes('429') && attempt < retries - 1) {
          await sleep((attempt + 1) * 2500);
        }
      }
    }
  }

  const categoryFallbackFilename = await ensureCategoryFallbackImage(spot.category);
  if (categoryFallbackFilename) {
    const sourcePath = path.join(UPLOADS_DIR, categoryFallbackFilename);
    const targetPath = path.join(UPLOADS_DIR, filename);
    if (!hasUsableLocalFile(filename)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
    return filename;
  }

  return createPlaceholderImage(spot, filename);
}

async function ensureLocalSpotImage(spot) {
  if (!spot?.id || !spot?.name) {
    throw new Error('Spot id and name are required');
  }

  if (spot.image_url && hasUsableLocalFile(spot.image_url)) {
    return spot.image_url;
  }

  const filename = getSpotImageFilename(spot.id);
  if (hasUsableLocalFile(filename)) {
    return filename;
  }

  const existingDownload = inFlightDownloads.get(filename);
  if (existingDownload) {
    return existingDownload;
  }

  const promise = downloadImageWithRetry(spot, filename)
    .finally(() => {
      inFlightDownloads.delete(filename);
    });

  inFlightDownloads.set(filename, promise);
  return promise;
}

function getImageUrl(spotName, category) {
  return fallbackImages[category] || fallbackImages.General;
}

module.exports = {
  getImageUrl,
  fallbackImages,
  isRemoteUrl,
  getSpotImageFilename,
  ensureLocalSpotImage,
  createPlaceholderImage,
};
