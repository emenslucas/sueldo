import puppeteer from "puppeteer"
import { NextResponse } from "next/server"

export const config = {
  runtime: "nodejs",
}

// Cache en memoria
let cache: {
  data: any
  timestamp: string
} | null = null

// Función auxiliar para hacer el scraping real
async function scrapeData() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox", 
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu"
    ],
  })

  const page = await browser.newPage()
  
  // Configurar viewport y user agent
  await page.setViewport({ width: 1920, height: 1080 })
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  )

  try {
    console.log("📡 Navegando a la página...")
    await page.goto("https://comparatasas.ar/", {
      waitUntil: "networkidle0",
      timeout: 60000,
    })

    console.log("⏳ Esperando que se cargue el contenido dinámico...")
    
    // Esperar a que aparezcan los elementos específicos y que tengan contenido
    await page.waitForFunction(() => {
      const elements = document.querySelectorAll("a[aria-label^='Ver más información sobre']")
      if (elements.length === 0) return false
      
      // Verificar que al menos uno tenga contenido completo
      for (let el of elements) {
        const nombre = el.querySelector('h3')?.textContent?.trim()
        const tasa = el.querySelector("p.text-indigo-600")?.textContent?.trim()
        if (nombre && tasa && nombre.length > 0) {
          return true
        }
      }
      return false
    }, { 
      timeout: 30000,
      polling: 1000 // Verificar cada segundo
    })

    // Espera adicional para mayor seguridad
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log("🔍 Extrayendo datos...")
    const items = await page.evaluate(() => {
      const data: {
        nombre: string
        imagen: string
        tasa: string
        tasaNumero: number
        link: string
      }[] = []

      // Buscar enlaces con información de inversión
      const enlaces = document.querySelectorAll("a[aria-label^='Ver más información sobre']")
      console.log(`Encontrados ${enlaces.length} enlaces`)

      enlaces.forEach((el, index) => {
        try {
          const nombre = el.querySelector("h3")?.innerText?.trim()?.split("\n")[0] || ""
          const imagen = el.querySelector("img")?.src || ""
          
          // Buscar tasa con múltiples selectores
          const tasaElement = el.querySelector("p.text-indigo-600") || 
                            el.querySelector("p[class*='indigo']") ||
                            el.querySelector("p[class*='text-']") ||
                            el.querySelector("p[class*='rate']") ||
                            el.querySelector(".rate") ||
                            el.querySelector("[class*='percent']")
          
          const tasa = tasaElement?.textContent?.trim() || ""
          const link = (el as HTMLAnchorElement).href || ""

          console.log(`Elemento ${index + 1}:`, { nombre: nombre.substring(0, 50), tasa, link: link.substring(0, 50) })

          // Extraer número de la tasa con múltiples patrones
          let tasaNumero = 0
          const patterns = [
            /(\d+(?:[,\.]\d+)?)\s*%/,  // "5.5%" o "5,5%"
            /(\d+(?:[,\.]\d+)?)/,      // Solo números
            /TNA\s*(\d+(?:[,\.]\d+)?)/i, // "TNA 5.5"
            /(\d+)\s*[,\.]\s*(\d+)/    // "5,5" o "5.5"
          ]

          for (const pattern of patterns) {
            const match = tasa.match(pattern)
            if (match) {
              if (match[2]) {
                // Caso "5,5" -> "5.5"
                tasaNumero = parseFloat(`${match[1]}.${match[2]}`)
              } else {
                tasaNumero = parseFloat(match[1].replace(",", "."))
              }
              break
            }
          }

          // Si no encontramos tasa en el elemento, buscar en el nombre
          if (tasaNumero === 0) {
            const nombreMatch = nombre.match(/(\d+(?:[,\.]\d+)?)\s*%/)
            if (nombreMatch) {
              tasaNumero = parseFloat(nombreMatch[1].replace(",", "."))
            }
          }

          if (
            nombre &&
            tasaNumero > 0 &&
            !nombre.toLowerCase().includes("cocos daruma") &&
            link &&
            tasaNumero < 100 // Filtrar tasas irreales
          ) {
            data.push({ 
              nombre, 
              imagen, 
              tasa: tasa || `${tasaNumero}%`, 
              tasaNumero, 
              link 
            })
          }
        } catch (error) {
          console.error(`Error procesando elemento ${index + 1}:`, error)
        }
      })

      return data
    })

    console.log(`✅ Extraídos ${items.length} elementos válidos`)

    if (items.length === 0) {
      // Debugging más detallado
      console.log("🔄 Realizando debugging detallado...")
      
      const debugInfo = await page.evaluate(() => {
        const info = {
          totalLinks: document.querySelectorAll('a').length,
          linksWithAriaLabel: document.querySelectorAll("a[aria-label^='Ver más información sobre']").length,
          h3Elements: document.querySelectorAll('h3').length,
          indigoElements: document.querySelectorAll("p.text-indigo-600").length,
          pageText: document.body.innerText.substring(0, 500),
          firstFewLinks: [] as string[]
        }

        // Obtener los primeros enlaces para debug
        document.querySelectorAll('a').forEach((link, i) => {
          if (i < 5) {
            info.firstFewLinks.push(link.outerHTML.substring(0, 200))
          }
        })

        return info
      })

      console.log("Debug info:", debugInfo)
      throw new Error(`No se encontraron datos de inversión. Debug: ${JSON.stringify(debugInfo, null, 2)}`)
    }

    // Ordenar por tasa más alta
    items.sort((a, b) => b.tasaNumero - a.tasaNumero)

    console.log(`🎯 Mejor opción: ${items[0].nombre} - ${items[0].tasa}`)

    return {
      data: items[0],
      allOptions: items.slice(0, 3),
      timestamp: new Date().toISOString(),
      totalFound: items.length
    }

  } catch (error) {
    console.error("Error durante el scraping:", error)
    
    // Intentar tomar screenshot para debugging
    try {
      await page.screenshot({ 
        path: 'debug-screenshot.png',
        fullPage: true 
      })
      console.log("📸 Screenshot guardado como debug-screenshot.png")
    } catch (screenshotError) {
      console.log("No se pudo tomar screenshot:", screenshotError)
    }
    
    throw error
  } finally {
    await browser.close()
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const forceRefresh = searchParams.get("refresh") === "true"

    // Verificar cache
    if (!forceRefresh && cache) {
      const cacheAge = Date.now() - new Date(cache.timestamp).getTime()
      const maxAge = 10 * 60 * 1000 // 10 minutos

      if (cacheAge < maxAge) {
        console.log(`📦 Usando cache (${Math.round(cacheAge / 1000)}s de antigüedad)`)
        return NextResponse.json({
          success: true,
          ...cache,
          cached: true,
          cacheAge: Math.round(cacheAge / 1000)
        })
      }
    }

    console.log("🚀 Iniciando scraping...")
    const startTime = Date.now()
    const scraped = await scrapeData()
    const duration = Date.now() - startTime
    
    cache = scraped
    console.log(`✅ Scraping completado en ${duration}ms`)

    return NextResponse.json({
      success: true,
      ...scraped,
      cached: false,
      scrapingDuration: duration
    })

  } catch (error: any) {
    console.error("❌ Error con Puppeteer:", error)
    
    // Retornar datos de cache si están disponibles, aunque sean antiguos
    if (cache) {
      console.log("🔄 Usando cache por error en scraping")
      return NextResponse.json({
        success: true,
        ...cache,
        cached: true,
        warning: "Usando datos en cache debido a error en scraping",
        error: error.message
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Scraping con Puppeteer falló",
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}