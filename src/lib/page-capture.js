/**
 * Capture the current page while retaining a useful non-script fallback.
 *
 * Both browser capture attempts can be denied on otherwise valid HTTP(S)
 * pages. URL and title provenance must still reach Galaxy Brain in that case.
 */
export async function capturePageOrFallback({
  tab,
  captureStructured,
  captureText,
  now = () => new Date()
}) {
  const capturedAt = now().toISOString();
  const fallback = {
    url: tab.url,
    title: tab.title || '',
    format: 'text',
    content: `${tab.title || tab.url}\n\n${tab.url}`,
    selection: '',
    capturedAt,
    imageCount: 0,
    simplified: true
  };

  try {
    return await captureStructured(tab.id);
  } catch {
    // A page can reject the content script while still allowing a smaller
    // executeScript attempt. Continue to the plain-text capture.
  }

  try {
    const result = await captureText(tab.id);
    return {
      ...fallback,
      content: result?.text || fallback.content,
      selection: result?.selection || ''
    };
  } catch {
    return fallback;
  }
}
