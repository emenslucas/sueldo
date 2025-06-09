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
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  
  const page = await browser.newPage()
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  )
  
  await page.goto("https://comparatasas.ar/", {
    waitUntil: "networkidle2",
    timeout: 30000,
  })

  // Esperar un poco más para que el contenido se cargue completamente
  await new Promise(resolve => setTimeout(resolve, 2000))

  const items = await page.evaluate(() => {
    const data: {
      nombre: string
      imagen: string
      tasa: string
      tasaNumero: number
      link: string
    }[] = []

    // Selector más específico para la nueva estructura
    const tabPanel = document.querySelector('[role="tabpanel"][data-state="active"]')
    
    if (tabPanel) {
      // Buscar todos los enlaces dentro del panel activo
      const enlaces = tabPanel.querySelectorAll('a[aria-label^="Ver más información sobre"]')
      
      enlaces.forEach((enlace) => {
        try {
          // Extraer el nombre del h3
          const nombreElement = enlace.querySelector('h3')
          const nombre = nombreElement?.textContent?.trim() || ""
          
          // Extraer la imagen
          const imagenElement = enlace.querySelector('img')
          const imagen = imagenElement?.src || ""
          
          // Extraer la tasa - selector más específico para el porcentaje
          const tasaElement = enlace.querySelector('p.text-indigo-600, .text-indigo-600')
          const tasa = tasaElement?.textContent?.trim() || ""
          
          // Extraer el link
          const link = enlace.href || ""
          
          // Procesar la tasa numérica
          const match = tasa.match(/(\d+(?:\.\d+|,\d+)?)/)
          const tasaNumero = match ? parseFloat(match[1].replace(",", ".")) : 0
          
          console.log('Procesando:', { nombre, tasa, tasaNumero, link })
          
          if (
            nombre &&
            tasa &&
            tasaNumero > 0 &&
            !nombre.toLowerCase().includes("cocos daruma")
          ) {
            data.push({ nombre, imagen, tasa, tasaNumero, link })
          }
        } catch (error) {
          console.error('Error procesando elemento:', error)
        }
      })
    } else {
      // Fallback: buscar con el selector original si el nuevo no funciona
      console.log('Usando selector fallback')
      document
        .querySelectorAll("a[aria-label^='Ver más información sobre']")
        .forEach((el) => {
          try {
            const nombre = el.querySelector("h3")?.textContent?.trim().split("\n")[0] || ""
            const imagen = el.querySelector("img")?.src || ""
            const tasa = el.querySelector("p.text-indigo-600, .text-indigo-600")?.textContent?.trim() || ""
            const link = el.href
            const match = tasa.match(/(\d+(?:\.\d+|,\d+)?)/)
            const tasaNumero = match ? parseFloat(match[1].replace(",", ".")) : 0
            
            if (
              nombre &&
              tasa &&
              tasaNumero > 0 &&
              !nombre.toLowerCase().includes("cocos daruma")
            ) {
              data.push({ nombre, imagen, tasa, tasaNumero, link })
            }
          } catch (error) {
            console.error('Error en fallback:', error)
          }
        })
    }
    
    console.log('Datos encontrados:', data.length)
    return data
  })

  await browser.close()

  if (items.length === 0) {
    throw new Error("No se encontraron datos de inversión.")
  }

  // Ordenar por tasa de mayor a menor
  items.sort((a, b) => b.tasaNumero - a.tasaNumero)

  return {
    data: items[0],
    allOptions: items.slice(0, 3),
    timestamp: new Date().toISOString(),
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const forceRefresh = searchParams.get("refresh") === "true"

    // Retornar cache si existe y no se fuerza el refresh
    if (!forceRefresh && cache) {
      return NextResponse.json({
        success: true,
        ...cache,
        cached: true,
      })
    }

    // Hacer scraping
    const scraped = await scrapeData()
    cache = scraped

    return NextResponse.json({
      success: true,
      ...scraped,
      cached: false,
    })
  } catch (error: any) {
    console.error("❌ Error con Puppeteer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Scraping con Puppeteer falló",
        details: error.message,
      },
      { status: 500 }
    )
  }
}