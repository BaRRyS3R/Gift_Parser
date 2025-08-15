const WebpackObfuscator = require('webpack-obfuscator');
const webpack = require('webpack');

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
      
      // 1. ЛЕГКАЯ ОБФУСКАЦИЯ
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
          'node_modules/**',
        ])
      );

      // 2. ИНЖЕКТИМ КОД БЛОКИРОВКИ DEVTOOLS
      config.plugins.push(
        new webpack.BannerPlugin({
          banner: `
            (function() {
              // Блокировка DevTools
              if (typeof window !== 'undefined') {
                
                // Метод 1: Проверка размера окна
                setInterval(function() {
                  if (window.outerHeight - window.innerHeight > 160 || 
                      window.outerWidth - window.innerWidth > 160) {
                    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#f00;font-size:24px;font-family:monospace;">DevTools запрещены!</div>';
                    setTimeout(function() { window.location.reload(); }, 2000);
                  }
                }, 1000);
                
                // Метод 2: Блокировка клавиш
                document.addEventListener('keydown', function(e) {
                  if (e.key === 'F12' || 
                      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                      (e.ctrlKey && e.key === 'U')) {
                    e.preventDefault();
                    alert('DevTools запрещены!');
                    return false;
                  }
                });
                
                // Метод 3: Блокировка правого клика
                document.addEventListener('contextmenu', function(e) {
                  e.preventDefault();
                  return false;
                });
                
                // Метод 4: Очистка консоли
                setInterval(function() {
                  console.clear();
                  console.log('%c⛔ STOP!', 'color:red;font-size:30px;font-weight:bold;');
                  console.log('%cДевтулзы запрещены!', 'color:red;font-size:16px;');
                }, 3000);
                
                // Метод 5: Детект через debugger
                setInterval(function() {
                  const start = performance.now();
                  debugger;
                  const end = performance.now();
                  if (end - start > 100) {
                    window.location.href = '/';
                  }
                }, 5000);
                
                // Метод 6: Детект через console.log
                const devtools = {open: false, orientation: null};
                const element = new Image();
                Object.defineProperty(element, 'id', {
                  get: function() {
                    devtools.open = true;
                    document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:40vh;">DevTools detected!</h1>';
                    setTimeout(function() { window.location.reload(); }, 1500);
                  }
                });
                setInterval(function() {
                  console.log(element);
                  console.clear();
                }, 1000);
                
                // Метод 7: Блокировка выделения текста
                document.addEventListener('selectstart', function(e) {
                  if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                    e.preventDefault();
                  }
                });
                
              }
            })();
          `,
          raw: true,
          entryOnly: false,
        })
      );

      // 3. ДОПОЛНИТЕЛЬНАЯ МИНИФИКАЦИЯ
      config.optimization = {
        ...config.optimization,
        minimize: true,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
    }

    return config;
  },
  
  swcMinify: true,
  productionBrowserSourceMaps: false,
  
  // Добавляем CSP заголовки для дополнительной защиты
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
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