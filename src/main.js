const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');

let mainWindow;
let browserInstance;
let pageInstance;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

ipcMain.handle('scrape-data', async (event, args) => {
  const { query, consola, orden } = args;
  console.log('🟢 Iniciando scraping...');
  console.log('📌 Consola recibida:', consola);
  console.log('📌 Orden recibido:', orden);
  try {
    if (!browserInstance) {
      console.log('📢 Lanzando navegador Puppeteer...');
      browserInstance = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--ignore-certificate-errors'
        ],
      });
      console.log('✅ Navegador lanzado');
      pageInstance = await browserInstance.newPage();
      console.log('✅ Página inicial lista');
      // Configurar user-agent y encabezados (solo una vez)
      await pageInstance.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await pageInstance.setExtraHTTPHeaders({
        'Accept-Language': 'es-ES,es;q=0.9',
      });
      console.log('✅ User-agent y encabezados configurados');
    } else {
      console.log('🔄 Reutilizando navegador existente');
    }

    // Construcción de la URL base según parámetros
    let url = 'https://www.instant-gaming.com/es/';
    if (query) {
      // Búsqueda general
      url = `https://www.instant-gaming.com/es/busquedas/?q=${encodeURIComponent(query)}&instock=1`;
      console.log('🔵 URL de búsqueda construida:', url);
    } else if (consola && ['pc', 'playstation', 'xbox', 'nintendo'].includes(consola)) {
      // URL base para la plataforma
      url = `https://www.instant-gaming.com/es/${consola}/`;
      if (orden) {
        switch (orden.toLowerCase()) {
          case 'tendencias':
          case 'popularity':
            url += 'tendencias/';
            break;
          case 'mas-vendidos':
          case 'best-selling':
            url += 'mas-vendidos/';
            break;
          case 'reservas':
          case 'release-date':
            url += 'reservas/';
            break;
          case 'tarjetas-regalo':
          case 'gift-cards':
            url += 'tarjetas-regalo/';
            break;
          case 'suscripciones':
          case 'subscriptions':
            url += 'suscripciones/';
            break;
          default:
            console.log('⚠️ No se definió un filtro para:', orden);
            break;
        }
      }
      // Mostrar solo productos en stock
      url += url.includes('?') ? '&instock=1' : '?instock=1';
      console.log('🔵 URL de plataforma construida:', url);
    } else {
      console.log('🔵 URL de página principal:', url);
    }

    // Navegar a la página y esperar carga completa
    await pageInstance.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    console.log('✅ Página cargada:', pageInstance.url());
    await pageInstance.waitForSelector('.item', { timeout: 120000 });
    console.log('✅ Selector ".item" encontrado');

    // Extraer información de los juegos (incluyendo imagen/video si existen)
    const data = await pageInstance.evaluate(() => {
      const items = [];
      document.querySelectorAll('.item').forEach(item => {
        const title = item.querySelector('.name .title')?.innerText || 'Sin título';
        const price = item.querySelector('.price')?.innerText || 'Sin precio';
        const discount = item.querySelector('.discount')?.innerText || 'Sin descuento';
        const link = item.querySelector('a.cover')?.href || 'Sin enlace';
        const imgElem = item.querySelector('img');
        const imgSrcData = imgElem?.getAttribute('data-src') || '';
        let imgSrc = imgSrcData || (imgElem ? imgElem.src : '');
        const videoElem = item.querySelector('video');
        let videoSrc = '';
        if (videoElem) {
          const sourceElem = videoElem.querySelector('source');
          videoSrc = sourceElem ? sourceElem.src : videoElem.src;
        }
        // Convertir URLs relativas a absolutas
        const origin = location.origin;
        if (imgSrc) {
          if (imgSrc.startsWith('//')) {
            imgSrc = location.protocol + imgSrc;
          } else if (imgSrc.startsWith('/')) {
            imgSrc = origin + imgSrc;
          }
        }
        if (videoSrc) {
          if (videoSrc.startsWith('//')) {
            videoSrc = location.protocol + videoSrc;
          } else if (videoSrc.startsWith('/')) {
            videoSrc = origin + videoSrc;
          }
        }
        items.push({ title, price, discount, link, image: imgSrc, video: videoSrc });
      });
      return items;
    });
    console.log(`✅ Datos extraídos: ${data.length} juegos encontrados`);
    return data;
  } catch (error) {
    console.error('🛑 Error durante el scraping:', error);
    // Reiniciar navegador en caso de error para próximos intentos
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
      pageInstance = null;
      console.log('🛑 Navegador cerrado por error');
    }
    throw error;
  }
});

// Cerrar Puppeteer al cerrar la aplicación
app.on('window-all-closed', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
