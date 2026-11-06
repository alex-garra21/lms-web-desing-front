/**
 * routeHasher.js
 * 
 * Utilidad de ofuscación y enmascaramiento bidireccional de IDs y rutas para el LMS UMG.
 * Previene ataques IDOR (Insecure Direct Object References) y oculta identificadores 
 * directos en URLs públicas y privadas.
 * 
 * Cumple con las directrices de seguridad de AGENTS.md y CLAUDE.md.
 */

// Salt secreta por defecto; en entornos de producción se lee desde las variables de entorno
const DEFAULT_SALT =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_ROUTE_SALT || process.env.ROUTE_SALT)) ||
  'lms_umg_secure_salt_2026_x9k2p8m7';

const PREFIX = 'm_'; // Prefijo identificador de ruta/ID enmascarado

/**
 * Calcula un checksum FNV-1a de 32 bits a partir de los bytes del payload y el salt.
 * Retorna un entero sin signo de 32 bits.
 * 
 * @param {Uint8Array} payloadBytes 
 * @param {string} salt 
 * @returns {number} Entero de 32 bits
 */
function calculateChecksum(payloadBytes, salt) {
  let hash = 0x811c9dc5; // Offset basis FNV
  // Incorporar salt
  for (let i = 0; i < salt.length; i++) {
    hash ^= salt.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Incorporar payload
  for (let i = 0; i < payloadBytes.length; i++) {
    hash ^= payloadBytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Genera un flujo de bytes pseudoaleatorio determinista derivado del salt y el checksum.
 * 
 * @param {string} salt 
 * @param {number} checksum 
 * @param {number} length 
 * @returns {Uint8Array}
 */
function generateKeyStream(salt, checksum, length) {
  const stream = new Uint8Array(length);
  let seed = checksum >>> 0;
  for (let i = 0; i < salt.length; i++) {
    seed = (Math.imul(seed, 31) + salt.charCodeAt(i)) >>> 0;
  }

  for (let i = 0; i < length; i++) {
    // Generador de congruencia lineal LCG
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    stream[i] = (seed >>> 16) & 0xff;
  }
  return stream;
}

/**
 * Convierte un Uint8Array a Base64 URL-Safe de forma isomórfica (Navegador y Node.js).
 * 
 * @param {Uint8Array} bytes 
 * @returns {string}
 */
function bytesToBase64Url(bytes) {
  let base64 = '';
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(bytes).toString('base64');
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convierte una cadena Base64 URL-Safe de vuelta a Uint8Array.
 * 
 * @param {string} str 
 * @returns {Uint8Array|null}
 */
function base64UrlToBytes(str) {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    if (typeof atob === 'function') {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(base64, 'base64'));
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Enmascara (ofusca) un identificador o ID numérico/texto utilizando la salt secreta.
 * Incorpora un checksum de integridad para mitigar ataques IDOR por fuerza bruta.
 * 
 * @param {string|number} rawId - Identificador original (ej: 42, "curso-123", UUID)
 * @param {string} [customSalt] - Salt opcional para sobreescribir la por defecto
 * @returns {string} Identificador ofuscado y seguro para URLs
 */
export function encodeId(rawId, customSalt = DEFAULT_SALT) {
  if (rawId === null || rawId === undefined || rawId === '') {
    return '';
  }

  const rawString = String(rawId);
  const payloadBytes = new TextEncoder().encode(rawString);
  const checksum = calculateChecksum(payloadBytes, customSalt);
  const keystream = generateKeyStream(customSalt, checksum, payloadBytes.length);

  // Empaquetar: 4 bytes de checksum + payload ofuscado con XOR
  const packed = new Uint8Array(4 + payloadBytes.length);
  packed[0] = (checksum >>> 24) & 0xff;
  packed[1] = (checksum >>> 16) & 0xff;
  packed[2] = (checksum >>> 8) & 0xff;
  packed[3] = checksum & 0xff;

  for (let i = 0; i < payloadBytes.length; i++) {
    packed[4 + i] = payloadBytes[i] ^ keystream[i];
  }

  const encoded = bytesToBase64Url(packed);
  return `${PREFIX}${encoded}`;
}

/**
 * Desenmascara (decodifica) un identificador previamente ofuscado.
 * Si el hash fue alterado o el checksum no coincide con la salt secreta,
 * la función devuelve `null` de forma segura (prevención de IDOR).
 * 
 * @param {string} maskedId - Identificador ofuscado
 * @param {string} [customSalt] - Salt opcional
 * @returns {string|null} Identificador original o null si es inválido/manipulado
 */
export function decodeId(maskedId, customSalt = DEFAULT_SALT) {
  if (!maskedId || typeof maskedId !== 'string') {
    return null;
  }

  // Remover prefijo si existe
  const cleanHash = maskedId.startsWith(PREFIX)
    ? maskedId.slice(PREFIX.length)
    : maskedId;

  const packed = base64UrlToBytes(cleanHash);
  if (!packed || packed.length < 5) {
    // Mínimo 4 bytes de checksum + 1 byte de payload
    return null;
  }

  // Extraer checksum original
  const originalChecksum =
    ((packed[0] << 24) |
      (packed[1] << 16) |
      (packed[2] << 8) |
      packed[3]) >>> 0;

  const payloadLength = packed.length - 4;
  const keystream = generateKeyStream(customSalt, originalChecksum, payloadLength);

  // Deshacer el XOR
  const recoveredBytes = new Uint8Array(payloadLength);
  for (let i = 0; i < payloadLength; i++) {
    recoveredBytes[i] = packed[4 + i] ^ keystream[i];
  }

  // Validar checksum recalculado contra el recibido (Protección contra IDOR)
  const recalculatedChecksum = calculateChecksum(recoveredBytes, customSalt);
  if (recalculatedChecksum !== originalChecksum) {
    return null;
  }

  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(recoveredBytes);
    // Verificación de integridad adicional: re-empaque idéntico
    const verificationPacked = bytesToBase64Url(packed);
    if (verificationPacked !== cleanHash) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verifica si un identificador ofuscado es válido y no ha sido alterado.
 * 
 * @param {string} maskedId 
 * @param {string} [customSalt] 
 * @returns {boolean}
 */
export function isValidMaskedId(maskedId, customSalt = DEFAULT_SALT) {
  return decodeId(maskedId, customSalt) !== null;
}

/**
 * Enmascara segmentos de ruta específicos (ej: /courses/123 -> /courses/m_XXXX).
 * 
 * @param {string} path - Ruta con IDs planos
 * @param {string} [customSalt] - Salt opcional
 * @returns {string} Ruta con IDs ofuscados
 */
export function maskRoute(path, customSalt = DEFAULT_SALT) {
  if (!path || typeof path !== 'string') return path;

  const [pathname, search] = path.split('?');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const sensitiveAuthRoutes = new Set(['login', 'register', 'signin', 'signup', 'forgot-password', 'reset-password']);
  const segments = pathname.split('/');

  const maskedSegments = segments.map((seg) => {
    if (!seg) return seg;
    if (seg.startsWith(PREFIX)) return seg;
    const lower = seg.toLowerCase();
    if (/^\d+$/.test(seg) || uuidRegex.test(seg) || sensitiveAuthRoutes.has(lower)) {
      return encodeId(seg, customSalt);
    }
    return seg;
  });

  const maskedPath = maskedSegments.join('/');
  return search !== undefined ? `${maskedPath}?${search}` : maskedPath;
}

/**
 * Desenmascara todos los segmentos ofuscados de una ruta.
 * 
 * @param {string} maskedPath - Ruta con parámetros ofuscados
 * @param {string} [customSalt] - Salt opcional
 * @returns {string} Ruta original con IDs planos
 */
export function unmaskRoute(maskedPath, customSalt = DEFAULT_SALT) {
  if (!maskedPath || typeof maskedPath !== 'string') return maskedPath;

  const [pathname, search] = maskedPath.split('?');
  const segments = pathname.split('/');
  const unmaskedSegments = segments.map((seg) => {
    if (seg && seg.startsWith(PREFIX)) {
      const decoded = decodeId(seg, customSalt);
      return decoded !== null ? decoded : seg;
    }
    return seg;
  });

  const unmaskedPath = unmaskedSegments.join('/');
  return search !== undefined ? `${unmaskedPath}?${search}` : unmaskedPath;
}

/**
 * Genera una URL enmascarada amigable para navegación en el LMS.
 * 
 * @param {string} basePath - Ruta base (ej: '/courses', '/lessons')
 * @param {string|number} resourceId - Identificador del recurso a enmascarar
 * @param {Record<string, string|number>} [queryParams] - Parámetros de consulta opcionales
 * @param {string} [customSalt] - Salt opcional
 * @returns {string} URL formateada y ofuscada
 */
export function createMaskedUrl(basePath, resourceId, queryParams = {}, customSalt = DEFAULT_SALT) {
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const maskedId = encodeId(resourceId, customSalt);
  let url = `${normalizedBase}/${maskedId}`;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
}

// Aliases para máxima compatibilidad con distintas convenciones
export const hashId = encodeId;
export const unhashId = decodeId;
export const obfuscateId = encodeId;
export const deobfuscateId = decodeId;

const routeHasher = {
  encodeId,
  decodeId,
  hashId,
  unhashId,
  obfuscateId,
  deobfuscateId,
  isValidMaskedId,
  maskRoute,
  unmaskRoute,
  createMaskedUrl,
};

export default routeHasher;
