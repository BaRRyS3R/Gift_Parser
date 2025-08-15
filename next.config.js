const WebpackObfuscator = require('webpack-obfuscator');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nextui-org/react"],
  images: {
    remotePatterns: [],
  },
  
  webpack: (config, { isServer, dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname),
    };

    // Только в production для клиента
    if (!dev && !isServer) {
      
      // ЛЕГКАЯ ОБФУСКАЦИЯ - исключаем CSS и другие не-JS файлы
      config.plugins.push(
        new WebpackObfuscator({
          compact: true,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          debugProtection: true,
          debugProtectionInterval: 4000,
          disableConsoleOutput: true,
          domainLock: ['.circusle.xyz', 't.me', 'web.telegram.org'],
          identifierNamesGenerator: 'mangled',
          log: false,
          renameGlobals: false,
          selfDefending: true,
          simplify: true,
          splitStrings: false,
          stringArray: true,
          stringArrayCallsTransform: false,
          stringArrayEncoding: ['none'],
          stringArrayThreshold: 0.5,
        }, [
          // ВАЖНО: Исключаем все кроме JS файлов
          'node_modules/**',
          '**/*.css',
          '**/*.scss',
          '**/*.sass',
          '**/*.less',
          '**/*.json',
          '**/*.svg',
          '**/*.png',
          '**/*.jpg',
          '**/*.jpeg',
          '**/*.gif',
          '**/*.woff',
          '**/*.woff2',
          '**/*.ttf',
          '**/*.eot',
          '**/*.ico',
          '**/*.webp',
        ])
      );

      // Инжектим защиту DevTools через модификацию entry
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        
        // Добавляем наш защитный код в main entry
        if (entries['main.js'] && entries['main.js'].import) {
          entries['main.js'].import.unshift(
            'data:text/javascript,' + encodeURIComponent(`
              (function() {
                if (typeof window !== 'undefined') {
                  // Проверка размера окна
                  setInterval(function() {
                    if (window.outerHeight - window.innerHeight > 160 || 
                        window.outerWidth - window.innerWidth > 160) {
                      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#f00;font-size:24px;">DevTools detected!</div>';
                      setTimeout(function() { window.location.reload(); }, 2000);
                    }
                  }, 1000);
                  
                  // Блокировка клавиш
                  document.addEventListener('keydown', function(e) {
                    if (e.key === 'F12' || 
                        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                        (e.ctrlKey && e.key === 'U')) {
                      e.preventDefault();
                      return false;
                    }
                  });
                  
                  // Блокировка правого клика
                  document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    return false;
                  });
                  
                  // Очистка консоли
                  setInterval(function() {
                    console.clear();
                    console.log('%c⛔ STOP!', 'color:red;font-size:30px;font-weight:bold;');
                  }, 3000);
                }
              })();
            `)
          );
        }
        
        return entries;
      };
    }

    return config;
  },
  
  swcMinify: true,
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;