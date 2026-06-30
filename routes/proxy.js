import express from "express";
import axios from "axios";

const router = express.Router();

router.get('/embed', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("Missing URL");

        // 🔧 Set CORS and frame headers BEFORE fetching
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");

    console.log("🔄 Proxying:", url.substring(0, 80));

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': url.split('/').slice(0, 3).join('/') + '/'
      },
      timeout: 15000
    });

    let html = response.data;

    // Remove any X-Frame-Options headers from the proxied content
    html = html.replace(/<meta[^>]*http-equiv=['"]X-Frame-Options['"][^>]*>/gi, '');
    
    const adBlocker = `
      <meta http-equiv="Content-Security-Policy" content="frame-ancestors *;">
      <style>
        [class*="ad"], [id*="ad"], [class*="popup"], [id*="popup"],
        [class*="overlay"], [class*="modal"], [class*="banner"],
        [onclick*="window.open"], [style*="z-index: 9999"],
        [style*="z-index: 99999"], div[style*="position: fixed"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      </style>
      <script>
        window.open = function() { return null; };
        window.alert = function() {};
        window.confirm = function() { return false; };
        document.addEventListener('click', function(e) {
          if (e.target && e.target.target === '_blank') {
            e.preventDefault();
            e.stopPropagation();
          }
        }, true);
      </script>
    `;

    html = html.replace('</head>', adBlocker + '</head>');
    
    // 🔧 Allow embedding in iframe
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow iframe
    res.setHeader('Content-Security-Policy', "frame-ancestors *;"); // Allow embedding
    res.send(html);
    
  } catch (error) {
    console.error("Proxy error:", error.message);
    res.status(500).send("Failed to load video");
  }
});

export default router;