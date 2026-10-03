/**
 * Structured web-page capture for Galaxy Brain.
 *
 * The clip keeps semantic page content and remote image/link references while
 * removing executable or interactive markup. Galaxy Brain stores the resulting
 * HTML as the durable original; it never needs to fetch or execute the page.
 */

class WebClipper {
  static MAX_CAPTURE_BYTES = 1_750_000;
  static MAX_SELECTION_LENGTH = 100_000;
  static MAX_FALLBACK_IMAGES = 200;
  static MAX_INLINE_IMAGE_LENGTH = 512_000;

  capture() {
    const capturedAt = new Date().toISOString();
    const selection = (window.getSelection()?.toString() || '')
      .slice(0, WebClipper.MAX_SELECTION_LENGTH);
    const documentCapture = this.createSanitizedDocument(capturedAt);
    let content = this.serialize(documentCapture);
    let simplified = false;

    if (this.byteLength(content) > WebClipper.MAX_CAPTURE_BYTES) {
      content = this.createSimplifiedDocument(documentCapture, capturedAt);
      simplified = true;
    }

    return {
      url: window.location.href,
      title: document.title || window.location.hostname,
      format: 'html',
      content,
      selection,
      capturedAt,
      imageCount: documentCapture.querySelectorAll('img[src]').length,
      simplified
    };
  }

  createSanitizedDocument(capturedAt) {
    const output = document.implementation.createHTMLDocument(document.title || 'Web capture');
    output.documentElement.lang = document.documentElement.lang || 'en';
    output.head.innerHTML = '';

    const charset = output.createElement('meta');
    charset.setAttribute('charset', 'utf-8');
    output.head.appendChild(charset);

    const title = output.createElement('title');
    title.textContent = document.title || window.location.hostname;
    output.head.appendChild(title);

    const source = output.createElement('meta');
    source.setAttribute('name', 'duly-noted-source');
    source.setAttribute('content', window.location.href);
    output.head.appendChild(source);

    const captured = output.createElement('meta');
    captured.setAttribute('name', 'duly-noted-captured-at');
    captured.setAttribute('content', capturedAt);
    output.head.appendChild(captured);

    output.body.innerHTML = '';
    const provenance = output.createElement('header');
    provenance.setAttribute('data-duly-noted-provenance', 'true');
    const heading = output.createElement('h1');
    heading.textContent = document.title || window.location.hostname;
    provenance.appendChild(heading);
    const sourceLine = output.createElement('p');
    sourceLine.appendChild(output.createTextNode('Source: '));
    const sourceLink = output.createElement('a');
    sourceLink.href = window.location.href;
    sourceLink.textContent = window.location.href;
    sourceLine.appendChild(sourceLink);
    provenance.appendChild(sourceLine);
    output.body.appendChild(provenance);

    if (!document.body) return output;

    const sourceRoot = document.body;
    const clonedRoot = sourceRoot.cloneNode(true);
    const sourceElements = [sourceRoot, ...sourceRoot.querySelectorAll('*')];
    const clonedElements = [clonedRoot, ...clonedRoot.querySelectorAll('*')];

    for (let index = 0; index < clonedElements.length; index += 1) {
      const original = sourceElements[index];
      const clone = clonedElements[index];
      if (!original || !clone) continue;

      if (this.shouldRemove(original)) {
        clone.remove();
        continue;
      }
      this.sanitizeElement(original, clone);
    }

    while (clonedRoot.firstChild) output.body.appendChild(clonedRoot.firstChild);
    return output;
  }

