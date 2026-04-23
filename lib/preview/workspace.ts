function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

interface PreviewWorkspaceOptions {
  title: string
  srcDoc: string
}

export function buildPreviewWorkspaceHTML({ title, srcDoc }: PreviewWorkspaceOptions): string {
  const safeTitle = escapeHtml(title)
  const serializedSrcDoc = JSON.stringify(srcDoc)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #050505;
      --surface: rgba(255, 255, 255, 0.05);
      --surface-strong: #0b0b0f;
      --border: rgba(255, 255, 255, 0.1);
      --text: #ffffff;
      --text-dim: rgba(255, 255, 255, 0.7);
      --text-soft: rgba(255, 255, 255, 0.5);
      --accent: #ffd166;
      --accent-text: #1a1204;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body {
      min-height: 100vh;
      background:
        radial-gradient(circle at top, rgba(255, 209, 102, 0.12), transparent 24%),
        radial-gradient(circle at bottom, rgba(124, 58, 237, 0.2), transparent 22%),
        var(--bg);
    }
    .layout { min-height: 100vh; display: flex; flex-direction: column; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(16px);
    }
    .toolbar-top, .toolbar-bottom {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .eyebrow {
      margin: 0 0 6px;
      color: rgba(255, 255, 255, 0.45);
      text-transform: uppercase;
      letter-spacing: 0.24em;
      font-size: 11px;
    }
    .title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
    }
    .controls, .zoom-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .button {
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-dim);
      border-radius: 16px;
      padding: 10px 14px;
      font: inherit;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }
    .button:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); border-color: rgba(255, 255, 255, 0.2); }
    .button-active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
    .zoom-controls {
      padding: 4px;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 18px;
    }
    .zoom-button {
      min-width: 40px;
      min-height: 40px;
      padding: 0 12px;
      border: 0;
      background: transparent;
      color: var(--text-dim);
      border-radius: 12px;
      font: inherit;
      cursor: pointer;
    }
    .zoom-button:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); }
    .meta { color: var(--text-soft); font-size: 14px; }
    .canvas {
      flex: 1;
      overflow: auto;
      padding: 24px;
    }
    .canvas-inner {
      min-height: 100%;
      min-width: max-content;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .frame-shell {
      border-radius: 28px;
      border: 1px solid var(--border);
      background: var(--surface-strong);
      padding: 12px;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.45);
    }
    .frame-clip {
      overflow: hidden;
      border-radius: 20px;
      background: #000;
    }
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #0a0a0a;
    }
    @media (max-width: 640px) {
      .toolbar { padding: 14px; }
      .title { font-size: 18px; }
      .canvas { padding: 16px; }
      .meta { font-size: 13px; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <header class="toolbar">
      <div class="toolbar-top">
        <div>
          <p class="eyebrow">Preview workspace</p>
          <h1 class="title">${safeTitle}</h1>
        </div>
        <div class="controls">
          <button type="button" class="button button-active" data-viewport="screen">Screen</button>
          <button type="button" class="button" data-viewport="desktop">Desktop</button>
          <button type="button" class="button" data-viewport="tablet">Tablet</button>
          <button type="button" class="button" data-viewport="mobile">Mobile</button>
        </div>
      </div>
      <div class="toolbar-bottom">
        <div class="zoom-controls">
          <button type="button" class="zoom-button" data-zoom-out>-</button>
          <button type="button" class="zoom-button" data-zoom-reset>100%</button>
          <button type="button" class="zoom-button" data-zoom-in>+</button>
        </div>
        <div class="meta" data-meta></div>
      </div>
    </header>

    <main class="canvas">
      <div class="canvas-inner">
        <div class="frame-shell" data-shell>
          <div class="frame-clip" data-clip>
            <div data-scale>
              <iframe title=${JSON.stringify(title)} sandbox="allow-scripts"></iframe>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    const viewportPresets = {
      screen: null,
      desktop: 1440,
      tablet: 834,
      mobile: 390,
    }

    const minZoom = 0.5
    const maxZoom = 2
    const zoomStep = 0.1
    const toolbarHeight = 172
    const shellPadding = 24
    const srcDoc = ${serializedSrcDoc}

    const iframe = document.querySelector('iframe')
    const shell = document.querySelector('[data-shell]')
    const clip = document.querySelector('[data-clip]')
    const scaleLayer = document.querySelector('[data-scale]')
    const meta = document.querySelector('[data-meta]')
    const zoomReset = document.querySelector('[data-zoom-reset]')
    const viewportButtons = Array.from(document.querySelectorAll('[data-viewport]'))

    let viewport = 'screen'
    let zoom = 1

    iframe.srcdoc = srcDoc

    function getFrameWidth() {
      const availableWidth = Math.max(320, window.innerWidth - 72)
      const presetWidth = viewportPresets[viewport]
      return presetWidth === null ? availableWidth : Math.min(presetWidth, availableWidth)
    }

    function getFrameHeight() {
      return Math.max(560, window.innerHeight - toolbarHeight)
    }

    function applyLayout() {
      const frameWidth = getFrameWidth()
      const frameHeight = getFrameHeight()
      const scaledWidth = frameWidth * zoom
      const scaledHeight = frameHeight * zoom

      shell.style.width = (scaledWidth + shellPadding) + 'px'
      shell.style.minWidth = (scaledWidth + shellPadding) + 'px'
      clip.style.width = scaledWidth + 'px'
      clip.style.height = scaledHeight + 'px'
      scaleLayer.style.width = frameWidth + 'px'
      scaleLayer.style.height = frameHeight + 'px'
      scaleLayer.style.transform = 'scale(' + zoom + ')'
      scaleLayer.style.transformOrigin = 'top left'
      iframe.style.width = frameWidth + 'px'
      iframe.style.height = frameHeight + 'px'
      zoomReset.textContent = Math.round(zoom * 100) + '%'
      meta.textContent = 'Viewport ' + frameWidth + 'px wide · canvas zoom ' + Math.round(zoom * 100) + '%'

      viewportButtons.forEach((button) => {
        const isActive = button.getAttribute('data-viewport') === viewport
        button.classList.toggle('button-active', isActive)
      })
    }

    document.querySelector('[data-zoom-out]').addEventListener('click', () => {
      zoom = Math.max(minZoom, Number((zoom - zoomStep).toFixed(2)))
      applyLayout()
    })

    document.querySelector('[data-zoom-in]').addEventListener('click', () => {
      zoom = Math.min(maxZoom, Number((zoom + zoomStep).toFixed(2)))
      applyLayout()
    })

    document.querySelector('[data-zoom-reset]').addEventListener('click', () => {
      zoom = 1
      applyLayout()
    })

    viewportButtons.forEach((button) => {
      button.addEventListener('click', () => {
        viewport = button.getAttribute('data-viewport') || 'desktop'
        applyLayout()
      })
    })

    window.addEventListener('resize', applyLayout)
    applyLayout()
  <\/script>
</body>
</html>`
}