  shouldRemove(element) {
    const tagName = element.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'template', 'iframe', 'frame', 'object', 'embed',
      'canvas', 'svg', 'form', 'input', 'button', 'select', 'textarea'].includes(tagName)) {
      return true;
    }
    if (element.id?.startsWith('dulynoted-')) return true;
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return true;
    return false;
  }

  sanitizeElement(original, clone) {
    const tagName = original.tagName.toLowerCase();
    const kept = {};

    if (original.hasAttribute('lang')) kept.lang = original.getAttribute('lang');
    if (original.hasAttribute('dir')) kept.dir = original.getAttribute('dir');

    if (tagName === 'a') {
      kept.href = this.absoluteUrl(original.getAttribute('href'));
      kept.title = original.getAttribute('title');
    } else if (tagName === 'img') {
      kept.src = this.imageSource(original);
      kept.srcset = this.absoluteSrcset(original.getAttribute('srcset'));
      kept.alt = original.getAttribute('alt') || '';
      kept.title = original.getAttribute('title');
      kept.width = this.dimension(original.getAttribute('width'));
      kept.height = this.dimension(original.getAttribute('height'));
    } else if (tagName === 'source') {
      kept.src = this.absoluteUrl(original.getAttribute('src'), { allowImageData: true });
      kept.srcset = this.absoluteSrcset(original.getAttribute('srcset'));
      kept.type = original.getAttribute('type');
      kept.media = original.getAttribute('media');
    } else if (tagName === 'video' || tagName === 'audio') {
      kept.src = this.absoluteUrl(original.getAttribute('src'));
      kept.poster = this.absoluteUrl(original.getAttribute('poster'), { allowImageData: true });
      kept.controls = 'controls';
    } else if (tagName === 'time') {
      kept.datetime = original.getAttribute('datetime');
    } else if (tagName === 'blockquote' || tagName === 'q') {
      kept.cite = this.absoluteUrl(original.getAttribute('cite'));
    } else if (tagName === 'td' || tagName === 'th') {
      kept.colspan = this.dimension(original.getAttribute('colspan'));
      kept.rowspan = this.dimension(original.getAttribute('rowspan'));
      kept.scope = original.getAttribute('scope');
    } else if (tagName === 'ol') {
      kept.start = original.getAttribute('start');
      if (original.hasAttribute('reversed')) kept.reversed = 'reversed';
    } else if (tagName === 'li') {
      kept.value = original.getAttribute('value');
    } else if (tagName === 'details' && original.hasAttribute('open')) {
      kept.open = 'open';
    } else if (tagName === 'abbr') {
      kept.title = original.getAttribute('title');
    }

    for (const attribute of [...clone.attributes]) clone.removeAttribute(attribute.name);
    for (const [name, value] of Object.entries(kept)) {
      if (value !== null && value !== undefined && value !== '') clone.setAttribute(name, value);
    }
  }

  imageSource(image) {
    const candidates = [
      image.getAttribute('data-src'),
      image.getAttribute('data-original'),
      image.getAttribute('data-lazy-src'),
      image.getAttribute('data-original-src'),
      image.currentSrc,
      image.getAttribute('src')
    ];
    for (const candidate of candidates) {
      const normalized = this.absoluteUrl(candidate, { allowImageData: true });
      if (normalized && !normalized.startsWith('data:image/')) return normalized;
    }
    for (const candidate of candidates) {
      const normalized = this.absoluteUrl(candidate, { allowImageData: true });
      if (normalized) return normalized;
    }
    return null;
  }

  absoluteUrl(value, { allowImageData = false } = {}) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (allowImageData && /^data:image\/(?:png|jpe?g|gif|webp|avif);/i.test(trimmed)) {
      return trimmed.length <= WebClipper.MAX_INLINE_IMAGE_LENGTH ? trimmed : null;
    }
    try {
      const parsed = new URL(trimmed, document.baseURI);
      if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return parsed.href;
    } catch {
      return null;
    }
    return null;
  }

  absoluteSrcset(value) {
    if (!value || value.includes('data:')) return null;
    const entries = [];
    for (const item of value.split(',')) {
      const parts = item.trim().split(/\s+/);
      const url = this.absoluteUrl(parts.shift(), { allowImageData: true });
      if (url) entries.push([url, ...parts].join(' '));
    }
    return entries.join(', ') || null;
  }

  dimension(value) {
    return /^\d{1,5}$/.test(value || '') ? value : null;
  }

  createSimplifiedDocument(sanitized, capturedAt) {
    const output = document.implementation.createHTMLDocument(document.title || 'Web capture');
    output.head.innerHTML = '<meta charset="utf-8">';
    output.body.innerHTML = '';

    const heading = output.createElement('h1');
    heading.textContent = document.title || window.location.hostname;
    output.body.appendChild(heading);

    const source = output.createElement('p');
    source.textContent = `Source: ${window.location.href}`;
    output.body.appendChild(source);

    const captured = output.createElement('p');
    captured.textContent = `Captured: ${capturedAt}`;
    output.body.appendChild(captured);

    const article = output.createElement('article');
    const pre = output.createElement('pre');
    pre.textContent = this.truncateUtf8(document.body?.innerText || '', 1_150_000);
    article.appendChild(pre);
    output.body.appendChild(article);

    const images = [...sanitized.querySelectorAll('img[src]')]
      .slice(0, WebClipper.MAX_FALLBACK_IMAGES);
    if (images.length) {
      const gallery = output.createElement('section');
      const galleryHeading = output.createElement('h2');
      galleryHeading.textContent = 'Images from the page';
      gallery.appendChild(galleryHeading);
      for (const image of images) {
        const figure = output.createElement('figure');
        const copy = output.createElement('img');
        copy.src = image.getAttribute('src');
        copy.alt = image.getAttribute('alt') || '';
        figure.appendChild(copy);
        if (copy.alt) {
          const caption = output.createElement('figcaption');
          caption.textContent = copy.alt;
          figure.appendChild(caption);
        }
        gallery.appendChild(figure);
      }
      output.body.appendChild(gallery);
    }

    let html = this.serialize(output);
    while (this.byteLength(html) > WebClipper.MAX_CAPTURE_BYTES) {
      const lastFigure = output.querySelector('figure:last-of-type');
      if (lastFigure) {
        lastFigure.remove();
      } else {
        pre.textContent = this.truncateUtf8(pre.textContent, Math.floor(this.byteLength(pre.textContent) * 0.8));
      }
      html = this.serialize(output);
    }
    return html;
  }

  truncateUtf8(value, maximumBytes) {
    if (this.byteLength(value) <= maximumBytes) return value;
    let low = 0;
    let high = value.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (this.byteLength(value.slice(0, middle)) <= maximumBytes) low = middle;
      else high = middle - 1;
    }
    if (low > 0 && /[\uD800-\uDBFF]/.test(value[low - 1])) low -= 1;
    return `${value.slice(0, low)}\n\n[Page content truncated to fit the Galaxy Brain capture limit.]`;
  }

  byteLength(value) {
    return new TextEncoder().encode(value).byteLength;
  }

  serialize(value) {
    return `<!doctype html>\n${value.documentElement.outerHTML}`;
  }
}

window.DulyNoted.WebClipper = WebClipper;
